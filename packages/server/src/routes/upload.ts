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

// Allowed file extensions and their corresponding MIME types
const ALLOWED_EXTENSIONS = [
  'pdf', 'txt', 'csv', 'json', 'js', 'ts', 'py', 'sol',
  'png', 'jpg', 'jpeg', 'webp', 'gif'
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'text/javascript',
  'application/javascript',
  'text/typescript',
  'text/x-python',
  'application/x-python-code',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function sanitizeFileName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
}

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

    // Validate MIME type if provided
    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({ error: `Unsupported MIME type: ${mimeType}` });
    }

    // Decode base64 and check size before writing
    const buffer = Buffer.from(fileData, 'base64');
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }

    // Sanitize filename to prevent path traversal
    const safeName = sanitizeFileName(fileName);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(os.tmpdir(), 'fundtracer-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFileName = `${randomUUID()}-${safeName}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    fs.writeFileSync(tempFilePath, buffer);

    // Upload to Gemini File API
    const uploadedFile = await uploadFileToGemini(tempFilePath, safeName);

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
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export const uploadRoutes = router;