// functions/api/rpc.js
export async function onRequest(context) {
  const { request } = context;
  
  // Get API key from Cloudflare environment variables
  const ALCHEMY_API_KEY = context.env.ALCHEMY_API_KEY || context.env.REACT_APP_ALCHEMY_API_KEY;
  const RPC_URL = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Check if API key is available
    if (!ALCHEMY_API_KEY) {
      console.error('ALCHEMY_API_KEY is missing in environment variables');
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'ALCHEMY_API_KEY is missing in Cloudflare environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Get the request body
    const body = await request.json();
    
    console.log('🔗 RPC Proxy called with method:', body.method);
    console.log('📡 Using RPC URL:', RPC_URL.split('/').slice(0, 3).join('/') + '/...');

    // Forward the request to Alchemy
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Alchemy RPC error:', errorText);
      return new Response(JSON.stringify({ 
        error: `RPC error: ${response.status}`,
        details: errorText 
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('RPC Proxy error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
