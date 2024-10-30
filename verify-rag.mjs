import WebSocket from 'ws';
import { SimpleRAGManager } from './relay-server/lib/rag/simple_manager.mjs';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

async function verifyRAG() {
  console.log('Starting RAG verification...');

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

  let messageCount = 0;
  const startTime = Date.now();
  let currentResponse = '';

  ws.on('open', async () => {
    console.log('WebSocket connected');

    // Test queries to verify RAG and performance
    const queries = [
      "What is in the Louvre Museum?",
      "How tall is the Eiffel Tower?",
      "What is the capital of France?"
    ];

    for (const query of queries) {
      console.log('\n=== Testing query:', query, '===');

      // Get context from RAG
      const context = await ragManager.queryContext(query);
      console.log('Context similarity score:', context[0]?.score);
      console.log('Using context:', context.map(c => c.text).join(' '));

      // Add system message with context
      const systemMessage = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'system',
          content: [{
            type: 'input_text',
            text: `You are a helpful assistant. When answering questions, use ONLY the following context and cite your sources: ${context.map(c => c.text).join(' ')}`
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
            type: 'input_text',
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
      messageCount++;
      currentResponse = '';

      // Wait between queries
      await new Promise(resolve => setTimeout(resolve, 8000));
    }
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data.toString());
      console.log('Raw response:', data.toString());

      if (response.type === 'response.content_part.added' && response.content) {
        process.stdout.write(response.content);
        currentResponse += response.content;
      } else if (response.type === 'response.done') {
        messageCount--;
        console.log('\n=== Response completed ===');
        console.log('Full response:', currentResponse);
        console.log('Response length:', currentResponse.length);
        console.log('Time elapsed:', (Date.now() - startTime) / 1000, 'seconds');
        console.log('======================\n');

        if (messageCount === 0) {
          console.log('All tests completed');
          ws.close();
          process.exit(0);
        }
      } else if (response.type === 'error') {
        console.error('Error from API:', response.error);
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
    console.error('Test timed out after 60 seconds');
    ws.close();
    process.exit(1);
  }, 60000);
}

verifyRAG().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});
