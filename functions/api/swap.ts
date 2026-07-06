export const onRequest = async (context) => {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json();
    const { endpoint, ...payload } = body;

    const dflowApiKey = env.DFLOW_API_KEY || context.env?.DFLOW_API_KEY;

    if (!dflowApiKey) {
      return new Response(
        JSON.stringify({
          error: 'DFLOW_API_KEY is not configured',
          available_env: Object.keys(env || {})
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dflowResponse = await fetch(`https://api.dflow.io/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': dflowApiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await dflowResponse.json();

    return new Response(JSON.stringify(data), {
      status: dflowResponse.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
