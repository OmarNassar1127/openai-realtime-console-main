import { OpenAIEmbeddings } from '@langchain/openai';
import { promises as fs } from 'fs';
import path from 'path';

export class SimpleRAGManager {
  constructor(openAIApiKey) {
    this.openAIApiKey = openAIApiKey;
    console.log('Initializing OpenAI embeddings with model: text-embedding-ada-002');
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.openAIApiKey,
      modelName: 'text-embedding-ada-002',
    });
    this.documents = new Map(); // Store documents in memory
    this.uploadsDir = './uploads';
    this.ensureUploadsDirectory();
  }

  async ensureUploadsDirectory() {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }
  }

  async processDocument(file) {
    console.log('Starting document processing...');
    if (file.mimetype !== 'text/plain') {
      console.warn('Only text files are currently supported');
      return;
    }

    const text = file.buffer.toString('utf-8');
    console.log(`Text extracted, length: ${text.length} characters`);

    try {
      console.log('Generating embedding...');
      const embedding = await this.embeddings.embedQuery(text);
      console.log('Successfully generated embedding, length:', embedding.length);

      this.documents.set(file.filename, {
        text,
        embedding,
      });

      // Save file to disk for persistence
      await fs.writeFile(file.path, file.buffer);
      console.log(`File saved to disk: ${file.path}`);

      return true;
    } catch (error) {
      console.error('Error during embedding generation:', error.message);
      throw error;
    }
  }

  async queryContext(query, topK = 1) {
    try {
      console.log('Generating embedding for query:', query);
      const queryEmbedding = await this.embeddings.embedQuery(query);
      console.log('Successfully generated query embedding');

      const results = [];
      for (const [filename, doc] of this.documents.entries()) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        results.push({ filename, text: doc.text, score: similarity });
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('Error querying context:', error);
      return [];
    }
  }

  async deleteDocument(filename) {
    try {
      this.documents.delete(filename);
      await fs.unlink(path.join(this.uploadsDir, filename));
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  }
}
