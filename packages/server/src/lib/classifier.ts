// ============================================================
// Question Classifier - Determines if question is simple or complex
// Uses Gemini Flash for cheap classification
// ============================================================

import { callGemini } from './gemini-client.js';

export interface ClassificationResult {
  category: 'simple' | 'complex';
  reasoning: string;
  keywords: string[];
}

const CLASSIFIER_PROMPT = `Classify this blockchain analysis question as either "simple" or "complex".

Rules:
- simple: Questions about basic facts like balance, transaction count, chain, token list, simple tags, basic risk level
- complex: Questions about pattern analysis, sybil detection, funding tracing, behavioral analysis, detailed risk explanations, correlation with other wallets, contract vulnerabilities, honeypot detection

Respond ONLY with valid JSON in this exact format:
{"category": "simple" or "complex", "reasoning": "brief 1-sentence why", "keywords": ["keyword1", "keyword2"]}

Question:`;

export async function geminiClassifier(question: string): Promise<ClassificationResult> {
  try {
    const prompt = `${CLASSIFIER_PROMPT}\n"${question}"`;
    const response = await callGemini(prompt, 'flash');
    
    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        category: parsed.category === 'complex' ? 'complex' : 'simple',
        reasoning: parsed.reasoning || '',
        keywords: parsed.keywords || []
      };
    }
    
    // Fallback: simple keyword detection if JSON parsing fails
    return fallbackClassifier(question);
  } catch (error) {
    console.error('[Classifier] Error:', error);
    return fallbackClassifier(question);
  }
}

function fallbackClassifier(question: string): ClassificationResult {
  const q = question.toLowerCase();
  
  const complexKeywords = [
    'sybil', 'cluster', 'pattern', 'funding', 'trace', 'origin',
    'behavior', 'correlation', 'relationship', 'network', 'detect',
    'honeypot', 'vulnerability', 'exploit', 'attack', 'phishing',
    'smart', 'contract', 'audit', 'security', 'risk explanation',
    'why', 'how did', 'explain', 'analyze', 'compare', 'similar'
  ];
  
  const foundComplex = complexKeywords.filter(kw => q.includes(kw));
  
  return {
    category: foundComplex.length > 0 ? 'complex' : 'simple',
    reasoning: foundComplex.length > 0 
      ? `Contains complex keywords: ${foundComplex.join(', ')}` 
      : 'No complex keywords detected, treating as simple',
    keywords: foundComplex
  };
}