import { SimpleRAGManager } from './lib/rag/simple_manager.mjs';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

async function testRAG() {
  console.log("Creating RAG manager...");
  const ragManager = new SimpleRAGManager(apiKey);

  // Wait a moment for test document to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));

  const testQuery = "What are the key concepts in machine learning?";
  console.log(`\nTesting query: "${testQuery}"`);

  const context = await ragManager.queryContext(testQuery);
  console.log("\nRetrieved context:");
  console.log(JSON.stringify(context, null, 2));

  // Test another query
  const testQuery2 = "Tell me about neural networks";
  console.log(`\nTesting second query: "${testQuery2}"`);

  const context2 = await ragManager.queryContext(testQuery2);
  console.log("\nRetrieved context:");
  console.log(JSON.stringify(context2, null, 2));
}

console.log("Starting RAG test...\n");
testRAG().catch(console.error);
