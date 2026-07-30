// functions/api/dflow.js
export async function onRequest(context) {
  const { request } = context;
  
  // Get API key from Cloudflare environment variables
  const DFLOW_API_KEY = context.env.DFLOW_API_KEY || context.env.REACT_APP_DFLOW_API_KEY;
  const DFLOW_API = 'https://quote-api.dflow.net';

  // Token program constants
  const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

  // Known Token-2022 tokens
  const TOKEN_2022_MINTS = {
    '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump': true, // TREAT
  };

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

    // 🔥 Process data for Token-2022 support
    let processedData = data;
    
    if (data) {
      // Check if we're dealing with TREAT (Token-2022)
      const isTREATSwap = (data.outputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump') ||
                          (data.inputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump') ||
                          (data.quoteResponse?.outputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump') ||
                          (data.quoteResponse?.inputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump');

      if (isTREATSwap) {
        console.log('🔧 Detected TREAT (Token-2022) swap');
        
        // If this is a swap request, add Token-2022 program IDs
        if (endpoint === 'swap') {
          processedData = {
            ...data,
            // Force Token-2022 for TREAT
            tokenProgram: TOKEN_2022_PROGRAM_ID,
            destinationTokenProgram: TOKEN_2022_PROGRAM_ID,
          };
          
          // If quoteResponse exists, update it too
          if (processedData.quoteResponse) {
            processedData.quoteResponse = {
              ...processedData.quoteResponse,
              tokenProgram: TOKEN_2022_PROGRAM_ID,
            };
          }
          
          console.log('✅ Added Token-2022 program to swap request');
        }
        
        // If this is a quote request, add token program info
        if (endpoint === 'quote') {
          const outputIsTREAT = data.outputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
          const inputIsTREAT = data.inputMint === '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
          
          processedData = {
            ...data,
            // Add token program hints for the quote
            inputTokenProgram: inputIsTREAT ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
            outputTokenProgram: outputIsTREAT ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID,
          };
          
          console.log('✅ Added Token-2022 hints to quote request');
        }
      }
    }

    // Build the URL with the correct path
    let url = `${DFLOW_API}${endpointPath}`;
    
    // For GET requests, append query parameters
    if (method.toUpperCase() === 'GET' && processedData) {
      const params = new URLSearchParams(processedData);
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    console.log(`\n📤 DFlow API Request:`);
    console.log(`Method: ${method.toUpperCase()}`);
    console.log(`URL: ${url}`);
    console.log(`Endpoint: ${endpoint}`);
    if (processedData) {
      console.log(`Data:`, JSON.stringify(processedData, null, 2));
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
      fetchOptions.body = JSON.stringify(processedData);
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
      
      // Try to parse error as JSON for better message
      let errorJson = null;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }
      
      return new Response(JSON.stringify({ 
        error: `DFlow API error: ${response.status}`,
        status: response.status,
        details: errorJson || errorText,
        endpoint: endpoint,
        hint: 'Check Token-2022 support'
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
