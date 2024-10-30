import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { SimpleRAGManager } from './rag/simple_manager.mjs';

class RealtimeRelay {
  constructor(apiKey, app) {
    this.apiKey = apiKey;
    this.app = app;
    this.sockets = new WeakMap();
    this.wss = null;
    this.ragManager = new SimpleRAGManager(apiKey);
    this.responseTimeoutMs = 30000; // 30 second timeout for responses
  }

  // No initialization needed for SimpleRAGManager

  listen(port) {
    if (this.app) {
      this.wss = new WebSocketServer({ server: this.app.listen(port) });
    } else {
      this.wss = new WebSocketServer({ port });
    }
    this.wss.on('connection', this.connectionHandler.bind(this));
    this.log(`Listening on ws://localhost:${port}`);
  }

  async connectionHandler(ws, req) {
    if (!req.url) {
      this.log('No URL provided, closing connection.');
      ws.close();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== '/') {
      this.log(`Invalid pathname: "${pathname}"`);
      ws.close();
      return;
    }

    // Instantiate new client
    this.log(`Connecting with key "${this.apiKey.slice(0, 3)}..."`);
    const client = new RealtimeClient({
      apiKey: this.apiKey,
      endpoint: 'wss://api.openai.com/v1/realtime',
      queryParams: { model: 'gpt-4o-realtime-preview-2024-10-01' },
      headers: { 'OpenAI-Beta': 'realtime=v1' }
    });

    let hasReceivedResponse = false;
    let responseTimeout = null;

    // Connect to OpenAI Realtime API
    try {
      await client.connect();
      this.log('Connected to OpenAI Realtime API');
    } catch (error) {
      this.log(`Failed to connect to OpenAI: ${error.message}`);
      ws.send(JSON.stringify({
        type: 'error',
        error: { message: 'Failed to connect to OpenAI', code: 'connection_failed' }
      }));
      ws.close();
      return;
    }

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.on('message', (event) => {
      this.log(`Received from OpenAI: ${event.type}`);
      console.log('OpenAI event:', JSON.stringify(event, null, 2));

      // Track if we've received an actual response
      if (event.type === 'conversation.item.created' &&
          event.item?.role === 'assistant') {
        hasReceivedResponse = true;
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          responseTimeout = null;
        }
      }

      ws.send(JSON.stringify(event));
    });

    client.on('error', (error) => {
      console.error('OpenAI error:', error);
      this.log(`OpenAI error: ${error.message}`);

      // Check for specific error types
      if (error.message?.includes('authentication')) {
        this.log('Authentication error - check API key permissions');
      } else if (error.message?.includes('permission')) {
        this.log('Permission denied - verify API key has access to required features');
      }

      ws.send(JSON.stringify({
        type: 'error',
        error: {
          message: error.message,
          code: error.code || 'unknown'
        }
      }));
    });

    client.on('close', () => {
      this.log('OpenAI connection closed');
      if (responseTimeout) {
        clearTimeout(responseTimeout);
      }
      ws.close();
    });

    // Relay: Browser Event -> OpenAI Realtime API Event
    // We need to queue data waiting for the OpenAI connection
    const messageQueue = [];
    const messageHandler = async (data) => {
      try {
        const event = JSON.parse(data);
        console.log(`Received event from client:`, JSON.stringify(event, null, 2));

        // Reset response tracking for new messages
        hasReceivedResponse = false;
        if (responseTimeout) {
          clearTimeout(responseTimeout);
        }

        // If this is a text input, convert it to conversation.item.create
        if (event.type === 'input_text' && event.text) {
          const context = await this.ragManager.queryContext(event.text);
          console.log(`RAG context:`, context);

          if (context && context.length > 0) {
            const contextText = context.map(result =>
              `${result.text}`
            ).join('\n');

            console.log(`Sending system message with context`);
            // Send system message with context first
            const systemMessage = {
              type: 'text',
              text: `You are a helpful AI assistant with access to specific knowledge. When responding:
1. Always reference the provided context in your answers
2. Use direct quotes when citing specific information
3. Indicate clearly which parts of the context you're drawing from
4. If the context doesn't contain relevant information, say so

Here is your reference context:\n\n${contextText}`
            };

            client.sendSystemMessage([systemMessage]);
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Then send the user's query
            client.sendUserMessage([{
              type: 'text',
              text: event.text
            }]);
          } else {
            // If no context, just send the user message
            client.sendUserMessage([{
              type: 'text',
              text: event.text
            }]);
          }

          // Set timeout for response
          responseTimeout = setTimeout(() => {
            if (!hasReceivedResponse) {
              this.log('No response received from OpenAI within timeout period');
              ws.send(JSON.stringify({
                type: 'error',
                error: {
                  message: 'No response received from OpenAI within timeout period',
                  code: 'timeout'
                }
              }));
            }
          }, this.responseTimeoutMs);

        } else {
          // For non-text events, send directly to OpenAI
          console.log(`Sending event to OpenAI:`, JSON.stringify(event, null, 2));
          client.send(event.type, event);
        }
      } catch (e) {
        console.error(`Error processing message:`, e);
        this.log(`Error parsing event from client: ${data}`);
        ws.send(JSON.stringify({
          type: 'error',
          error: {
            message: `Error processing message: ${e.message}`,
            code: 'processing_error'
          }
        }));
      }
    };

    ws.on('message', (data) => {
      if (!client.isConnected()) {
        messageQueue.push(data);
      } else {
        messageHandler(data);
      }
    });

    ws.on('close', () => {
      if (responseTimeout) {
        clearTimeout(responseTimeout);
      }
      client.disconnect();
    });

    // Connect to OpenAI Realtime API
    try {
      this.log(`Connecting to OpenAI...`);
      await client.connect();
    } catch (e) {
      this.log(`Error connecting to OpenAI: ${e.message}`);
      ws.send(JSON.stringify({
        type: 'error',
        error: {
          message: `Failed to connect to OpenAI: ${e.message}`,
          code: 'connection_error'
        }
      }));
      ws.close();
      return;
    }
    this.log(`Connected to OpenAI successfully!`);
    while (messageQueue.length) {
      await messageHandler(messageQueue.shift());
    }
  }

  log(...args) {
    console.log(`[RealtimeRelay]`, ...args);
  }
}

export { RealtimeRelay };
