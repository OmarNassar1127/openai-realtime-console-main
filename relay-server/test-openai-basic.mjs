import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

async function testOpenAIConnection() {
    console.log('Starting OpenAI connection test...');

    const client = new RealtimeClient({
        apiKey,
        endpoint: 'wss://api.openai.com/v1/realtime',
        queryParams: { model: 'gpt-4o-realtime-preview-2024-10-01' },
        headers: { 'OpenAI-Beta': 'realtime=v1' }
    });

    // Set up event handlers
    client.realtime.on('server.*', (event) => {
        console.log(`Received from OpenAI: ${event.type}`);
        console.log('Event data:', JSON.stringify(event, null, 2));
    });

    client.realtime.on('error', (error) => {
        console.error('OpenAI error:', error);
    });

    client.realtime.on('close', () => {
        console.log('OpenAI connection closed');
    });

    try {
        console.log('Connecting to OpenAI...');
        await client.connect();
        console.log('Connected successfully!');

        // Send a simple test message
        const testEvent = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: 'Hello, this is a test message. Please respond with a simple greeting.'
                }]
            }
        };

        console.log('Sending test message...');
        client.realtime.send(testEvent.type, testEvent);

        // Keep the connection open for responses
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log('Test completed, closing connection...');
        await client.disconnect();
    } catch (error) {
        console.error('Error during test:', error);
    }
}

testOpenAIConnection().catch(console.error);
