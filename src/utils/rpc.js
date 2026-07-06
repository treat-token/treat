// Use Cloudflare Worker endpoint that has access to ALCHEMY_API_KEY
// This ensures token balance fetching and swap execution work properly
const RPC_ENDPOINTS = [
  '/api/alchemy',  // Cloudflare Worker endpoint with Alchemy support
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com',
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
