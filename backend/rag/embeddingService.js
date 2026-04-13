const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate embedding for text using Gemini
async function generateEmbedding(text) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Generate embeddings for multiple texts
async function generateBatchEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);
  }
  return embeddings;
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings
};
