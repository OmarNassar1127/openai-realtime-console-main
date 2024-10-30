import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { SimpleRAGManager } from '../lib/rag/simple_manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create router factory function that accepts apiKey
const createRouter = (apiKey) => {
  const router = express.Router();

  // Enable CORS for all routes
  router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

  // Use memory storage instead of disk storage
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      // For now, only allow text files to simplify testing
      const allowedTypes = ['text/plain', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only TXT and PDF files are allowed.'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  // Initialize RAGManager with proper error handling
  let ragManager;
  try {
    ragManager = new SimpleRAGManager(apiKey);
  } catch (error) {
    console.error('Error creating RAGManager:', error);
  }

  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!ragManager) {
        throw new Error('RAGManager not initialized');
      }

      await ragManager.processDocument({
        buffer: req.file.buffer,
        filename: req.file.originalname, // Use originalname instead of filename
        mimetype: req.file.mimetype,
      });

      res.json({
        message: 'File uploaded and processed successfully',
        file: {
          id: req.file.originalname,
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ error: error.message || 'Error processing file' });
    }
  });

  router.delete('/files/:filename', async (req, res) => {
    try {
      if (!ragManager) {
        throw new Error('RAGManager not initialized');
      }

      const filename = req.params.filename;
      await ragManager.deleteDocument(filename);

      res.json({ message: 'File deleted successfully' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: error.message || 'Error deleting file' });
    }
  });

  return router;
};

export { createRouter };
