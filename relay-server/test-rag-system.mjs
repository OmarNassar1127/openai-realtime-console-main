import { RAGManager } from './lib/rag/manager.mjs';
import { promises as fs } from 'fs';
import path from 'path';

const API_KEY = 'sk-proj-l40f6BuDDqKbt6sdS0dKT3BlbkFJC3zfguOoKKuH65fS07K6';

async function testEmbeddings() {
  try {
    console.log('Initializing RAG manager...');
    const manager = new RAGManager(API_KEY);

    // Create a very small test content first
    const testContent = 'This is a simple test about AI. It helps verify our RAG system works.';
    console.log('\nTest content:', testContent);

    // Create test file
    const filename = 'test.txt';
    const filePath = path.join('./uploads', filename);
    await fs.writeFile(filePath, testContent);
    console.log('\nCreated test file:', filePath);

    // Process the document
    const file = {
      buffer: Buffer.from(testContent),
      filename,
      mimetype: 'text/plain',
      path: filePath
    };

    console.log('\nProcessing document...');
    try {
      const numChunks = await manager.processDocument(file);
      console.log(`Document processed into ${numChunks} chunks`);

      // Test a simple query
      console.log('\nTesting query...');
      const results = await manager.queryContext('What is this test about?', 1);
      console.log('\nQuery results:', JSON.stringify(results, null, 2));

      // Clean up
      console.log('\nCleaning up...');
      await manager.deleteDocument(filename);
      console.log('Test completed successfully');
    } catch (error) {
      console.error('Error during document processing:', error);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

console.log('Starting embeddings test...');
testEmbeddings();
