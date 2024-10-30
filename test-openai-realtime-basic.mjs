import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenAIRealtime() {
  console.log('Starting basic OpenAI Realtime API test...');

  const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  ws.on('open', () => {
    console.log('WebSocket connected');

    const systemMessage = {
      type: 'conversation.item.create',
      item: {
        role: 'system',
        content: [{
          type: 'input_text',
          text: 'You are a helpful assistant.'
        }]
      }
    };
    console.log('Sending system message...');
    ws.send(JSON.stringify(systemMessage));

    const userMessage = {
      type: 'conversation.item.create',
      item: {
        role: 'user',
        content: [{
          type: 'input_text',
          text: 'Hello, what is 2+2?'
        }]
      }
    };
    console.log('Sending user message...');
    ws.send(JSON.stringify(userMessage));

    const createResponse = {
      type: 'response.create'
    };
    console.log('Requesting response...');
    ws.send(JSON.stringify(createResponse));
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('Received event:', response.type);

      if (response.type === 'response.text.delta' && response.delta?.text) {
        process.stdout.write(response.delta.text);
      } else if (response.type === 'response.done') {
        console.log('\nResponse completed');
        ws.close();
        process.exit(0);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
  });

  setTimeout(() => {
    console.error('Test timed out after 30 seconds');
    ws.close();
    process.exit(1);
  }, 30000);
}

testOpenAIRealtime().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
