const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const RAGManager = require('../lib/rag/manager');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and TXT files are allowed.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Initialize RAGManager with proper error handling
let ragManager;
try {
  ragManager = new RAGManager(process.env.OPENAI_API_KEY);
  ragManager.initialize().catch(error => {
    console.error('Failed to initialize RAGManager:', error);
  });
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

    await ragManager.processDocument(req.file);
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
    const filePath = path.join(__dirname, '../uploads', fileId);

    await ragManager.deleteDocument(fileId);
    await fs.unlink(filePath);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Error deleting file' });
  }
});

module.exports = router;
