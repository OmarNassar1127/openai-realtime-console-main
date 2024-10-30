import { OpenAIEmbeddings } from '@langchain/openai';
import { promises as fs } from 'fs';
import { RAGManager } from './lib/rag/manager.mjs';

const API_KEY = 'sk-proj-l40f6BuDDqKbt6sdS0dKT3BlbkFJC3zfguOoKKuH65fS07K6';

async function testRAG() {
  console.log('Starting focused RAG test...');

  try {
    // First test direct embeddings like in our minimal test
    console.log('\nTesting direct embeddings...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: API_KEY,
      modelName: 'text-embedding-ada-002',
    });

    const testText = 'This is a simple test about AI.';
    console.log('Generating embedding for:', testText);
    const embedding = await embeddings.embedQuery(testText);
    console.log('Successfully generated embedding, length:', embedding.length);

    // Now test RAG manager with same configuration
    console.log('\nTesting RAG manager...');
    const manager = new RAGManager(API_KEY);

    // Create test file
    const testFile = {
      buffer: Buffer.from(testText),
      filename: 'test.txt',
      mimetype: 'text/plain',
      path: './uploads/test.txt'
    };

    // Process document
    console.log('Processing test document...');
    await manager.processDocument(testFile);

    // Test query
    console.log('\nTesting query...');
    const query = 'What is this text about?';
    const results = await manager.queryContext(query);
    console.log('Query results:', results);

    // Cleanup
    await manager.deleteDocument('test.txt');
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRAG();
