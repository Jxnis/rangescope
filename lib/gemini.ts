// OpenRouter API wrapper for AI report generation

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'arcee-ai/trinity-large-preview:free';
const APP_URL = process.env.OPENROUTER_SITE_URL || 'http://localhost:3000';
const APP_TITLE = process.env.OPENROUTER_APP_NAME || 'RangeScope';
const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-nemo:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

if (!OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY not set in environment variables');
}

function buildPrompt(investigationData: any, systemPrompt: string): string {
  return `${systemPrompt}\n\nInvestigation Data:\n${JSON.stringify(investigationData, null, 2)}\n\nGenerate a structured investigation report in markdown format.`;
}

function openRouterHeaders() {
  return {
    Authorization: `Bearer ${OPENROUTER_API_KEY || ''}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': APP_URL,
    'X-OpenRouter-Title': APP_TITLE,
  } as Record<string, string>;
}

function extractMessageContent(content: any): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

function buildModelCandidates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of FALLBACK_MODELS) {
    if (!model || seen.has(model)) continue;
    seen.add(model);
    out.push(model);
  }
  return out;
}

export async function generateInvestigationReport(
  investigationData: any,
  systemPrompt: string
): Promise<string> {
  try {
    const prompt = buildPrompt(investigationData, systemPrompt);
    const modelCandidates = buildModelCandidates();
    let lastError: Error | null = null;

    for (const model of modelCandidates) {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`OpenRouter error (${response.status}) with ${model}: ${errorText}`);
        lastError = err;

        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        throw err;
      }

      const payload = await response.json();
      const content = payload?.choices?.[0]?.message?.content;
      const text = extractMessageContent(content);
      if (text) return text;
      lastError = new Error(`OpenRouter returned empty response for ${model}`);
    }

    throw lastError || new Error('OpenRouter failed for all candidate models');
  } catch (error: any) {
    console.error('OpenRouter API error:', error.message);
    return `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}

function extractDeltaContent(delta: any): string {
  const content = delta?.content;
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }

  return '';
}

export async function* streamInvestigationReport(
  investigationData: any,
  systemPrompt: string
): AsyncGenerator<string> {
  try {
    const prompt = buildPrompt(investigationData, systemPrompt);
    const modelCandidates = buildModelCandidates();
    let lastError: Error | null = null;

    for (const model of modelCandidates) {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: openRouterHeaders(),
        body: JSON.stringify({
          model,
          temperature: 0.2,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        const err = new Error(`OpenRouter stream error (${response.status}) with ${model}: ${errorText}`);
        lastError = err;
        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        throw err;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta;
            const chunk = extractDeltaContent(delta);
            if (chunk) yield chunk;
          } catch {
            // Ignore malformed SSE line chunks.
          }
        }
      }

      return;
    }

    throw lastError || new Error('OpenRouter stream failed for all candidate models');
  } catch (error: any) {
    console.error('OpenRouter streaming error:', error.message);
    yield `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}
