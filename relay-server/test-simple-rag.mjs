import { SimpleRAGManager } from './lib/rag/simple_manager.mjs';

const API_KEY = 'sk-proj-l40f6BuDDqKbt6sdS0dKT3BlbkFJC3zfguOoKKuH65fS07K6';

async function testSimpleRAG() {
  console.log('Starting simple RAG test...');

  try {
    const manager = new SimpleRAGManager(API_KEY);

    // Test document
    const testContent = `
    Artificial Intelligence (AI) is transforming how we live and work.
    Machine learning, a subset of AI, enables computers to learn from data.
    Natural Language Processing helps computers understand human language.
    `;

    // Create test file
    const testFile = {
      buffer: Buffer.from(testContent),
      filename: 'ai_overview.txt',
      mimetype: 'text/plain',
      path: './uploads/ai_overview.txt'
    };

    // Process document
    console.log('\nProcessing test document...');
    await manager.processDocument(testFile);

    // Test queries
    console.log('\nTesting queries...');
    const queries = [
      'What is AI?',
      'What is machine learning?',
      'How does NLP help?'
    ];

    for (const query of queries) {
      console.log(`\nQuery: ${query}`);
      const results = await manager.queryContext(query);
      console.log('Results:', JSON.stringify(results, null, 2));
    }

    // Cleanup
    await manager.deleteDocument('ai_overview.txt');
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimpleRAG();
