import { WebSocketServer } from 'ws';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { RAGManager } from './rag/manager.js';

export class RealtimeRelay {
  constructor(apiKey, app) {
    this.apiKey = apiKey;
    this.app = app;
    this.sockets = new WeakMap();
    this.wss = null;
    this.ragManager = new RAGManager(apiKey);
  }

  async initialize() {
    await this.ragManager.initialize();
  }

  listen(port) {
    if (this.app) {
      this.wss = new WebSocketServer({ server: this.app.listen(port) });
    } else {
      this.wss = new WebSocketServer({ port });
    }
    this.wss.on('connection', this.connectionHandler.bind(this));
    this.initialize().catch(console.error);
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
    const client = new RealtimeClient({ apiKey: this.apiKey });

    // Relay: OpenAI Realtime API Event -> Browser Event
    client.realtime.on('server.*', (event) => {
      this.log(`Relaying "${event.type}" to Client`);
      ws.send(JSON.stringify(event));
    });
    client.realtime.on('close', () => ws.close());

    // Relay: Browser Event -> OpenAI Realtime API Event
    // We need to queue data waiting for the OpenAI connection
    const messageQueue = [];
    const messageHandler = async (data) => {
      try {
        const event = JSON.parse(data);
        this.log(`Relaying "${event.type}" to OpenAI`);

        // If this is a text input, enhance it with RAG context
        if (event.type === 'input_text' && event.text) {
          const context = await this.ragManager.queryContext(event.text);
          if (context && context.length > 0) {
            const contextText = context.map(doc =>
              `[From ${doc.source}]: ${doc.text}`
            ).join('\n\n');

            event.text = `Context:\n${contextText}\n\nUser Query: ${event.text}\n\nPlease use the context provided above to help answer the query. Include citations when using information from the context.`;
          }
        }

        client.realtime.send(event.type, event);
      } catch (e) {
        console.error(e.message);
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
