export async function onRequest(context) {
  const { request } = context;
  
  // Get the API key from Cloudflare environment variables
  const ALCHEMY_API_KEY = context.env.ALCHEMY_API_KEY || context.env.REACT_APP_ALCHEMY_API_KEY;
  
  if (!ALCHEMY_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  
  try {
    const body = await request.json();
    
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'RPC request failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
