require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('Testing Embedding Models...\n');

async function listEmbeddingModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available embedding models:');
      data.models.forEach(model => {
        if (model.supportedGenerationMethods && model.supportedGenerationMethods.includes('embedContent')) {
          console.log(`  - ${model.name.replace('models/', '')}`);
        }
      });
      
      const embeddingModels = data.models.filter(m => 
        m.supportedGenerationMethods && m.supportedGenerationMethods.includes('embedContent')
      );
      
      if (embeddingModels.length > 0) {
        return embeddingModels[0].name.replace('models/', '');
      }
    }
    return null;
  } catch (error) {
    console.log('Failed to list models:', error.message);
    return null;
  }
}

async function testEmbedding(modelName) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    
    const text = 'JavaScript is a programming language commonly used for web development.';
    console.log(`\nGenerating embedding with model: ${modelName}`);
    console.log('Text:', text);
    
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    
    console.log('\n✅ SUCCESS!');
    console.log('Embedding dimension:', embedding.length);
    console.log('First 5 values:', embedding.slice(0, 5));
  } catch (error) {
    console.log('\n❌ FAILED!');
    console.log('Error:', error.message);
  }
}

async function main() {
  const modelName = await listEmbeddingModels();
  
  if (modelName) {
    await testEmbedding(modelName);
  } else {
    console.log('\n❌ No embedding models found');
  }
}

main();
