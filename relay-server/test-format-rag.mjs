import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8081');

ws.on('open', () => {
  console.log('Connected to relay server');

  // Send a test message with the correct format
  const message = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: 'What are the key concepts in machine learning?'
      }]
    }
  };

  console.log('Sending message:', JSON.stringify(message, null, 2));
  ws.send(JSON.stringify(message));
});

ws.on('message', (data) => {
  try {
    const event = JSON.parse(data);
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Check for assistant's response
    if (event.type === 'conversation.item.created' && event.item.role === 'assistant') {
      console.log('\nAssistant Response:');
      event.item.content.forEach(content => {
        if (content.type === 'text' || content.type === 'input_text') {
          console.log(content.text);
        }
      });
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Keep the connection open longer for responses
setTimeout(() => {
  console.log('Closing connection...');
  ws.close();
  process.exit(0);
}, 60000); // Wait 60 seconds for response

console.log('Test script running. Waiting for responses...');
