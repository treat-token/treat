// RPC endpoints in order of preference
const RPC_ENDPOINTS = [
  'https://solana-mainnet.g.alchemy.com/v2/demo',
  'https://api.mainnet-beta.solana.com',
  'https://rpc.ankr.com/solana',
  'https://solana-mainnet.rpc.extrnode.com',
];

let currentEndpointIndex = 0;

export const getNextRpcEndpoint = () => {
  const endpoint = RPC_ENDPOINTS[currentEndpointIndex];
  currentEndpointIndex = (currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
  return endpoint;
};

export const getCurrentRpcEndpoint = () => {
  return RPC_ENDPOINTS[currentEndpointIndex];
};

export const resetRpcEndpoint = () => {
  currentEndpointIndex = 0;
};
