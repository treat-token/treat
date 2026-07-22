// src/lib/services/dflow.js
// ============================================================
// DFLOW API SERVICE - Same as used in Markets.tsx
// ============================================================

const DFLOW_API_BASE = '/api/dflow';

export const dflowAPI = {
  /**
   * Get swap quote from DFlow
   * @param {string} inputMint - Token mint address to swap from
   * @param {string} outputMint - Token mint address to swap to
   * @param {number} amount - Amount in lamports
   * @param {number} slippageBps - Slippage in basis points (default: 50)
   * @returns {Promise<Object>} Quote response
   */
  async getQuote(inputMint, outputMint, amount, slippageBps = 50) {
    console.log('📊 Fetching quote from DFlow...');
    console.log('  From:', inputMint);
    console.log('  To:', outputMint);
    console.log('  Amount:', amount);

    const response = await fetch(DFLOW_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'quote',
        method: 'GET',
        data: {
          inputMint,
          outputMint,
          amount: amount.toString(),
          slippageBps: slippageBps.toString(),
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Quote error:', error);
      throw new Error(error.error || 'Quote request failed');
    }

    const result = await response.json();
    console.log('✅ Quote received:', result);
    return result;
  },

  /**
   * Get swap transaction from DFlow
   * @param {Object} params - Swap parameters
   * @param {Object} params.quoteResponse - Quote response from getQuote
   * @param {string} params.userPublicKey - User's wallet public key
   * @param {boolean} params.wrapAndUnwrapSol - Whether to wrap/unwrap SOL
   * @param {boolean} params.dynamicComputeUnitLimit - Use dynamic CU limit
   * @param {number} params.prioritizationFeeLamports - Priority fee in lamports
   * @param {number} params.slippageBps - Slippage in basis points
   * @param {boolean} params.dynamicSlippage - Use dynamic slippage
   * @returns {Promise<Object>} Swap transaction response
   */
  async getSwapTransaction(params) {
    console.log('📝 Getting swap transaction from DFlow...');
    console.log('  User:', params.userPublicKey);

    const response = await fetch(DFLOW_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: 'swap',
        method: 'POST',
        data: {
          quoteResponse: params.quoteResponse,
          userPublicKey: params.userPublicKey,
          wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
          dynamicComputeUnitLimit: params.dynamicComputeUnitLimit ?? true,
          prioritizationFeeLamports: params.prioritizationFeeLamports ?? 150000,
          slippageBps: params.slippageBps ?? 50,
          dynamicSlippage: params.dynamicSlippage ?? true,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Swap transaction error:', error);
      throw new Error(error.error || 'Swap transaction request failed');
    }

    const result = await response.json();
    console.log('✅ Swap transaction received');
    return result;
  },

  /**
   * Execute swap with retry logic
   * @param {Object} params - Swap parameters
   * @param {string} params.fromToken - Token to swap from
   * @param {string} params.toToken - Token to swap to
   * @param {number} params.amount - Amount in lamports
   * @param {string} params.userPublicKey - User's wallet public key
   * @param {number} params.slippageBps - Slippage in basis points
   * @param {number} params.priorityFee - Priority fee in lamports
   * @param {number} params.maxRetries - Maximum retry attempts
   * @param {Function} params.onRetry - Callback on retry
   * @returns {Promise<Object>} Swap result
   */
  async executeSwapWithRetry({
    fromToken,
    toToken,
    amount,
    userPublicKey,
    slippageBps = 50,
    priorityFee = 150000,
    maxRetries = 3,
    onRetry = null,
  }) {
    let lastError = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        console.log(`🔄 Swap attempt ${retryCount + 1}/${maxRetries + 1}`);

        // 1. Get quote
        const quote = await this.getQuote(fromToken, toToken, amount, slippageBps);
        
        // 2. Check if price changed significantly
        if (retryCount > 0 && onRetry) {
          const priceChange = await onRetry(quote);
          if (priceChange && priceChange > 0.1) {
            console.log(`⚠️ Price changed by ${(priceChange * 100).toFixed(2)}%, using latest quote`);
          }
        }

        // 3. Get swap transaction
        const swapData = await this.getSwapTransaction({
          quoteResponse: quote,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: priorityFee + (retryCount * 5000),
          slippageBps: slippageBps + (retryCount * 10),
          dynamicSlippage: true,
        });

        return {
          quote,
          swapData,
          retryCount,
        };

      } catch (error) {
        lastError = error;
        retryCount++;

        if (retryCount <= maxRetries) {
          const isSlippageError = error.message?.toLowerCase().includes('slippage') ||
                                 error.message?.toLowerCase().includes('price') ||
                                 error.message?.toLowerCase().includes('0x');

          if (isSlippageError) {
            console.log(`⏳ Slippage error, retrying in 2s... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
        }

        throw lastError;
      }
    }

    throw lastError || new Error('Swap failed after retries');
  }
};
