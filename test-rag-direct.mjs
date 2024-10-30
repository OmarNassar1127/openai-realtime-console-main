import { SimpleRAGManager } from './relay-server/lib/rag/simple_manager.mjs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testRAG() {
  console.log('Starting RAG test...');
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

  console.log('Processing document...');
  await ragManager.processDocument(testFile);

  // Test context retrieval
  const queries = [
    "What is the capital of France?",
    "How tall is the Eiffel Tower?",
    "What famous painting is in the Louvre?"
  ];

  for (const query of queries) {
    console.log('\nTesting query:', query);
    const context = await ragManager.queryContext(query);
    console.log('Retrieved context:', JSON.stringify(context, null, 2));

    // Test AI response
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant. Use the following context to answer the user's question.
                  If the information is found in the context, cite it in your response.
                  Context: ${context.map(c => c.text).join(' ')}`
      },
      { role: 'user', content: query }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
    });

    console.log('AI Response:', completion.choices[0].message.content);
  }
}

console.log('Starting test...');
testRAG().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
