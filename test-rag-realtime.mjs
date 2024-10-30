import WebSocket from 'ws';
import { SimpleRAGManager } from './relay-server/lib/rag/simple_manager.mjs';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

async function testRealtimeRAG() {
  console.log('Starting Realtime RAG test...');

  // Initialize RAG
  const ragManager = new SimpleRAGManager(process.env.OPENAI_API_KEY);

  // Load test document
  console.log('Loading test document...');
  const testContent = await fs.readFile('test_verification.txt', 'utf-8');
  const fileBuffer = Buffer.from(testContent, 'utf-8');

  const testFile = {
    filename: 'test_verification.txt',
    mimetype: 'text/plain',
    buffer: fileBuffer
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

    // Test query
    const query = "What is in the Louvre Museum?";
    console.log('Testing query:', query);

    // Get context from RAG
    const context = await ragManager.queryContext(query);
    console.log('Retrieved context:', JSON.stringify(context, null, 2));

    // Add system message with context
    const systemMessage = {
      type: 'conversation.item.create',
      conversation_item: {
        role: 'system',
        content: `You are a helpful assistant. Use the following context to answer questions: ${context.map(c => c.text).join(' ')}`
      }
    };

    ws.send(JSON.stringify(systemMessage));

    // Add user query
    const userMessage = {
      type: 'conversation.item.create',
      conversation_item: {
        role: 'user',
        content: query
      }
    };

    ws.send(JSON.stringify(userMessage));

    // Request response
    const createResponse = {
      type: 'response.create',
      response_format: { type: 'text' }
    };

    ws.send(JSON.stringify(createResponse));
  });

  ws.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('Received:', response);

    if (response.type === 'response.chunk' && response.delta?.content) {
      process.stdout.write(response.delta.content);
    }

    if (response.type === 'response.end') {
      console.log('\nResponse completed');
      ws.close();
      process.exit(0);
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

console.log('Starting test...');
testRealtimeRAG().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
