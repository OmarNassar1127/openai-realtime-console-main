import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
  console.log('Connected to relay server');

  // Send a test query
  const message = {
    type: 'input_text',
    text: 'What are the specific benefits of using RAG systems according to our knowledge base?'
  };

  console.log('Sending message:', message);
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received message:', message);
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the connection alive for responses
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 10000);
