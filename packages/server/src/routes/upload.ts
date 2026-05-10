// ============================================================
// File Upload Route - Uploads files to Gemini File API
// ============================================================

import { Router } from 'express';
import { uploadFileToGemini } from '../lib/gemini-client.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

const router = Router();

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  'pdf', 'txt', 'csv', 'json', 'js', 'ts', 'py', 'sol',
  'png', 'jpg', 'jpeg', 'webp', 'gif'
];

// POST /api/upload/file - accepts base64 encoded file
router.post('/file', async (req, res) => {
  try {
    const { fileData, fileName, mimeType } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing fileData or fileName' });
    }

    // Validate file extension
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ 
        error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
      });
    }

    // Create temp directory if it doesn't exist
    const tempDir = path.join(os.tmpdir(), 'fundtracer-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Decode base64 and save to temp
    const tempFileName = `${randomUUID()}-${fileName}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    const buffer = Buffer.from(fileData, 'base64');
    fs.writeFileSync(tempFilePath, buffer);

    // Upload to Gemini File API
    const uploadedFile = await uploadFileToGemini(tempFilePath, fileName);

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    res.json({
      success: true,
      file: {
        fileUri: uploadedFile.fileUri,
        mimeType: uploadedFile.mimeType,
        displayName: uploadedFile.displayName,
        extractedText: uploadedFile.extractedText,
      },
    });
  } catch (error: any) {
    console.error('[Upload] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload file' 
    });
  }
});

export const uploadRoutes = router;