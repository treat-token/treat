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
    // Check if API key is available
    if (!DFLOW_API_KEY || DFLOW_API_KEY.includes('REPLACE_ENV')) {
      console.error('❌ DFLOW_API_KEY is not properly configured');
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'DFLOW_API_KEY must be set in Cloudflare environment'
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

    const DFLOW_ENDPOINTS = {
      quote: '/quote',
      swap: '/swap',
    };

    const endpointPath = DFLOW_ENDPOINTS[endpoint];
    if (!endpointPath) {
      return new Response(JSON.stringify({ 
        error: 'Invalid endpoint',
        message: `Endpoint "${endpoint}" not supported. Use "quote" or "swap".`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Build the URL with the correct path
    let url = `${DFLOW_API}${endpointPath}`;
    
    // For GET requests, append query parameters
    if (method.toUpperCase() === 'GET' && data) {
      const params = new URLSearchParams(data);
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
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
    }

    // Forward the request to DFlow API
    const response = await fetch(url, fetchOptions);

    console.log(`\n📥 DFlow Response Status: ${response.status}`);

    // Handle error responses
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error response';
      }

      console.error('❌ DFlow API Error:');
      console.error('Status:', response.status);
      console.error('URL:', url);
      console.error('Response Text:', errorText);
      
      return new Response(JSON.stringify({ 
        error: `DFlow API error: ${response.status}`,
        status: response.status,
        details: errorText,
        endpoint: endpoint,
        hint: 'Check the URL path format'
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
