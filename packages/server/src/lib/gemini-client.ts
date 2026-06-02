// ============================================================
// Groq Client - AI Model Routing
// Handles calls to Groq API with smart model selection
// ============================================================

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

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

// Model mapping
const MODELS = {
  flash: 'meta-llama/llama-4-scout-17b-16e-instruct',
  pro: 'llama-3.3-70b-versatile',
};

const SYSTEM_PROMPT = `You are FT Maverick, FundTracer's expert blockchain forensics AI analyst. Answer based ONLY on the analyzed data provided. Do not fabricate transactions, addresses, or values. When explaining risk, cite specific patterns found in the analysis. Format responses cleanly with bullet points and bold for key terms. Lead with a one-sentence direct answer. If data is insufficient, say so clearly.`;

interface GroqKeySlot {
  id: string;
  key: string;
}

const keyModelCooldownUntil = new Map<string, number>();
const rateLimitLogUntil = new Map<string, number>();
const groqClients = new Map<string, OpenAI>();
let keyPoolLogDone = false;
let currentKeyIndex = 0;

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

export function getGroqKeyPool(): GroqKeySlot[] {
  const slots: GroqKeySlot[] = [];
  const seen = new Set<string>();

  for (let i = 1; i <= 5; i += 1) {
    const key = process.env[`GROQ_${i}`]?.trim();
    if (key && !seen.has(key)) {
      slots.push({ id: `GROQ_${i}`, key });
      seen.add(key);
    }
  }

  const fallback = process.env.GROQ_API_KEY?.trim();
  if (fallback && !seen.has(fallback)) {
    slots.push({ id: 'GROQ_API_KEY', key: fallback });
  }

  if (!keyPoolLogDone) {
    console.log(`[GroqClient] Loaded ${slots.length} Groq key(s): pool=${slots.filter(k => /^GROQ_\d+$/.test(k.id)).length}, fallback=${slots.some(k => k.id === 'GROQ_API_KEY') ? '1' : '0'}`);
    keyPoolLogDone = true;
  }

  return slots;
}

function getGroqClient(slot: GroqKeySlot): OpenAI {
  const existing = groqClients.get(slot.id);
  if (existing) return existing;

  const client = new OpenAI({
    apiKey: slot.key,
    baseURL: 'https://api.groq.com/openai/v1',
  });
  groqClients.set(slot.id, client);
  return client;
}

function cooldownKey(keyId: string, modelName: string): string {
  return `${keyId}:${modelName}`;
}

function setKeyModelCooldown(keyId: string, modelName: string, retryAfterMs: number, message?: string) {
  const now = Date.now();
  const until = now + Math.max(1_000, retryAfterMs);
  const key = cooldownKey(keyId, modelName);
  keyModelCooldownUntil.set(key, until);

  const logUntil = rateLimitLogUntil.get(key) || 0;
  if (now >= logUntil) {
    const seconds = Math.ceil((until - now) / 1000);
    console.warn(`[GroqClient] ${keyId}/${modelName} rate limited; cooling down for ${seconds}s${message ? `: ${message}` : ''}`);
    rateLimitLogUntil.set(key, now + Math.min(Math.max(retryAfterMs, 15_000), 60_000));
  }
}

function getKeyModelCooldownMs(keyId: string, modelName: string): number {
  const key = cooldownKey(keyId, modelName);
  const until = keyModelCooldownUntil.get(key) || 0;
  const remaining = until - Date.now();
  if (remaining <= 0) {
    keyModelCooldownUntil.delete(key);
    return 0;
  }
  return remaining;
}

function getShortestCooldownMs(modelNames?: string[]): number {
  let shortest = Number.POSITIVE_INFINITY;
  for (const slot of getGroqKeyPool()) {
    for (const modelName of modelNames || Object.values(MODELS)) {
      const remaining = getKeyModelCooldownMs(slot.id, modelName);
      if (remaining > 0 && remaining < shortest) shortest = remaining;
    }
  }
  return Number.isFinite(shortest) ? shortest : 60_000;
}

function chooseKeyForModel(modelName: string): GroqKeySlot | null {
  const slots = getGroqKeyPool();
  if (slots.length === 0) return null;

  for (let attempt = 0; attempt < slots.length; attempt += 1) {
    const index = (currentKeyIndex + attempt) % slots.length;
    const slot = slots[index];
    if (getKeyModelCooldownMs(slot.id, modelName) === 0) {
      currentKeyIndex = (index + 1) % slots.length;
      return slot;
    }
  }

  return null;
}

