import dotenv from 'dotenv';
import { RealtimeRelay } from './lib/relay.mjs';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { SimpleRAGManager } from './lib/rag/simple_manager.mjs';
import { promises as fs } from 'fs';

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

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  },
});

// Initialize RAG manager
const ragManager = new SimpleRAGManager(OPENAI_API_KEY);

// File upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await ragManager.processDocument({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      path: `./uploads/${req.file.originalname}`
    });

    res.json({
      message: 'File uploaded successfully',
      filename: req.file.originalname
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// File deletion endpoint
app.delete('/api/files/:filename', async (req, res) => {
  try {
    await ragManager.deleteDocument(req.params.filename);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create and initialize relay
const relay = new RealtimeRelay(OPENAI_API_KEY, app, ragManager);
relay.listen(PORT);

console.log(`Relay server listening on port ${PORT}`);
