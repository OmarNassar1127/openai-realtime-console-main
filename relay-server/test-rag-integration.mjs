import { SimpleRAGManager } from './lib/rag/simple_manager.mjs';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

async function testRAGIntegration() {
  console.log("Creating RAG manager...");
  const ragManager = new SimpleRAGManager(apiKey);

  // Wait for test document to be processed
  await new Promise(resolve => setTimeout(resolve, 2000));

  const testQuery = "What are the key concepts in machine learning?";
  console.log(`\nTesting query: "${testQuery}"`);

  const context = await ragManager.queryContext(testQuery);
  console.log("\nRetrieved context:");
  console.log(JSON.stringify(context, null, 2));

  // Simulate message processing
  const systemMessage = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'system',
      content: [{
        type: 'input_text',
        text: `Use this context to inform your responses: ${context[0].text}`
      }]
    }
  };

  const userMessage = {
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{
        type: 'input_text',
        text: testQuery
      }]
    }
  };

  console.log("\nSimulated system message:");
  console.log(JSON.stringify(systemMessage, null, 2));

  console.log("\nSimulated user message:");
  console.log(JSON.stringify(userMessage, null, 2));

  console.log("\nThis test verifies that the RAG context is being retrieved and formatted correctly for OpenAI messages.");
}

console.log("Starting RAG integration test...\n");
testRAGIntegration().catch(console.error);
