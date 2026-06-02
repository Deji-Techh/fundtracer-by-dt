// ============================================================
// Groq Client - AI Model Routing
// Handles calls to Groq API with smart model selection
// ============================================================

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
  pro: 'llama-3.3-70b-versatile',
};

const SYSTEM_PROMPT = `You are FT Maverick, FundTracer's expert blockchain forensics AI analyst. Answer based ONLY on the analyzed data provided. Do not fabricate transactions, addresses, or values. When explaining risk, cite specific patterns found in the analysis. Format responses cleanly with bullet points and bold for key terms. Lead with a one-sentence direct answer. If data is insufficient, say so clearly.`;

const modelCooldownUntil = new Map<string, number>();
const rateLimitLogUntil = new Map<string, number>();

export class GroqRateLimitError extends Error {
  retryAfterMs: number;
  model: string;

  constructor(model: string, retryAfterMs: number, message?: string) {
    super(message || `Groq model ${model} is rate limited. Try again shortly.`);
    this.name = 'GroqRateLimitError';
    this.retryAfterMs = retryAfterMs;
    this.model = model;
  }
}

export function isGroqRateLimitError(error: unknown): error is GroqRateLimitError {
  return error instanceof GroqRateLimitError || (error instanceof Error && error.name === 'GroqRateLimitError');
}

function headerValue(headers: any, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(name) || undefined;
  const raw = headers[name] || headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw ? String(raw) : undefined;
}

function parseDurationFromMessage(message?: string): number | undefined {
  if (!message) return undefined;
  const match = message.match(/try again in (?:(\d+)m)?\s*([\d.]+)s/i);
  if (!match) return undefined;
  const minutes = match[1] ? Number(match[1]) : 0;
  const seconds = Number(match[2] || 0);
  const ms = (minutes * 60 + seconds) * 1000;
  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
}

function getRetryAfterMs(error: any): number {
  const retryHeader = headerValue(error?.headers, 'retry-after');
  const headerSeconds = retryHeader ? Number(retryHeader) : NaN;
  if (Number.isFinite(headerSeconds) && headerSeconds > 0) {
    return Math.ceil(headerSeconds * 1000);
  }
  return parseDurationFromMessage(error?.message || error?.error?.message) || 60_000;
}

function isProviderRateLimit(error: any): boolean {
  return error?.status === 429 || error?.code === 'rate_limit_exceeded' || error?.error?.code === 'rate_limit_exceeded';
}

function setModelCooldown(modelName: string, retryAfterMs: number, message?: string) {
  const now = Date.now();
  const until = now + Math.max(1_000, retryAfterMs);
  modelCooldownUntil.set(modelName, until);

  const logUntil = rateLimitLogUntil.get(modelName) || 0;
  if (now >= logUntil) {
    const seconds = Math.ceil((until - now) / 1000);
    console.warn(`[GroqClient] ${modelName} rate limited; cooling down for ${seconds}s${message ? `: ${message}` : ''}`);
    rateLimitLogUntil.set(modelName, now + Math.min(Math.max(retryAfterMs, 15_000), 60_000));
  }
}

function getModelCooldownMs(modelName: string): number {
  const until = modelCooldownUntil.get(modelName) || 0;
  const remaining = until - Date.now();
  if (remaining <= 0) {
    modelCooldownUntil.delete(modelName);
    return 0;
  }
  return remaining;
}

function chooseAvailableModel(preferred: ModelType): { type: ModelType; name: string } {
  const preferredName = MODELS[preferred];
  if (getModelCooldownMs(preferredName) === 0) {
    return { type: preferred, name: preferredName };
  }

  const fallbackType: ModelType = preferred === 'pro' ? 'flash' : 'pro';
  const fallbackName = MODELS[fallbackType];
  if (getModelCooldownMs(fallbackName) === 0) {
    return { type: fallbackType, name: fallbackName };
  }

  const retryAfterMs = Math.min(getModelCooldownMs(preferredName), getModelCooldownMs(fallbackName));
  throw new GroqRateLimitError(preferredName, retryAfterMs);
}

// Simple classifier using a quick Groq call
export async function selectModel(question: string): Promise<ModelType> {
  if (!GROQ_API_KEY) {
    console.warn('[GroqClient] GROQ_API_KEY not set, defaulting to flash');
    return 'flash';
  }

  try {
    if (getModelCooldownMs(MODELS.flash) > 0) {
      return getModelCooldownMs(MODELS.pro) > 0 ? 'flash' : 'pro';
    }

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
  } catch (error: any) {
    if (isProviderRateLimit(error)) {
      const retryAfterMs = getRetryAfterMs(error);
      setModelCooldown(MODELS.flash, retryAfterMs, error.message);
      return getModelCooldownMs(MODELS.pro) > 0 ? 'flash' : 'pro';
    }
    console.error('[GroqClient] Classifier error, defaulting to flash:', error?.message || error);
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

  const selectedModel = chooseAvailableModel(modelType);
  const modelName = selectedModel.name;

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
    if (isProviderRateLimit(error)) {
      const retryAfterMs = getRetryAfterMs(error);
      setModelCooldown(modelName, retryAfterMs, error.message);
      throw new GroqRateLimitError(modelName, retryAfterMs, error.message);
    }
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

  const { name: modelName } = chooseAvailableModel(modelType);

  try {
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
  } catch (error: any) {
    if (isProviderRateLimit(error)) {
      const retryAfterMs = getRetryAfterMs(error);
      setModelCooldown(modelName, retryAfterMs, error.message);
      throw new GroqRateLimitError(modelName, retryAfterMs, error.message);
    }
    throw error;
  }
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