function chooseAvailableModel(preferred: ModelType): { type: ModelType; name: string; slot: GroqKeySlot; client: OpenAI } {
  const order: ModelType[] = preferred === 'pro' ? ['pro', 'flash'] : ['flash', 'pro'];

  for (const type of order) {
    const name = MODELS[type];
    const slot = chooseKeyForModel(name);
    if (slot) {
      return { type, name, slot, client: getGroqClient(slot) };
    }
  }

  throw new GroqRateLimitError(MODELS[preferred], getShortestCooldownMs(order.map(type => MODELS[type])));
}

function chooseAvailableKeyForRawModel(modelName: string): { slot: GroqKeySlot; key: string } {
  const slot = chooseKeyForModel(modelName);
  if (!slot) {
    throw new GroqRateLimitError(modelName, getShortestCooldownMs([modelName]));
  }
  return { slot, key: slot.key };
}

// Simple classifier using a quick Groq call
export async function selectModel(question: string): Promise<ModelType> {
  if (getGroqKeyPool().length === 0) {
    console.warn('[GroqClient] No Groq keys set, defaulting to flash');
    return 'flash';
  }

  let classificationSlot: GroqKeySlot | null = null;
  try {
    const { client, slot } = chooseAvailableModel('flash');
    classificationSlot = slot;

    // Use a fast model for classification
    const response = await client.chat.completions.create({
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
      if (classificationSlot) {
        setKeyModelCooldown(classificationSlot.id, MODELS.flash, retryAfterMs, error.message);
      }
      // If classification hits a limit, skip to a model that still has a healthy key.
      return chooseKeyForModel(MODELS.pro) ? 'pro' : 'flash';
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
  if (getGroqKeyPool().length === 0) {
    throw new Error('No Groq keys configured. Set GROQ_1 through GROQ_5 or GROQ_API_KEY in your environment.');
  }

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

  const maxAttempts = Math.max(1, getGroqKeyPool().length * 2);
  let lastRateLimit: GroqRateLimitError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const selectedModel = chooseAvailableModel(modelType);
    const modelName = selectedModel.name;
    const groq = selectedModel.client;
    let yieldedAny = false;

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
          yieldedAny = true;
          yield content;
        }
      }
      return;
    } catch (error: any) {
      if (isProviderRateLimit(error)) {
        const retryAfterMs = getRetryAfterMs(error);
        setKeyModelCooldown(selectedModel.slot.id, modelName, retryAfterMs, error.message);
        lastRateLimit = new GroqRateLimitError(modelName, retryAfterMs, error.message);
        if (!yieldedAny) continue;
        throw lastRateLimit;
      }
      console.error('[GroqClient] API error:', error.message);
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  throw lastRateLimit || new GroqRateLimitError(MODELS[modelType], getShortestCooldownMs());
}

// Non-streaming version for classifier
export async function callGemini(
  prompt: string,
  modelType: ModelType = 'flash'
): Promise<string> {
  if (getGroqKeyPool().length === 0) {
    throw new Error('No Groq keys configured');
  }

  const maxAttempts = Math.max(1, getGroqKeyPool().length * 2);
  let lastRateLimit: GroqRateLimitError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { name: modelName, slot, client } = chooseAvailableModel(modelType);

    try {
      const response = await client.chat.completions.create({
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
        setKeyModelCooldown(slot.id, modelName, retryAfterMs, error.message);
        lastRateLimit = new GroqRateLimitError(modelName, retryAfterMs, error.message);
        continue;
      }
      throw error;
    }
  }

  throw lastRateLimit || new GroqRateLimitError(MODELS[modelType], getShortestCooldownMs());
}

export async function fetchGroqChatCompletion(payload: Record<string, unknown>): Promise<Response> {
  if (getGroqKeyPool().length === 0) {
    throw new Error('No Groq keys configured');
  }

  const modelName = String(payload.model || MODELS.pro);
  const maxAttempts = Math.max(1, getGroqKeyPool().length);
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { slot, key } = chooseAvailableKeyForRawModel(modelName);
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status !== 429) return response;

    lastResponse = response;
    let errorBody: any = {};
    try {
      errorBody = await response.clone().json();
    } catch {}
    const retryAfterMs = getRetryAfterMs({
      status: 429,
      headers: response.headers,
      message: errorBody?.error?.message,
      error: errorBody?.error,
    });
    setKeyModelCooldown(slot.id, modelName, retryAfterMs, errorBody?.error?.message);
  }

  if (lastResponse) return lastResponse;
  throw new GroqRateLimitError(modelName, getShortestCooldownMs([modelName]));
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
