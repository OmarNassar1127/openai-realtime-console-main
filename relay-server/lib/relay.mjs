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

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.realtime.on('server.*', (event) => {
      this.log(`Received from OpenAI: ${event.type}`);
      console.log('OpenAI event:', JSON.stringify(event, null, 2));
      ws.send(JSON.stringify(event));
    });
    client.realtime.on('error', (error) => {
      console.error('OpenAI error:', error);
      this.log(`OpenAI error: ${error.message}`);
    });
    client.realtime.on('close', () => {
      this.log('OpenAI connection closed');
      ws.close();
    });

    // Relay: Browser Event -> OpenAI Realtime API Event
    // We need to queue data waiting for the OpenAI connection
    const messageQueue = [];
    const messageHandler = async (data) => {
      try {
        const event = JSON.parse(data);
        console.log(`Received event from client:`, JSON.stringify(event, null, 2));

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
            const systemEvent = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'system',
                content: [{
                  type: 'input_text',
                  text: `You are a helpful AI assistant. Use this context to inform your responses, and cite sources when appropriate:\n\n${contextText}`
                }]
              }
            };
            console.log(`System event:`, JSON.stringify(systemEvent, null, 2));
            await new Promise((resolve) => {
              client.realtime.send(systemEvent.type, systemEvent);
              setTimeout(resolve, 1000); // Wait for system message to be processed
            });

            // Then send the user's query
            const userEvent = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{
                  type: 'input_text',
                  text: event.text
                }]
              }
            };
            console.log(`Sending user event:`, JSON.stringify(userEvent, null, 2));
            client.realtime.send(userEvent.type, userEvent);
          } else {
            // If no context, just send the user message
            const userEvent = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{
                  type: 'input_text',
                  text: event.text
                }]
              }
            };
            console.log(`Sending user event:`, JSON.stringify(userEvent, null, 2));
            client.realtime.send(userEvent.type, userEvent);
          }
        } else {
          // For non-text events, send directly to OpenAI
          console.log(`Sending event to OpenAI:`, JSON.stringify(event, null, 2));
          client.realtime.send(event.type, event);
        }
      } catch (e) {
        console.error(`Error processing message:`, e);
        this.log(`Error parsing event from client: ${data}`);
      }
    };
    ws.on('message', (data) => {
      if (!client.isConnected()) {
        messageQueue.push(data);
      } else {
        messageHandler(data);
      }
    });
    ws.on('close', () => client.disconnect());

    // Connect to OpenAI Realtime API
    try {
      this.log(`Connecting to OpenAI...`);
      await client.connect();
    } catch (e) {
      this.log(`Error connecting to OpenAI: ${e.message}`);
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
