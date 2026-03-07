import { NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

export async function GET() {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: 'OPENROUTER_API_KEY is not set' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `OpenRouter models error (${response.status}): ${text}` },
        { status: response.status }
      );
    }

    const payload = await response.json();
    const models = Array.isArray(payload?.data) ? payload.data : [];

    const simplified = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      context_length: model.context_length,
      pricing: model.pricing,
    }));

    const freeModels = simplified
      .filter((model: any) => {
        const id = String(model.id || '');
        const promptPrice = String(model.pricing?.prompt ?? '');
        const completionPrice = String(model.pricing?.completion ?? '');
        return id.includes(':free') || (promptPrice === '0' && completionPrice === '0');
      })
      .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));

    return NextResponse.json({
      defaultModel: process.env.OPENROUTER_MODEL || 'arcee-ai/trinity-large-preview:free',
      totalModels: simplified.length,
      freeModelsCount: freeModels.length,
      freeModels,
      sampleModels: simplified.slice(0, 50),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `Failed to fetch OpenRouter models: ${error.message}` },
      { status: 500 }
    );
  }
}
