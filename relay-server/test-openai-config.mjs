import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

async function testOpenAIConfig() {
    console.log('Starting OpenAI configuration test...');
    console.log('API Key (first 10 chars):', apiKey?.slice(0, 10));

    // Test different model configurations
    const configs = [
        {
            name: 'Default Config',
            config: {
                apiKey,
                endpoint: 'wss://api.openai.com/v1/realtime',
                queryParams: { model: 'gpt-4o-realtime-preview-2024-10-01' },
                headers: { 'OpenAI-Beta': 'realtime=v1' }
            }
        },
        {
            name: 'Alternative Config',
            config: {
                apiKey,
                endpoint: 'wss://api.openai.com/v1/realtime',
                queryParams: {
                    model: 'gpt-4o-realtime-preview-2024-10-01',
                    stream: true
                },
                headers: {
                    'OpenAI-Beta': 'realtime=v1',
                    'Content-Type': 'application/json'
                }
            }
        }
    ];

    for (const { name, config } of configs) {
        console.log(`\nTesting ${name}...`);
        const client = new RealtimeClient(config);

        // Set up event handlers
        client.realtime.on('server.*', (event) => {
            console.log(`[${name}] Received from OpenAI: ${event.type}`);
            console.log('Event data:', JSON.stringify(event, null, 2));
        });

        client.realtime.on('error', (error) => {
            console.error(`[${name}] OpenAI error:`, error);
        });

        client.realtime.on('close', () => {
            console.log(`[${name}] OpenAI connection closed`);
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
                        text: 'Hi! This is a test message. Please respond with a simple greeting.'
                    }]
                }
            };

            console.log('Sending test message...');
            client.realtime.send(testEvent.type, testEvent);

            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 15000));

            console.log('Closing connection...');
            await client.disconnect();
        } catch (error) {
            console.error(`[${name}] Error during test:`, error);
        }
    }
}

testOpenAIConfig().catch(console.error);
