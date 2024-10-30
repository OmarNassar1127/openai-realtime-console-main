import WebSocket from 'ws';
import fs from 'fs';

console.log('Starting voice RAG integration test...');

// Create WebSocket connection to relay server
const ws = new WebSocket('ws://localhost:8081');

// Test queries about machine learning
const queries = [
    'What are the key concepts in machine learning?',
    'How does the machine learning process work?',
    'What are some real-world applications of machine learning?'
];

let currentQueryIndex = 0;

// Simulate events
ws.on('open', async () => {
    console.log('Connected to relay server');
    sendNextQuery();
});

function sendNextQuery() {
    if (currentQueryIndex < queries.length) {
        const textInput = {
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{
                    type: 'input_text',
                    text: queries[currentQueryIndex]
                }]
            }
        };

        console.log('\n=== Testing Query ===');
        console.log('Sending text input:', queries[currentQueryIndex]);
        console.log('Full message:', JSON.stringify(textInput, null, 2));
        ws.send(JSON.stringify(textInput));

        // Request response after a short delay
        setTimeout(() => {
            const responseRequest = {
                type: 'response.create'
            };
            console.log('Requesting response...');
            ws.send(JSON.stringify(responseRequest));
        }, 2000);

        currentQueryIndex++;
    } else {
        console.log('\nAll queries tested');
        setTimeout(() => {
            ws.close();
            process.exit(0);
        }, 5000);
    }
}

// Handle server responses
ws.on('message', (data) => {
    const event = JSON.parse(data.toString());
    console.log('Received event:', JSON.stringify(event, null, 2));

    if (event.type === 'response.audio_transcript.done') {
        console.log('\nAI Response:', event.transcript);
        // Send next query after receiving response
        setTimeout(sendNextQuery, 3000);
    } else if (event.type === 'error') {
        console.error('Error:', event.error);
    }
});

// Handle errors
ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

// Handle close
ws.on('close', (code, reason) => {
    console.log(`WebSocket closed. Code: ${code}, Reason: ${reason}`);
});

// Clean up after 60 seconds (allowing time for multiple queries)
setTimeout(() => {
    console.log('Test timeout - closing connection');
    ws.close();
    process.exit(0);
}, 60000);
