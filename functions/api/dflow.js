// functions/api/dflow.js
export async function onRequest(context) {
  const { request } = context;
  
  // Get API key from Cloudflare environment variables
  const DFLOW_API_KEY = context.env.DFLOW_API_KEY || context.env.REACT_APP_DFLOW_API_KEY;
  const DFLOW_API = 'https://quote-api.dflow.net';

  // Handle OPTIONS request for CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  try {
    // Check if API key is available and not a placeholder
    if (!DFLOW_API_KEY || DFLOW_API_KEY.includes('REPLACE_ENV')) {
      console.error('❌ DFLOW_API_KEY is not properly configured');
      console.error('Current value:', DFLOW_API_KEY);
      console.error('Please set DFLOW_API_KEY in Cloudflare environment variables');
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'DFLOW_API_KEY must be set in Cloudflare environment. Current value contains placeholder or is missing.'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Parse request body
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

    const { endpoint, method = 'GET', data } = body;
    
    if (!endpoint) {
      return new Response(JSON.stringify({ 
        error: 'Missing endpoint',
        message: 'You must specify an endpoint (quote or swap)'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Build the URL with query parameters for GET requests
    let url = `${DFLOW_API}/${endpoint}`;
    if (method.toUpperCase() === 'GET' && data) {
      const params = new URLSearchParams(data);
      url += `?${params.toString()}`;
    }

    console.log(`\n📤 DFlow API Request:`);
    console.log(`Method: ${method.toUpperCase()}`);
    console.log(`URL: ${url}`);
    console.log(`Endpoint: ${endpoint}`);
    if (data) {
      console.log(`Data:`, data);
    }

    // Prepare fetch options
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'Accept': 'application/json',
        'x-api-key': DFLOW_API_KEY,
      },
    };

    // Add body for POST requests
    if (method.toUpperCase() === 'POST') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(data);
      console.log(`Body:`, data);
    }

    // Forward the request to DFlow API
    const response = await fetch(url, fetchOptions);

    console.log(`\n📥 DFlow Response Status: ${response.status}`);

    // Handle error responses
    if (!response.ok) {
      let errorText;
      let errorJson = null;
      try {
        const text = await response.text();
        errorText = text;
        try {
          errorJson = JSON.parse(text);
        } catch {}
      } catch {
        errorText = 'Unable to read error response';
      }

      console.error('❌ DFlow API Error:');
      console.error('Status:', response.status);
      console.error('URL:', url);
      console.error('Method:', method.toUpperCase());
      console.error('Endpoint:', endpoint);
      console.error('Response Text:', errorText);
      if (errorJson) {
        console.error('Response JSON:', errorJson);
      }
      
      return new Response(JSON.stringify({ 
        error: `DFlow API error: ${response.status}`,
        status: response.status,
        details: errorText,
        parsedError: errorJson,
        endpoint: endpoint,
        hint: 'Check Cloudflare logs for more details'
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Return successful response
    const responseData = await response.json();
    console.log(`✅ DFlow ${endpoint} successful`);
    
    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('❌ Cloudflare Function error:', error);
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
