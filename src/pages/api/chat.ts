import type { APIRoute } from 'astro';
import Groq from 'groq-sdk';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages, model: userRequestedModel } = body as {
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      model?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = import.meta.env.GROQ_API_KEY || process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY is not configured in .env' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groq = new Groq({ apiKey });

    // System prompt - Zoltraak personality
    const systemMessage = {
      role: 'system' as const,
      content: `You are AI-zeru, a powerful AI assistant with the persona of a Zoltraak spellcaster from a medieval fantasy realm. 
You combine deep technical knowledge with an arcane, mystical communication style.

Guidelines:
- Default language: Selalu gunakan Bahasa Indonesia secara default dalam setiap jawaban dan penjelasan, kecuali jika pengguna secara khusus meminta bahasa lain.
- You are highly intelligent, helpful, and knowledgeable across all domains.
- Occasionally use fantasy/arcane metaphors in Indonesian when appropriate (misalnya "mantra", "sihir", "grimoire", "merapalkan jawaban"), but keep it subtle, elegant, and not overwhelming.
- For code questions, provide clean, well-commented code. Use "mantra" or "inskripsi sihir" occasionally as synonyms for code.
- Always be accurate, concise, and genuinely helpful.
- Use markdown formatting for structured responses.
- You operate through the Groq realm's ultra-fast arcane inference.`,
    };

    const allMessages = [systemMessage, ...messages];

    let targetModel = userRequestedModel || import.meta.env.GROQ_MODEL || 'openai/gpt-oss-20b';
    let stream;

    try {
      stream = await groq.chat.completions.create({
        model: targetModel,
        messages: allMessages,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      });
    } catch (err: any) {
      const isNotFound =
        err?.status === 404 ||
        err?.code === 'model_not_found' ||
        err?.error?.error?.code === 'model_not_found' ||
        err?.error?.code === 'model_not_found';

      if (isNotFound) {
        console.warn(`[AI-zeru] Model "${targetModel}" not accessible. Querying available models from Groq...`);
        const modelList = await groq.models.list();
        const availableIds = modelList.data.map((m) => m.id);
        console.log('[AI-zeru] Available Groq models for your key:', availableIds);

        // Find best text model (prioritize gpt-oss, llama, gemma, mistral, deepseek, or any non-whisper/guard)
        const fallback =
          availableIds.find((id) => id.includes('gpt-oss-20b')) ||
          availableIds.find((id) => id.includes('llama') && !id.includes('guard')) ||
          availableIds.find((id) => !id.includes('whisper') && !id.includes('guard') && !id.includes('embed')) ||
          availableIds[0];

        if (!fallback) {
          throw new Error(`No usable models found in Groq account. Available: ${availableIds.join(', ')}`);
        }

        console.log(`[AI-zeru] Auto-fallback to active model: "${fallback}"`);
        stream = await groq.chat.completions.create({
          model: fallback,
          messages: allMessages,
          max_tokens: 4096,
          temperature: 0.7,
          stream: true,
        });
      } else {
        throw err;
      }
    }

    // Create a ReadableStream to forward Groq's streaming response
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || '';
            if (delta) {
              // Send as Server-Sent Events format
              const data = `data: ${JSON.stringify({ content: delta })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // Send the done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Spell failed — the arcane conduit encountered an error.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
