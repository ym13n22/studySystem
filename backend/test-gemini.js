require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('Testing Gemini API...');
console.log('API Key:', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log('\nAvailable models:');
      data.models.forEach(model => {
        console.log(`  - ${model.name}`);
        if (model.supportedGenerationMethods) {
          console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
        }
      });
      return data.models;
    } else {
      console.log('No models found or error:', data);
      return [];
    }
  } catch (error) {
    console.log('Failed to list models:', error.message);
    return [];
  }
}

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // First, list available models
    const models = await listModels();
    
    if (models.length > 0) {
      // Try the first available model that supports generateContent
      for (const model of models) {
        if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('generateContent')) {
          const modelName = model.name.replace('models/', '');
          try {
            console.log(`\nTrying model: ${modelName}...`);
            const geminiModel = genAI.getGenerativeModel({ model: modelName });
            const result = await geminiModel.generateContent('Hello, respond with "API working"');
            const response = await result.response;
            const text = response.text();

            console.log('\n✅ SUCCESS!');
            console.log('Model:', modelName);
            console.log('Response:', text);
            return;
          } catch (modelError) {
            console.log(`❌ ${modelName} failed:`, modelError.message);
          }
        }
      }
    }
    
    console.log('\n❌ All models failed');
  } catch (error) {
    console.log('\n❌ FAILED!');
    console.log('Error:', error.message);
  }
}

testGemini();
