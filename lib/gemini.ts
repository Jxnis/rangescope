// Google Gemini API wrapper for AI report generation
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

if (!API_KEY) {
  console.warn('GEMINI_API_KEY not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

function getModelCandidates(): string[] {
  return [...new Set(FALLBACK_MODELS)];
}

export async function generateInvestigationReport(
  investigationData: any,
  systemPrompt: string
): Promise<string> {
  const prompt = `${systemPrompt}

Investigation Data:
${JSON.stringify(investigationData, null, 2)}

Generate a structured investigation report in markdown format.`;

  try {
    let lastError: any = null;
    const attemptErrors: string[] = [];

    for (const modelName of getModelCandidates()) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        lastError = error;
        attemptErrors.push(`${modelName}: ${error.message}`);
      }
    }

    throw new Error(
      attemptErrors.length > 0
        ? `All model attempts failed. ${attemptErrors.join(' | ')}`
        : (lastError?.message || 'No Gemini model available')
    );
  } catch (error: any) {
    console.error('Gemini API error:', error.message);
    return `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}

export async function* streamInvestigationReport(
  investigationData: any,
  systemPrompt: string
): AsyncGenerator<string> {
  const prompt = `${systemPrompt}

Investigation Data:
${JSON.stringify(investigationData, null, 2)}

Generate a structured investigation report in markdown format.`;

  try {
    let lastError: any = null;
    const attemptErrors: string[] = [];

    for (const modelName of getModelCandidates()) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          yield chunk.text();
        }
        return;
      } catch (error: any) {
        lastError = error;
        attemptErrors.push(`${modelName}: ${error.message}`);
      }
    }

    throw new Error(
      attemptErrors.length > 0
        ? `All model attempts failed. ${attemptErrors.join(' | ')}`
        : (lastError?.message || 'No Gemini model available')
    );
  } catch (error: any) {
    console.error('Gemini streaming error:', error.message);
    yield `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}
