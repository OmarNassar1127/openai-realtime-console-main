import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

const client = new RealtimeClient({
  apiKey: apiKey,
  endpoint: 'wss://api.openai.com/v1/realtime',
  queryParams: { model: 'gpt-4o-realtime-preview-2024-10-01' },
  headers: { 'OpenAI-Beta': 'realtime=v1' }
});

client.realtime.on('server.*', (event) => {
  console.log('Received event:', event);
});

client.realtime.on('error', (error) => {
  console.error('Error:', error);
});

async function main() {
  try {
    console.log('Connecting to OpenAI...');
    await client.connect();
    console.log('Connected successfully!');

    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'text',
          text: 'Hello, OpenAI!'
        }]
      }
    };

    console.log('Sending message:', message);
    client.realtime.send(message.type, message);

    // Keep the connection open for a while to receive responses
    await new Promise(resolve => setTimeout(resolve, 10000));
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    client.disconnect();
  }
}

main();
