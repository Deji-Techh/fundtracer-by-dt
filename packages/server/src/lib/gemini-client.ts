// ============================================================
// Gemini Client - AI Model Routing
// Handles calls to Google Gemini API with model selection
// ============================================================

import { geminiClassifier, type ClassificationResult } from './classifier.js';

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
  modelType: ModelType = 'flash'
): AsyncGenerator<string, void, unknown> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const modelName = getModelName(modelType);

  // Build conversation messages
  const messages: GeminiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10), // Max 10 previous messages
    { role: 'user', content: `Context:\n${context}\n\nQuestion: ${userQuestion}` }
  ];

  // For streaming, we use the chat/completions endpoint with streaming
  const url = `${GEMINI_BASE_URL}/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      parts: [{ text: msg.content }]
    })),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
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