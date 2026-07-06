export async function onRequest(context) {
  const { request } = context;
  
  // Get API keys from Cloudflare environment variables
  const DFLOW_API_KEY = context.env.DFLOW_API_KEY || context.env.REACT_APP_DFLOW_API_KEY;
  const DFLOW_API = 'https://api.dflow.net/v1';
  
  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Check if API key is available
    if (!DFLOW_API_KEY) {
      console.error('Dflow API key is missing!');
      return new Response(JSON.stringify({ 
        error: 'Dflow API key is not configured in Cloudflare environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Read the request body with better error handling
    let body;
    try {
      const text = await request.text();
      if (!text) {
        throw new Error('Request body is empty');
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body',
        message: 'Request body must be valid JSON'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    console.log('Request body:', body);
    
    // Determine which endpoint to call
    const endpoint = body.endpoint || 'quote';
    const url = `${DFLOW_API}/${endpoint}`;
    
    console.log('Calling Dflow API:', url);

    // Forward the request to Dflow API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DFLOW_API_KEY}`,
      },
      body: JSON.stringify(body.data)
    });

    console.log('Dflow API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dflow API error response:', errorText);
      
      return new Response(JSON.stringify({ 
        error: `Dflow API error: ${response.status}`,
        details: errorText,
        status: response.status
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    const data = await response.json();
    console.log('Dflow API success');
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
