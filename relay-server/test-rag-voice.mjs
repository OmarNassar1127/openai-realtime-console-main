import WebSocket from 'ws';
import fs from 'fs/promises';

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', async () => {
    console.log('Connected to relay server');

    // Test RAG functionality with a specific query about RAG benefits
    const testQuery = {
        type: 'input_text',
        text: 'What are the key benefits of RAG systems and how do they enhance accuracy?'
    };

    console.log('Sending test query:', testQuery);
    ws.send(JSON.stringify(testQuery));
});

ws.on('message', (data) => {
    const event = JSON.parse(data);
    console.log('\n=== Received Event ===');
    console.log('Event Type:', event.type);

    if (event.type === 'conversation.item.created') {
        console.log('Item Role:', event.item?.role);
        if (event.item?.role === 'assistant' && event.item?.content) {
            console.log('\n=== AI Response ===');
            event.item.content.forEach(content => {
                if (content.type === 'text') {
                    console.log('\nResponse Text:');
                    console.log(content.text);
                }
            });
            console.log('\n===================');
        }
    }
});

ws.on('error', (error) => {
    console.error('\nWebSocket error:', error);
});

// Set a timeout to close the connection after 2 minutes
setTimeout(() => {
    console.log('\nTest complete - closing connection');
    ws.close();
    process.exit(0);
}, 120000);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT - closing connection');
    ws.close();
    process.exit(0);
});
