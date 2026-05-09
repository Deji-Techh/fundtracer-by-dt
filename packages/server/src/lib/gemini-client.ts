// ============================================================
// Gemini Client - AI Model Routing
// Handles calls to Google Gemini API with model selection
// ============================================================

import { geminiClassifier, type ClassificationResult } from './classifier.js';
import fs from 'fs';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type ModelType = 'flash' | 'pro';

interface GeminiMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    message: string;
    code?: number;
  };
}

export interface UploadedFile {
  fileUri: string;
  mimeType: string;
  displayName: string;
}

// Supported MIME types for Gemini
const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'pdf': 'application/pdf',
  'txt': 'text/plain',
  'csv': 'text/csv',
  'json': 'application/json',
  'js': 'text/javascript',
  'ts': 'text/typescript',
  'py': 'text/x-python',
  'sol': 'text/x-solidity',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
  'gif': 'image/gif',
  'mp3': 'audio/mpeg',
  'mp4': 'video/mp4',
  'wav': 'audio/wav',
};

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_MIME_TYPES[ext] || 'application/octet-stream';
}

// Upload file to Gemini File API
export async function uploadFileToGemini(
  filePath: string,
  displayName: string
): Promise<UploadedFile> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const mimeType = getMimeType(displayName);
  const fileSize = fs.statSync(filePath).size;

  // Step 1: Initiate upload
  const initiateUrl = `${GEMINI_BASE_URL}/files?uploadType=resumable&key=${GEMINI_API_KEY}`;
  
  const initiateResponse = await fetch(initiateUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': fileSize.toString(),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: JSON.stringify({
      file: {
        display_name: displayName,
      },
    }),
  });

  if (!initiateResponse.ok) {
    const error = await initiateResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to initiate file upload');
  }

  const uploadUrl = initiateResponse.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) {
    throw new Error('No upload URL returned from Gemini');
  }

  // Step 2: Upload file content
  const fileContent = fs.readFileSync(filePath);
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileContent,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to upload file to Gemini');
  }

  const uploadData = await uploadResponse.json();
  
  // Extract file URI from response
  const fileUri = uploadData.file?.uri;
  if (!fileUri) {
    throw new Error('No file URI returned from Gemini');
  }

  return {
    fileUri,
    mimeType,
    displayName,
  };
}

const SYSTEM_PROMPT = `You are FundTracer AI, an expert blockchain forensics analyst embedded inside FundTracer (fundtracer.xyz).

You have been given the full on-chain analysis of a wallet or contract address. Answer the user's questions based ONLY on this analysed data. Do not make up transactions, addresses, or values not present in the data.

When explaining risk, be specific — cite the actual patterns found (e.g. "14 same-block transactions detected", "funded from Binance hot wallet", "3 wallets share identical funding source").

Format your responses cleanly:
- Use bullet points for lists of findings
- Use bold for key terms and values
- Lead with a one-sentence direct answer, then expand
- Keep responses concise but complete
- If the data does not contain enough information to answer, say so clearly

You also know everything about FundTracer's features: wallet analysis, contract analytics, sybil detection, wallet comparison, funding trees, risk scoring, Telegram bot (@fundtracer_bot), CLI (npm install -g fundtracer), Chrome extension, and pricing (Free / Pro $15 / Max $25).`;

// Helper to get the appropriate model based on question complexity
export async function selectModel(question: string): Promise<ModelType> {
  try {
    const result = await geminiClassifier(question);
    console.log(`[GeminiClient] Question classified as: ${result.category}`);
    return result.category === 'complex' ? 'pro' : 'flash';
  } catch (error) {
    console.error('[GeminiClient] Classifier error, defaulting to flash:', error);
    return 'flash'; // Default to flash for safety
  }
}

// Get model name based on type
function getModelName(type: ModelType): string {
  return type === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.0-flash';
}

// Call Gemini API with streaming
export async function* callGeminiStream(
  context: string,
  userQuestion: string,
  history: GeminiMessage[] = [],
  modelType: ModelType = 'flash',
  attachedFiles?: UploadedFile[]
): AsyncGenerator<string, void, unknown> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const modelName = getModelName(modelType);

  // Build message parts - include file URIs if attached
  const userParts: any[] = [];
  
  // Add context if present
  if (context) {
    userParts.push({ text: `Context:\n${context}\n\n` });
  }

  // Add file attachments
  if (attachedFiles && attachedFiles.length > 0) {
    for (const file of attachedFiles) {
      userParts.push({
        fileData: {
          mimeType: file.mimeType,
          fileUri: file.fileUri,
        },
      });
    }
  }

  // Add the question
  userParts.push({ text: `Question: ${userQuestion}` });

  // Build conversation messages
  const messages: GeminiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10), // Max 10 previous messages
    { role: 'user', content: '' } // Content will be in parts
  ];

  // For streaming, we use the chat/completions endpoint with streaming
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const body: any = {
    contents: messages.map((msg, idx) => {
      if (idx === messages.length - 1) {
        // Last message is current user message with file attachments
        return {
          role: 'user',
          parts: userParts,
        };
      }
      return {
        role: msg.role === 'system' ? 'user' : msg.role,
        parts: [{ text: msg.content }],
      };
    }),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.95,
      topK: 40
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (text) {
    // Yield characters for streaming effect
    for (const char of text) {
      yield char;
      // Small delay for smoother streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } else {
    yield 'No response generated';
  }
}

// Non-streaming version for classifier
export async function callGemini(
  prompt: string,
  modelType: ModelType = 'flash'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const modelName = getModelName(modelType);
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 100
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
  }

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(data.error.message);
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}