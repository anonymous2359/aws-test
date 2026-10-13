// Netlify Function (v2). Reads OPENROUTER_API_KEY from Netlify's environment
// variables in production, and from .env when run with `netlify dev`.
export default async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: { message: 'Method not allowed' } }, { status: 405 });
  }

  const key = (req.headers.get('x-user-key') || process.env.OPENROUTER_API_KEY || '').trim();
  if (!key) {
    return Response.json(
      { error: { message: 'Server has no OPENROUTER_API_KEY set. Add it in Netlify env vars (or .env locally).' } },
      { status: 500 }
    );
  }

  const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      'X-Title': 'Nova Chat',
    },
    body: await req.text(),
  });

  // Stream the response straight through so tokens appear live
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
};

export const config = { path: '/api/chat' };
