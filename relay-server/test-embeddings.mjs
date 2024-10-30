import { OpenAIEmbeddings } from '@langchain/openai';

async function testOpenAIConnection() {
  console.log('Testing OpenAI API connection...');

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: 'sk-proj-l40f6BuDDqKbt6sdS0dKT3BlbkFJC3zfguOoKKuH65fS07K6',
    modelName: 'text-embedding-ada-002'
  });

  try {
    console.log('Attempting to generate a single embedding...');
    const result = await embeddings.embedQuery('Hello, world!');
    console.log('Successfully generated embedding!');
    console.log('Embedding vector length:', result.length);
    return true;
  } catch (error) {
    console.error('Error connecting to OpenAI:', error.message);
    return false;
  }
}

console.log('Starting OpenAI connection test...');
testOpenAIConnection().then(success => {
  if (success) {
    console.log('Test completed successfully!');
  } else {
    console.log('Test failed!');
  }
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
