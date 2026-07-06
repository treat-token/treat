export const onRequest = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { endpoint, ...payload } = body;

    const alchemyApiKey = env.ALCHEMY_API_KEY;
    if (!alchemyApiKey) {
      return new Response(
        JSON.stringify({ error: 'ALCHEMY_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const alchemyResponse = await fetch(
      `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await alchemyResponse.json();

    return new Response(JSON.stringify(data), {
      status: alchemyResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
