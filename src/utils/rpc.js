// Get Alchemy API key from environment variables
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

// RPC endpoints in order of preference
// Prioritize endpoints that support subscriptions for better compatibility
const RPC_ENDPOINTS = ALCHEMY_API_KEY
  ? [
      `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.rpc.extrnode.com',
    ]
  : [
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana',
      'https://solana-mainnet.rpc.extrnode.com',
      'https://solana-mainnet.g.alchemy.com/v2/demo',
    ];

let currentEndpointIndex = 0;

export const getNextRpcEndpoint = () => {
  const endpoint = RPC_ENDPOINTS[currentEndpointIndex];
  currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
  console.log(`Using RPC endpoint: ${endpoint.split('/').slice(0, 3).join('/')}...`);
  return endpoint;
};

export const getCurrentRpcEndpoint = () => {
  return RPC_ENDPOINTS[currentEndpointIndex];
};

export const resetRpcEndpoint = () => {
  currentEndpointIndex = 0;
};
