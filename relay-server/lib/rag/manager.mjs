import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { promises as fs } from 'fs';
import path from 'path';

export class RAGManager {
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

  async initialize() {
    // Load any existing documents from the uploads directory
    try {
      const files = await fs.readdir(this.uploadsDir);
      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && path.extname(file).toLowerCase() === '.txt') {
          const fileData = await fs.readFile(filePath);
          await this.processDocument({
            buffer: fileData,
            filename: file,
            mimetype: 'text/plain',
            path: filePath
          });
        }
      }
    } catch (error) {
      console.error('Error loading existing documents:', error);
    }
  }

  // Simple text splitting function
  splitText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let index = 0;

    while (index < text.length) {
      // Calculate the end of this chunk
      let chunkEnd = Math.min(index + chunkSize, text.length);

      // If this isn't the end of the text, try to break at a period or space
      if (chunkEnd < text.length) {
        const lastPeriod = text.lastIndexOf('.', chunkEnd);
        const lastSpace = text.lastIndexOf(' ', chunkEnd);

        if (lastPeriod > index && lastPeriod > chunkEnd - 100) {
          chunkEnd = lastPeriod + 1;
        } else if (lastSpace > index) {
          chunkEnd = lastSpace + 1;
        }
      }

      chunks.push(new Document({
        pageContent: text.slice(index, chunkEnd).trim(),
        metadata: {}
      }));

      // Move the index, accounting for overlap
      index = chunkEnd - overlap;
    }

    return chunks;
  }

  async processDocument(file) {
    console.log('Starting document processing...');
    let text;
    // Only process text files
    if (file.mimetype !== 'text/plain') {
      console.warn('Only text files are currently supported');
      text = '';
    } else {
      text = file.buffer.toString('utf-8');
      console.log(`Text extracted, length: ${text.length} characters`);
    }

    // Create chunks using our simple splitter
    console.log('Splitting text into chunks...');
    const chunks = this.splitText(text);
    console.log(`Text split into ${chunks.length} chunks`);

    // Add source metadata to each chunk
    chunks.forEach(chunk => {
      chunk.metadata.source = file.filename;
    });

    // Generate embeddings for chunks with timeout
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    try {
      console.log('Starting embeddings generation...');
      const embeddings = [];

      // Process chunks sequentially
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
        try {
          const embedding = await Promise.race([
            this.embeddings.embedQuery(chunks[i].pageContent),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Embedding generation timed out')), 30000))
          ]);
          console.log(`Successfully generated embedding for chunk ${i + 1}`);
          embeddings.push(embedding);
        } catch (error) {
          console.error(`Error processing chunk ${i + 1}:`, error.message);
          throw error;
        }
      }

      console.log(`Successfully generated ${embeddings.length} embeddings`);

      // Store chunks with their embeddings in memory
      this.documents.set(file.filename, {
        chunks,
        embeddings,
      });

      // Save file to disk for persistence
      if (file.buffer) {
        await fs.writeFile(file.path, file.buffer);
        console.log(`File saved to disk: ${file.path}`);
      }

      return chunks.length;
    } catch (error) {
      console.error('Error during embedding generation:', error.message);
      throw error;
    }
  }

  async queryContext(query, topK = 3) {
    try {
      // Generate embedding for the query
      console.log('Generating embedding for query:', query);
      const queryEmbedding = await Promise.race([
        this.embeddings.embedQuery(query),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query embedding generation timed out')), 30000))
      ]);
      console.log('Successfully generated query embedding');

      // Collect all chunks and their embeddings
      const allChunks = [];
      const allEmbeddings = [];

      for (const doc of this.documents.values()) {
        allChunks.push(...doc.chunks);
        allEmbeddings.push(...doc.embeddings);
      }

      // Calculate cosine similarity and sort results
      const similarities = allEmbeddings.map((embedding, i) => ({
        similarity: this.cosineSimilarity(queryEmbedding, embedding),
        chunk: allChunks[i],
      }));

      const results = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      return results.map(result => ({
        text: result.chunk.pageContent,
        source: result.chunk.metadata.source,
        score: result.similarity,
      }));
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

  // Helper function to calculate cosine similarity
  cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
  }
}
