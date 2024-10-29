import express from 'express';
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

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

  // Use memory storage instead of disk storage
  const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      // For now, only allow text files to simplify testing
      const allowedTypes = ['text/plain'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only TXT files are allowed.'));
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
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      path: req.file.path
    });
    res.json({
      message: 'File uploaded and processed successfully',
      file: {
        id: req.file.filename,
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file' });
  }
});

router.delete('/files/:fileId', async (req, res) => {
  try {
    if (!ragManager) {
      throw new Error('RAGManager not initialized');
    }

    const fileId = req.params.fileId;
    await ragManager.deleteDocument(fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

export default createRouter;
