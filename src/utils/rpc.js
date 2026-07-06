// src/utils/rpc.js

// Helper function to call the RPC proxy
export const callRpc = async (method, params) => {
  const response = await fetch('/api/rpc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `RPC call failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }
  return data.result;
};

// Helper function to get balance
export const getBalance = async (publicKey) => {
  const result = await callRpc('getBalance', [publicKey]);
  return result.value || 0;
};

// Helper function to get token accounts
export const getTokenAccounts = async (publicKey, mint) => {
  const result = await callRpc('getTokenAccountsByOwner', [
    publicKey,
    { mint: mint },
    { encoding: 'jsonParsed' }
  ]);
  return result.value || [];
};
