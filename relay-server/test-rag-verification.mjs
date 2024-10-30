import WebSocket from 'ws';
import fs from 'fs/promises';

const ws = new WebSocket('ws://localhost:8081');

// Test queries that should match our test document
const testQueries = [
    "What are the main benefits of RAG systems?",
    "How does RAG handle document processing?",
    "How does RAG improve voice-based AI interactions?"
];

let currentQueryIndex = 0;

ws.on('open', async () => {
    console.log('Connected to relay server');
    sendNextQuery();
});

function sendNextQuery() {
    if (currentQueryIndex < testQueries.length) {
        const query = testQueries[currentQueryIndex];
        console.log('\n=== Sending Test Query ===');
        console.log('Query:', query);

        const testQuery = {
            type: 'input_text',
            text: query
        };

        ws.send(JSON.stringify(testQuery));
        currentQueryIndex++;
    } else {
        console.log('\nAll test queries completed');
        setTimeout(() => {
            ws.close();
            process.exit(0);
        }, 5000);
    }
}

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
                    // Send next query after receiving response
                    setTimeout(sendNextQuery, 2000);
                }
            });
        }
    }
});

ws.on('error', (error) => {
    console.error('\nWebSocket error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT - closing connection');
    ws.close();
    process.exit(0);
});
