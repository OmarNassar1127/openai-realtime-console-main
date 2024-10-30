import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

// Track if we've received a response
let receivedResponse = false;

ws.on('open', () => {
  console.log('Connected to relay server');

  // Send a test query
  const message = {
    type: 'input_text',
    text: 'What are the specific benefits of using RAG systems according to our knowledge base? Please cite the specific benefits mentioned in our documents.'
  };

  console.log('Sending message:', message);
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Received message:', JSON.stringify(message, null, 2));

  // Check if we received an AI response
  if (message.type === 'text' ||
      (message.type === 'conversation.item.created' &&
       message.item?.role === 'assistant')) {
    receivedResponse = true;
    console.log('Received AI response:', message);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the connection alive longer for responses
setTimeout(() => {
  if (!receivedResponse) {
    console.log('No AI response received within timeout');
  }
  ws.close();
  process.exit(0);
}, 30000); // Wait 30 seconds for response
