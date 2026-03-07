// Google Gemini API wrapper for AI report generation
import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('GEMINI_API_KEY not set in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY || '');

export async function generateInvestigationReport(
  investigationData: any,
  systemPrompt: string
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `${systemPrompt}

Investigation Data:
${JSON.stringify(investigationData, null, 2)}

Generate a structured investigation report in markdown format.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error('Gemini API error:', error.message);
    return `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}

export async function* streamInvestigationReport(
  investigationData: any,
  systemPrompt: string
): AsyncGenerator<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `${systemPrompt}

Investigation Data:
${JSON.stringify(investigationData, null, 2)}

Generate a structured investigation report in markdown format.`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  } catch (error: any) {
    console.error('Gemini streaming error:', error.message);
    yield `# Error Generating Report\n\nUnable to generate AI report: ${error.message}`;
  }
}
