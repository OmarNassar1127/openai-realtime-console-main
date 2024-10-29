const { PineconeClient } = require('@pinecone-database/pinecone');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PDFLoader } = require('@langchain/community/src/document_loaders/fs/pdf');
const { TextLoader } = require('@langchain/community/src/document_loaders/fs/text');
const { RecursiveCharacterTextSplitter } = require('@langchain/core/text_splitter');
const { PineconeStore } = require('@langchain/pinecone');
const fs = require('fs').promises;

class RAGManager {
  constructor(openAIApiKey) {
    this.openAIApiKey = openAIApiKey;
    this.pinecone = new PineconeClient();
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: this.openAIApiKey,
    });
    this.vectorStore = null;
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
    if (!process.env.PINECONE_API_KEY || !process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_INDEX) {
      throw new Error('Missing required Pinecone environment variables');
    }

    await this.pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });

    const index = this.pinecone.Index(process.env.PINECONE_INDEX);
    this.vectorStore = await PineconeStore.fromExistingIndex(
      this.embeddings,
      { pineconeIndex: index }
    );
  }

  async processDocument(file) {
    let loader;
    if (file.mimetype === 'application/pdf') {
      loader = new PDFLoader(file.path);
    } else {
      loader = new TextLoader(file.path);
    }

    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments(docs);

    // Add metadata to chunks
    chunks.forEach(chunk => {
      chunk.metadata = {
        ...chunk.metadata,
        source: file.filename,
      };
    });

    // Store document chunks in vector store
    await this.vectorStore.addDocuments(chunks);

    return chunks.length;
  }

  async queryContext(query, topK = 3) {
    try {
      const results = await this.vectorStore.similaritySearch(query, topK);
      return results.map(doc => ({
        text: doc.pageContent,
        source: doc.metadata.source,
        score: doc.metadata.score,
      }));
    } catch (error) {
      console.error('Error querying context:', error);
      return [];
    }
  }

  async deleteDocument(filename) {
    try {
      await this.vectorStore.delete({
        filter: {
          source: filename,
        },
      });
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
}

module.exports = RAGManager;
