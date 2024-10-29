import { RealtimeRelay } from './lib/relay.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import filesRouter from './routes/files.js';

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

// Initialize RAG routes
app.use('/api', filesRouter);

// Create and initialize relay
const relay = new RealtimeRelay(OPENAI_API_KEY, app);
relay.listen(PORT);

console.log(`Relay server listening on port ${PORT}`);
