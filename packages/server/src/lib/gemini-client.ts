// ============================================================
// Groq Client - AI Model Routing
// Handles calls to Groq API with smart model selection
// ============================================================

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;

export type ModelType = 'flash' | 'pro';

interface GroqMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UploadedFile {
  fileUri: string;
  mimeType: string;
  displayName: string;
  extractedText?: string;
}

// Groq models - using OpenAI-compatible SDK
const groq = new OpenAI({
  apiKey: GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Model mapping
const MODELS = {
  flash: 'meta-llama/llama-4-scout-17b-16e-instruct',
  pro: 'meta-llama/llama-4-maverick-17b-128e-instruct',
};

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

// Simple classifier using a quick Groq call
export async function selectModel(question: string): Promise<ModelType> {
  if (!GROQ_API_KEY) {
    console.warn('[GroqClient] GROQ_API_KEY not set, defaulting to flash');
    return 'flash';
  }

  try {
    // Use a fast model for classification
    const response = await groq.chat.completions.create({
      model: MODELS.flash,
      messages: [
        {
          role: 'system',
          content: 'Classify this blockchain question as either "simple" (factual lookup) or "complex" (reasoning, pattern analysis, risk explanation). Reply with one word only: simple or complex.'
        },
        { role: 'user', content: question }
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const result = response.choices[0]?.message?.content?.trim().toLowerCase() || 'simple';
    console.log(`[GroqClient] Question classified as: ${result}`);
    return result === 'complex' ? 'pro' : 'flash';
  } catch (error) {
    console.error('[GroqClient] Classifier error, defaulting to flash:', error);
    return 'flash';
  }
}

// Call Groq API with streaming
export async function* callGeminiStream(
  context: string,
  userQuestion: string,
  history: GroqMessage[] = [],
  modelType: ModelType = 'flash',
  attachedFiles?: UploadedFile[]
): AsyncGenerator<string, void, unknown> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Set GROQ_API_KEY in your environment.');
  }

  const modelName = MODELS[modelType];

  // Build messages
  const messages: GroqMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Add history (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    const role: 'user' | 'assistant' | 'system' = 
      msg.role === 'user' ? 'user' : 
      msg.role === 'system' ? 'system' : 'assistant';
    messages.push({
      role,
      content: msg.content,
    });
  }

  // Build user message with context and files
  let userContent = '';
  
  if (context) {
    userContent += `Context:\n${context}\n\n`;
  }

  // Add extracted text from attached files (Groq doesn't have file API)
  if (attachedFiles && attachedFiles.length > 0) {
    userContent += '\nAttached Documents:\n';
    for (const file of attachedFiles) {
      if (file.extractedText) {
        userContent += `\n--- ${file.displayName} ---\n${file.extractedText.slice(0, 8000)}\n`;
      } else {
        userContent += `\n- ${file.displayName} (${file.mimeType})\n`;
      }
    }
    userContent += '\n';
  }

  userContent += `Question: ${userQuestion}`;
  messages.push({ role: 'user', content: userContent });

  try {
    // Use Groq streaming
    const stream = await groq.chat.completions.create({
      model: modelName,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    });

    // Yield chunks from stream
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error: any) {
    console.error('[GroqClient] API error:', error.message);
    throw new Error(`Groq API error: ${error.message}`);
  }
}

// Non-streaming version for classifier
export async function callGemini(
  prompt: string,
  modelType: ModelType = 'flash'
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const modelName = MODELS[modelType];

  const response = await groq.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  return response.choices[0]?.message?.content || '';
}

// Text-extractable file extensions and their MIME types
const TEXT_EXTRACTABLE: Record<string, string> = {
  'txt': 'text/plain',
  'json': 'application/json',
  'csv': 'text/csv',
  'js': 'text/javascript',
  'ts': 'text/typescript',
  'py': 'text/x-python',
  'sol': 'text/plain',
};

const MAX_TEXT_SIZE = 100000; // 100KB limit for extracted text

function getFileExtension(displayName: string): string {
  return (displayName.split('.').pop() || '').toLowerCase();
}

function extractTextContent(filePath: string, extension: string): string | undefined {
  try {
    if (!fs.existsSync(filePath)) return undefined;
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_TEXT_SIZE) {
      console.log(`[Upload] File too large for text extraction: ${stat.size} bytes`);
      return undefined;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.trim();
  } catch (error) {
    console.error(`[Upload] Failed to extract text from ${filePath}:`, error);
    return undefined;
  }
}

export async function uploadFileToGemini(
  filePath: string,
  displayName: string
): Promise<UploadedFile> {
  const extension = getFileExtension(displayName);
  const mimeType = TEXT_EXTRACTABLE[extension] || 'application/octet-stream';

  let extractedText: string | undefined;

  if (TEXT_EXTRACTABLE[extension]) {
    extractedText = extractTextContent(filePath, extension);
    if (extractedText) {
      console.log(`[Upload] Extracted ${extractedText.length} chars from ${displayName}`);
    }
  }

  return {
    fileUri: filePath,
    mimeType,
    displayName,
    extractedText,
  };
}