import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

const queries = [
    'What are the key concepts in machine learning?',
    'Can you explain how the machine learning process works?',
    'What are some applications of machine learning in the real world?'
];

let currentQueryIndex = 0;

ws.on('open', () => {
    console.log('Connected to relay server');
    sendNextQuery();
});

ws.on('message', (data) => {
    const event = JSON.parse(data);
    if (event.type === 'response.audio_transcript.delta') {
        process.stdout.write(event.delta);
    }
    if (event.type === 'response.audio_transcript.complete') {
        console.log('\n---Response Complete---\n');
        setTimeout(sendNextQuery, 1000);
    }
});

ws.on('error', console.error);
ws.on('close', () => console.log('Connection closed'));

function sendNextQuery() {
    if (currentQueryIndex < queries.length) {
        const query = queries[currentQueryIndex];
        console.log(`\nSending query: ${query}\n`);

        const textInput = {
            type: 'input_text',
            text: query
        };

        ws.send(JSON.stringify(textInput));
        currentQueryIndex++;
    } else {
        console.log('All queries completed');
        ws.close();
        process.exit(0);
    }
}
