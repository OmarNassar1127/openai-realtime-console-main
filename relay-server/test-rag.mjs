import { RAGManager } from './lib/rag/manager.mjs';
import { promises as fs } from 'fs';
import path from 'path';

async function testRAG() {
  const apiKey = 'sk-proj-l40f6BuDDqKbt6sdS0dKT3BlbkFJC3zfguOoKKuH65fS07K6';
  const ragManager = new RAGManager(apiKey);

  // Test content that will help verify text splitting and context retrieval
  const testContent = `
    This is a test document about artificial intelligence and knowledge management.
    Text splitting is an important part of processing documents for RAG systems.
    When splitting text, we want to maintain context and readability.
    The chunks should break at natural boundaries like periods.
    This helps ensure that the retrieved context makes sense.
    Artificial intelligence systems can use these text chunks to provide relevant information.
    The RAG system combines retrieval and generation for better responses.
  `.trim();

  try {
    // Ensure uploads directory exists
    await ragManager.ensureUploadsDirectory();

    // Create test file
    const filename = 'test.txt';
    const filepath = path.join('./uploads', filename);
    await fs.writeFile(filepath, testContent);

    // Process the document
    const result = await ragManager.processDocument({
      buffer: Buffer.from(testContent),
      filename: filename,
      mimetype: 'text/plain',
      path: filepath
    });

    console.log('Document processed, chunks created:', result);

    // Test queries
    const queries = [
      'How should text be split in the system?',
      'What is mentioned about artificial intelligence?',
      'What is the purpose of RAG systems?'
    ];

    for (const query of queries) {
      const context = await ragManager.queryContext(query);
      console.log('\nQuery:', query);
      console.log('Results:', JSON.stringify(context, null, 2));
    }

    // Test deletion
    const deleteResult = await ragManager.deleteDocument(filename);
    console.log('\nDocument deletion result:', deleteResult);

  } catch (error) {
    console.error('Error during RAG testing:', error);
  }
}

testRAG().catch(console.error);
