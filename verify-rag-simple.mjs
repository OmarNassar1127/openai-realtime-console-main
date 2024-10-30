import WebSocket from 'ws';
import { SimpleRAGManager } from './relay-server/lib/rag/simple_manager.mjs';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

async function verifyRAG() {
  console.log('Starting simple RAG verification...');

  // Initialize RAG
  const ragManager = new SimpleRAGManager(process.env.OPENAI_API_KEY);

  // Load test document
  const testContent = await fs.readFile('test_verification.txt', 'utf-8');
  const testFile = {
    filename: 'test_verification.txt',
    mimetype: 'text/plain',
    buffer: Buffer.from(testContent, 'utf-8')
  };

  await ragManager.processDocument(testFile);

  // Connect to OpenAI's Realtime API
  const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });

  ws.on('open', async () => {
    console.log('WebSocket connected');

    // Single test query
    const query = "What is in the Louvre Museum?";
    console.log('\n=== Testing query:', query, '===');

    // Get context from RAG
    const context = await ragManager.queryContext(query);
    console.log('Context similarity score:', context[0]?.score);
    console.log('Using context:', context.map(c => c.text).join(' '));

    // Add system message first
    const systemMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'system',
        content: [{
          type: 'text',
          text: `You are a helpful assistant. When answering questions, use ONLY the information from the provided context and cite your sources. Context: "${context.map(c => c.text).join(' ')}"`
        }]
      }
    };
    console.log('Sending system message...');
    ws.send(JSON.stringify(systemMessage));

    // Add user query
    const userMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'text',
          text: query
        }]
      }
    };
    console.log('Sending user message...');
    ws.send(JSON.stringify(userMessage));

    // Request response
    const createResponse = {
      type: 'response.create'
    };
    console.log('Requesting response...');
    ws.send(JSON.stringify(createResponse));
  });

  let fullResponse = '';

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('Event:', response.type);

      if (response.type === 'response.text.delta' && response.delta?.text) {
        process.stdout.write(response.delta.text);
        fullResponse += response.delta.text;
      } else if (response.type === 'error') {
        console.error('\nError from API:', JSON.stringify(response, null, 2));
      } else if (response.type === 'response.done') {
        console.log('\n=== Response completed ===');
        console.log('Final response:', fullResponse);
        console.log('Response includes context citation:',
          fullResponse.toLowerCase().includes('mona lisa'));
        console.log('Response length:', fullResponse.length);
        console.log('Context was used:',
          fullResponse.toLowerCase().includes('louvre') &&
          fullResponse.toLowerCase().includes('mona lisa'));
        console.log('======================\n');
        ws.close();
        process.exit(0);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      console.error('Raw message:', data.toString());
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    process.exit(1);
  });

  // Add timeout
  setTimeout(() => {
    console.error('Test timed out after 30 seconds');
    ws.close();
    process.exit(1);
  }, 30000);
}

verifyRAG().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
