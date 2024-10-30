import { RealtimeClient } from '@openai/realtime-api-beta';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

async function testOpenAIResponse() {
    console.log('Starting OpenAI response test...');

    let receivedResponse = false;
    let messageComplete = false;

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

        if (event.type === 'conversation.item.created' && event.item?.role === 'assistant') {
            receivedResponse = true;
            if (event.item?.status === 'completed') {
                messageComplete = true;
            }
        }
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
                    text: 'Hello! Please respond with a simple greeting and confirm you can hear me.'
                }]
            }
        };

        console.log('Sending test message...');
        client.realtime.send(testEvent.type, testEvent);

        // Wait for response with timeout
        let attempts = 0;
        while (!messageComplete && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            if (attempts % 5 === 0) {
                console.log(`Waiting for response... (${attempts}s)`);
            }
        }

        if (!receivedResponse) {
            console.log('No response received from AI within timeout period.');
        } else if (!messageComplete) {
            console.log('Response started but not completed within timeout period.');
        } else {
            console.log('Test completed successfully with AI response!');
        }

        console.log('Closing connection...');
        await client.disconnect();
    } catch (error) {
        console.error('Error during test:', error);
    }
}

testOpenAIResponse().catch(console.error);
