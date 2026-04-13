const { v4: uuidv4 } = require('uuid');

// Simple in-memory vector store with cosine similarity
class VectorStore {
  constructor() {
    this.documents = new Map(); // id -> { id, content, embedding, metadata }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Add a document to the store
  addDocument(content, embedding, metadata = {}) {
    const id = uuidv4();
    this.documents.set(id, {
      id,
      content,
      embedding,
      metadata,
      timestamp: new Date().toISOString()
    });
    return id;
  }

  // Search for similar documents
  search(queryEmbedding, topK = 3, minScore = 0.5) {
    const results = [];

    for (const [id, doc] of this.documents) {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      if (similarity >= minScore) {
        results.push({
          id: doc.id,
          content: doc.content,
          similarity,
          metadata: doc.metadata
        });
      }
    }

    // Sort by similarity (descending) and return top K
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  // Get document by ID
  getDocument(id) {
    return this.documents.get(id);
  }

  // Delete document by ID
  deleteDocument(id) {
    return this.documents.delete(id);
  }

  // List all documents
  listDocuments() {
    return Array.from(this.documents.values()).map(doc => ({
      id: doc.id,
      content: doc.content.substring(0, 100) + '...',
      metadata: doc.metadata,
      timestamp: doc.timestamp
    }));
  }

  // Clear all documents
  clear() {
    this.documents.clear();
  }

  // Get document count
  count() {
    return this.documents.size;
  }
}

// Export singleton instance
const vectorStore = new VectorStore();
module.exports = vectorStore;
