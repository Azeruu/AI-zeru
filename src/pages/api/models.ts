import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

export interface ModelInfo {
  id: string;
  name: string;
  badge?: string;
  score: number;
}

function formatModelName(id: string): { name: string; badge?: string; score: number } {
  const lower = id.toLowerCase();
  
  if (lower.includes('deepseek-r1')) {
    return { name: 'DeepSeek R1 (Reasoning)', badge: 'Reasoning', score: 100 };
  }
  if (lower.includes('llama-3.3-70b')) {
    return { name: 'Llama 3.3 70B (Versatile)', badge: 'Best Quality', score: 95 };
  }
  if (lower.includes('gpt-oss-120b')) {
    return { name: 'GPT-OSS 120B', badge: 'High Quality', score: 90 };
  }
  if (lower.includes('llama-3.1-70b')) {
    return { name: 'Llama 3.1 70B', badge: 'High Quality', score: 85 };
  }
  if (lower.includes('llama-3.2-11b')) {
    return { name: 'Llama 3.2 11B Vision', badge: 'Fast & Smart', score: 80 };
  }
  if (lower.includes('llama-3.2-3b')) {
    return { name: 'Llama 3.2 3B', badge: 'Ultra Fast', score: 75 };
  }
  if (lower.includes('llama-3.2-1b')) {
    return { name: 'Llama 3.2 1B', badge: 'Lightning', score: 70 };
  }
  if (lower.includes('llama-3.1-8b')) {
    return { name: 'Llama 3.1 8B Instant', badge: 'Fast', score: 65 };
  }
  if (lower.includes('gemma2-9b')) {
    return { name: 'Gemma 2 9B (Google)', badge: 'Efficient', score: 60 };
  }
  if (lower.includes('mixtral-8x7b')) {
    return { name: 'Mixtral 8x7B (MoE)', badge: 'General', score: 55 };
  }
  
  // Generic cleanup
  const formatted = id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { name: formatted, score: 10 };
}

export const GET: APIRoute = async () => {
  const apiKey = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        models: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', badge: 'Best' },
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Fast' },
          { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Google)', badge: 'Balanced' },
        ],
        defaultModel: 'llama-3.3-70b-versatile',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const groq = new Groq({ apiKey });
    const response = await groq.models.list();
    const rawIds = response.data.map((m) => m.id);

    // Filter out non-chat models (audio transcription, moderation, embeddings)
    const chatModelIds = rawIds.filter((id) => {
      const lower = id.toLowerCase();
      return (
        !lower.includes('whisper') &&
        !lower.includes('guard') &&
        !lower.includes('embed') &&
        !lower.includes('tts')
      );
    });

    const formattedList: ModelInfo[] = chatModelIds.map((id) => {
      const info = formatModelName(id);
      return { id, name: info.name, badge: info.badge, score: info.score };
    });

    // Sort by score descending (highest quality / best model first)
    formattedList.sort((a, b) => b.score - a.score);

    const defaultModel =
      import.meta.env.GROQ_MODEL ||
      formattedList[0]?.id ||
      'llama-3.3-70b-versatile';

    return new Response(
      JSON.stringify(
        {
          models: formattedList.map(({ id, name, badge }) => ({ id, name, badge })),
          defaultModel,
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error fetching Groq models:', error);
    // Fallback list if fetching fails
    const fallbackModels = [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Versatile)', badge: 'Best' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 (Reasoning)', badge: 'Reasoning' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Fast' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B (Google)', badge: 'Balanced' },
    ];
    return new Response(
      JSON.stringify({
        models: fallbackModels,
        defaultModel: 'llama-3.3-70b-versatile',
        error: error.message,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
