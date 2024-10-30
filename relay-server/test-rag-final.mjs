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

  // Log all message types for debugging
  console.log('Received message type:', message.type);

  if (message.type === 'text') {
    console.log('AI Response Text:', message.text);
    receivedResponse = true;
  } else if (message.type === 'conversation.item.created' &&
             message.item?.role === 'assistant' &&
             message.item?.content?.[0]?.type === 'text') {
    console.log('AI Response in Conversation:', message.item.content[0].text);
    receivedResponse = true;
  } else if (message.type === 'error') {
    console.error('Error from server:', message);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the connection alive longer for responses
const timeout = 45000; // 45 seconds
console.log(`Waiting ${timeout/1000} seconds for response...`);
setTimeout(() => {
  if (!receivedResponse) {
    console.log('No AI response received within timeout');
  }
  ws.close();
  process.exit(0);
}, timeout);

// Log when connection closes
ws.on('close', () => {
  console.log('WebSocket connection closed');
});
