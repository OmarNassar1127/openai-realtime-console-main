import { OpenAIEmbeddings } from '@langchain/openai';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

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

    // No need for PDF.js initialization anymore
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
    console.log('Starting document processing...', {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.buffer.length
    });

    if (!file.buffer) {
      const error = new Error('File buffer is missing');
      console.error('Document processing error:', error);
      throw error;
    }

    let text;
    try {
      switch (file.mimetype) {
        case 'text/plain':
          text = file.buffer.toString('utf-8');
          console.log(`Text file extracted, length: ${text.length} characters`);
          break;
        case 'application/pdf':
          try {
            // Basic PDF text extraction - look for text-like content
            const content = file.buffer.toString('utf-8');
            // Extract text-like content between PDF markers
            const textContent = content.replace(/[\x00-\x1F\x7F-\xFF]/g, ' ')
                                     .replace(/\s+/g, ' ')
                                     .trim();
            text = textContent || 'No readable text content found in PDF';
            console.log(`PDF text extracted, length: ${text.length} characters`);
          } catch (pdfError) {
            console.error('Error processing PDF:', pdfError);
            throw new Error(`Failed to process PDF: ${pdfError.message}`);
          }
          break;
        default:
          throw new Error('Unsupported file type. Only TXT and PDF files are allowed.');
      }

      console.log('Generating embedding...');
      const embedding = await this.embeddings.embedQuery(text);
      console.log('Successfully generated embedding, length:', embedding.length);

      this.documents.set(file.filename, {
        text,
        embedding,
      });

      console.log(`Document processed and stored in memory: ${file.filename}`);

      return true;
    } catch (error) {
      console.error('Error during document processing:', {
        error: error.message,
        stack: error.stack,
        filename: file.filename,
        mimetype: file.mimetype
      });
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  async queryContext(query, topK = 1, similarityThreshold = 0.1) {
    try {
      console.log('Generating embedding for query:', query);
      const queryEmbedding = await this.embeddings.embedQuery(query);
      console.log('Successfully generated query embedding');

      const results = [];
      const totalDocuments = this.documents.size;
      console.log(`Searching through ${totalDocuments} documents for relevant context...`);

      for (const [filename, doc] of this.documents.entries()) {
        const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
        console.log(`Similarity score for ${filename}: ${similarity.toFixed(4)}`);
        if (similarity >= similarityThreshold) {
          results.push({ filename, text: doc.text, score: similarity });
          console.log(`Added context from ${filename} (score: ${similarity.toFixed(4)}):`);
          console.log('Context preview:', doc.text.substring(0, 150) + '...');
        }
      }

      const sortedResults = results
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      console.log(`Found ${sortedResults.length} relevant context items above threshold ${similarityThreshold}`);
      return sortedResults;
    } catch (error) {
      console.error('Error querying context:', error);
      return [];
    }
  }

  async deleteDocument(filename) {
    try {
      this.documents.delete(filename);
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
