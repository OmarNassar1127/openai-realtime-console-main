import dotenv from 'dotenv';
import { RealtimeRelay } from './lib/relay.mjs';
import express from 'express';
import cors from 'cors';
import { SimpleRAGManager } from './lib/rag/simple_manager.mjs';
import { createRouter } from './routes/files.mjs';

// Load environment variables before any other imports
dotenv.config({ override: true });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error(
    `Environment variable "OPENAI_API_KEY" is required.\n` +
    `Please set it in your .env file.`
  );
  process.exit(1);
}

const PORT = parseInt(process.env.PORT) || 8081;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Create and use the files router with the RAG manager
const filesRouter = createRouter(OPENAI_API_KEY);
app.use('/api', filesRouter);

// Create and initialize relay with the RAG manager from the router
const relay = new RealtimeRelay(OPENAI_API_KEY, app);
relay.listen(PORT);

console.log(`Relay server listening on port ${PORT}`);
