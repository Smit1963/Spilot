import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();  // Load .env file

const apiKey = process.env.API_KEY;  // Read API key

if (!apiKey) {
  console.error('❌ API key not found!');
  process.exit(1);
}

async function askQuestion(question: string) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'; // Groq's chat completion endpoint
  const body = JSON.stringify({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",  // Replace with the correct model name
    messages: [
      { role: "user", content: question }
    ],
    temperature: 0.7,
    max_tokens: 100
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body
  });

  const rawText = await response.text();
  console.log('🌐 Raw response from Groq:', rawText);

  if (!response.ok) {
    console.error('❌ Failed to communicate with Groq API');
  } else {
    let data;
    try {
      data = JSON.parse(rawText);
      console.log('Response:', data.choices?.[0]?.message?.content);
    } catch (error) {
      console.error('❌ Failed to parse the response:', error);
    }
  }
}

askQuestion('What is the capital of France?');
