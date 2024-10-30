import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAIBasic() {
  try {
    console.log('Starting basic OpenAI API test...');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello, what is 2+2?" }
      ],
    });

    console.log('API Response:', completion.choices[0].message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

testOpenAIBasic();
