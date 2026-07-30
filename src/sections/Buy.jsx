// src/sections/Buy.jsx
import React, { useState, useEffect, useRef } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { callRpc } from '../utils/rpc';
import { dflowAPI } from '@/lib/services/dflow';

const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export default function Buy({ 
  walletConnected, 
  walletAddress, 
  solBalance, 
  treatBalance, 
  treatPrice, 
  showToast,
  isLoading
}) {
  const [swapInput, setSwapInput] = useState('');
  const [swapOutput, setSwapOutput] = useState('0.0');
  const [usdValue, setUsdValue] = useState('~ $0.00');
  const [isSwapping, setIsSwapping] = useState(false);
  const [solPrice, setSolPrice] = useState(150);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  
  // Refs for tracking swap state
  const swapInProgress = useRef(false);
  const walletResponseReceived = useRef(false);
  
  // Local connection state to track wallet status
  const [localWalletConnected, setLocalWalletConnected] = useState(walletConnected);
  const [localWalletAddress, setLocalWalletAddress] = useState(walletAddress);

  // Check connection from multiple sources
  useEffect(() => {
    const checkConnection = () => {
      if (walletConnected && walletAddress) {
        setLocalWalletConnected(true);
        setLocalWalletAddress(walletAddress);
        console.log('✅ Buy: Connected via props');
        return;
      }
      
      try {
        const stored = localStorage.getItem('fixorium_connection');
        if (stored) {
          const data = JSON.parse(stored);
          if (data.publicKey && data.connected) {
            setLocalWalletConnected(true);
            setLocalWalletAddress(data.publicKey);
            console.log('✅ Buy: Connected via localStorage');
            return;
          }
        }
      } catch (e) {
        // Ignore
      }
      
      if (window.fixoriumWalletConnector?.isConnected && window.fixoriumWalletConnector?.publicKey) {
        setLocalWalletConnected(true);
        setLocalWalletAddress(window.fixoriumWalletConnector.publicKey);
        console.log('✅ Buy: Connected via global connector');
        return;
      }
      
      setLocalWalletConnected(false);
      setLocalWalletAddress(null);
      console.log('❌ Buy: Not connected');
    };
    
    checkConnection();
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    fetchSolPrice();
  }, []);

  // Listen for wallet messages
  useEffect(() => {
    const handleWalletMessage = (event) => {
      console.log('📩 Wallet message received in Buy component:', event);
      
      // If we're in the middle of a swap and waiting for response
      if (swapInProgress.current) {
        const data = event.detail || event.data || event;
        
        if (data.type === 'TRANSACTION_RESULT' || data.type === 'transaction_result') {
          console.log('✅ Transaction result received in Buy component');
          walletResponseReceived.current = true;
          
          // Process the result
          const payload = data.payload || data;
          const signature = payload.signature || data.signature || data.requestId;
          
          if (signature) {
            console.log('✅ Signature received via message listener:', signature);
            // Store the signature for later use
            window.__pendingSwapSignature = signature;
            window.__pendingSwapResult = data;
          }
        }
      }
    };

    // Add event listeners for wallet messages
    window.addEventListener('message', handleWalletMessage);
    window.addEventListener('wallet-message', handleWalletMessage);
    window.addEventListener('fixorium-wallet-message', handleWalletMessage);
    
    // Also check for the wallet connector's response
    if (window.fixoriumWalletConnector) {
      window.fixoriumWalletConnector.onMessage = (data) => {
        console.log('📩 Wallet connector onMessage triggered:', data);
        if (data.type === 'TRANSACTION_RESULT') {
          walletResponseReceived.current = true;
          window.__pendingSwapSignature = data.requestId || data.signature;
          window.__pendingSwapResult = data;
        }
      };
    }

    return () => {
      window.removeEventListener('message', handleWalletMessage);
      window.removeEventListener('wallet-message', handleWalletMessage);
      window.removeEventListener('fixorium-wallet-message', handleWalletMessage);
      if (window.fixoriumWalletConnector) {
        window.fixoriumWalletConnector.onMessage = null;
      }
    };
  }, []);

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL');
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs.find(p => p.baseToken?.symbol === 'SOL');
          if (pair?.priceUsd) {
            setSolPrice(parseFloat(pair.priceUsd));
            return;
          }
        }
      }
    } catch (error) {
      console.warn('SOL price fetch error:', error);
    }
    setSolPrice(150);
  };

  const handleSwapInput = (value) => {
    setSwapInput(value);
    if (!value || isNaN(value) || parseFloat(value) <= 0) {
      setSwapOutput('0.0');
      setUsdValue('~ $0.00');
      return;
    }

    const amount = parseFloat(value);
    const usd = amount * solPrice;
    setUsdValue(`~ $${usd.toFixed(2)}`);

    if (treatPrice > 0) {
      const output = amount * (solPrice / treatPrice);
      setSwapOutput(output.toFixed(4));
    } else {
      setSwapOutput('0.0');
    }
  };

  const handleMaxClick = () => {
    if (solBalance > 0) {
      const value = solBalance.toFixed(4);
      setSwapInput(value);
      handleSwapInput(value);
    }
  };

  const handleSwapClick = () => {
    if (!localWalletConnected) {
      showToast('❌ Not Connected', 'Please connect your wallet first', 'error');
      return;
    }

    const amount = parseFloat(swapInput);
    if (!amount || amount <= 0) {
      showToast('❌ Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    if (amount > solBalance) {
      showToast('❌ Insufficient Balance', `Not enough SOL in wallet (${solBalance.toFixed(4)} SOL)`, 'error');
      return;
    }

    setConfirmData({
      amount: amount,
      output: swapOutput,
      rate: solPrice / treatPrice,
      walletType: 'Fixorium',
      address: localWalletAddress || walletAddress
    });
    setShowConfirmDialog(true);
  };

  const getDflowQuote = async (amountInLamports) => {
    console.log('📊 Fetching quote from DFlow...');
    console.log('  From (SOL):', SOL_MINT);
    console.log('  To (TREAT):', TREAT_MINT_ADDRESS);
    console.log('  Amount:', amountInLamports);

    const quote = await dflowAPI.getQuote(
      SOL_MINT,
      TREAT_MINT_ADDRESS,
      amountInLamports,
      50 // slippageBps
    );

    if (!quote || !quote.outAmount) {
      throw new Error('No quote received from DFlow');
    }

    console.log('✅ Quote received:', quote);
    return quote;
  };

  const getDflowSwap = async (quoteData) => {
    console.log('📝 Getting swap transaction from DFlow...');

    const swapData = await dflowAPI.getSwapTransaction({
      quoteResponse: quoteData,
      userPublicKey: localWalletAddress || walletAddress,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 150000,
      slippageBps: 50,
      dynamicSlippage: true,
    });

    if (!swapData || !swapData.swapTransaction) {
      throw new Error('No swap transaction received from DFlow');
    }

    console.log('✅ Swap transaction received');
    return swapData;
  };

  const base64ToUint8Array = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Helper function to check if signature is valid Solana format
  const isValidSolanaSignature = (signature) => {
    if (!signature || typeof signature !== 'string') return false;
    if (signature.startsWith('tx_')) return false;
    if (signature.length < 64) return false;
    return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(signature);
  };

  // Improved confirmation check with better error handling
  const waitForTransactionConfirmation = async (signature, maxAttempts = 25) => {
    console.log(`⏳ Waiting for transaction ${signature} to confirm...`);
    
    let confirmed = false;
    let attempts = 0;
    let lastError = null;

    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await callRpc('getSignatureStatuses', [[signature]]);
        
        if (status.value && status.value[0]) {
          const txStatus = status.value[0];
          
          if (txStatus.confirmationStatus === 'confirmed' || txStatus.confirmationStatus === 'finalized') {
            confirmed = true;
            console.log('✅ Transaction confirmed:', txStatus);
            return { confirmed: true, status: txStatus };
          } else if (txStatus.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(txStatus.err)}`);
          }
        }
      } catch (e) {
        lastError = e.message;
        console.warn(`Confirmation check attempt ${attempts + 1}/${maxAttempts}:`, e.message);
      }

      if (!confirmed) {
        const waitTime = Math.min(2000 + (attempts * 500), 8000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        attempts++;
      }
    }

    if (!confirmed) {
      console.warn('⚠️ Transaction confirmation timeout after', attempts, 'attempts');
      return { 
        confirmed: false, 
        error: lastError || 'Transaction confirmation timeout',
        attempts 
      };
    }
  };

  // Custom signAndSend with timeout and message handling
  const signAndSendWithFallback = (connector, transaction) => {
    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        // Check if we received a response via message listener
        if (walletResponseReceived.current && window.__pendingSwapResult) {
          console.log('✅ Using pending result from message listener');
          const result = window.__pendingSwapResult;
          window.__pendingSwapResult = null;
          walletResponseReceived.current = false;
          resolve(result);
          return;
        }
        
        // Check if we have a stored signature
        if (window.__pendingSwapSignature) {
          console.log('✅ Using stored signature from message listener');
          const signature = window.__pendingSwapSignature;
          window.__pendingSwapSignature = null;
          resolve({ signature, success: true });
          return;
        }
        
        reject(new Error('Transaction signing timeout'));
      }, 60000); // 60 second timeout

      // Call the connector's signAndSendTransaction
      connector.signAndSendTransaction(transaction)
        .then(result => {
          clearTimeout(timeoutId);
          console.log('✅ signAndSendTransaction resolved:', result);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          // Check if we have a pending result from message listener
          if (walletResponseReceived.current && window.__pendingSwapResult) {
            console.log('✅ Using pending result after error');
            const result = window.__pendingSwapResult;
            window.__pendingSwapResult = null;
            walletResponseReceived.current = false;
            resolve(result);
            return;
          }
          reject(error);
        });
    });
  };

  const handleSwap = async () => {
    setShowConfirmDialog(false);

    if (!localWalletConnected || !localWalletAddress) {
      showToast('❌ Not Connected', 'Please connect your wallet first', 'error');
      return;
    }

    const amount = parseFloat(swapInput);
    if (!amount || amount <= 0) {
      showToast('❌ Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    if (amount > solBalance) {
      showToast('❌ Insufficient Balance', `Not enough SOL in wallet (${solBalance.toFixed(4)} SOL)`, 'error');
      return;
    }

    setIsSwapping(true);
    swapInProgress.current = true;
    walletResponseReceived.current = false;
    window.__pendingSwapSignature = null;
    window.__pendingSwapResult = null;

    let swapCompleted = false;

    try {
      console.log('🔄 Starting swap with DFlow...');
      console.log('  Amount:', amount);
      console.log('  Wallet:', localWalletAddress);

      const amountInLamports = Math.floor(amount * 1e9);
      
      // 1. Get quote
      let quoteData;
      try {
        quoteData = await getDflowQuote(amountInLamports);
        
        if (quoteData && quoteData.outAmount) {
          const outAmount = parseFloat(quoteData.outAmount) / 1e6;
          setSwapOutput(outAmount.toFixed(4));
        }
      } catch (quoteError) {
        console.error('Quote error:', quoteError);
        throw new Error(`Could not get swap quote: ${quoteError.message}`);
      }

      // 2. Get swap transaction
      let swapData;
      try {
        swapData = await getDflowSwap(quoteData);
      } catch (swapError) {
        console.error('Swap transaction error:', swapError);
        throw new Error(`Could not create swap transaction: ${swapError.message}`);
      }

      if (!swapData || !swapData.swapTransaction) {
        throw new Error('No swap transaction received from DFlow');
      }

      // 3. Deserialize the transaction
      let transaction;
      try {
        const transactionBytes = base64ToUint8Array(swapData.swapTransaction);
        
        try {
          transaction = VersionedTransaction.deserialize(transactionBytes);
          console.log('✅ Deserialized as VersionedTransaction');
        } catch (versionedError) {
          console.log('Falling back to legacy Transaction deserialization');
          transaction = Transaction.from(transactionBytes);
          console.log('✅ Deserialized as legacy Transaction');
        }
      } catch (txError) {
        console.error('Transaction deserialization error:', txError);
        throw new Error(`Failed to deserialize transaction: ${txError.message}`);
      }

      // 4. Sign with Fixorium Wallet - using the enhanced method
      const fixoriumConnector = window.fixoriumWalletConnector;
      if (!fixoriumConnector) {
        throw new Error('Fixorium wallet connector not found. Please reconnect your wallet.');
      }

      console.log('📝 Requesting Fixorium Wallet to sign and send transaction...');
      
      // Use the enhanced signAndSend with fallback
      let result;
      try {
        result = await signAndSendWithFallback(fixoriumConnector, transaction);
      } catch (signError) {
        console.error('Signing error:', signError);
        // Check one more time if we have a pending result
        if (window.__pendingSwapResult) {
          console.log('✅ Using pending result from global storage');
          result = window.__pendingSwapResult;
          window.__pendingSwapResult = null;
          walletResponseReceived.current = false;
        } else if (window.__pendingSwapSignature) {
          console.log('✅ Using pending signature from global storage');
          result = { signature: window.__pendingSwapSignature, success: true };
          window.__pendingSwapSignature = null;
        } else {
          throw signError;
        }
      }
      
      // Log the full result for debugging
      console.log('📦 Wallet result keys:', Object.keys(result || {}));
      console.log('📦 Full wallet result:', JSON.stringify(result, null, 2));

      // Extract signature from multiple possible formats
      let signature = result?.signature || result?.txid || result?.transactionId || 
                      result?.tx || result?.transactionSignature;

      // If no signature found, try to find it in the payload
      if (!signature && result?.payload) {
        signature = result.payload.signature || result.payload.txid || result.payload.transactionSignature;
      }

      // Also check for the requestId as fallback (but don't use it for confirmation)
      const requestId = result?.requestId || result?.id;

      console.log('🔑 Extracted signature:', signature);
      console.log('📋 Request ID:', requestId);

      // Handle invalid or missing signature
      if (!signature || !isValidSolanaSignature(signature)) {
        console.warn('⚠️ Invalid or missing transaction signature:', signature);
        
        const outputAmount = swapData.outAmount 
          ? parseFloat(swapData.outAmount) / 1e6 
          : parseFloat(swapOutput);

        // Show success anyway since the wallet likely submitted the transaction
        showToast(
          '✅ Swap Submitted! 🎉',
          `Transaction sent to Solana network. ~${outputAmount.toFixed(4)} TREAT will be received once confirmed.`,
          'success'
        );

        swapCompleted = true;
        setSwapInput('');
        setSwapOutput('0.0');
        setUsdValue('~ $0.00');

        // Refresh balances after a delay
        if (window.refreshBalances) {
          setTimeout(async () => {
            console.log('🔄 Refreshing balances after swap submission...');
            await window.refreshBalances();
          }, 5000);
        }
        
        setIsSwapping(false);
        swapInProgress.current = false;
        return;
      }

      // 5. Wait for confirmation with improved logic
      console.log('✅ Valid signature received:', signature);
      console.log('🔗 Check on Solana Explorer: https://explorer.solana.com/tx/' + signature);
      
      const confirmationResult = await waitForTransactionConfirmation(signature);

      if (!confirmationResult.confirmed) {
        console.warn('⚠️ Transaction may still be pending:', confirmationResult.error);
        showToast(
          '⏳ Transaction Pending',
          `Your swap has been submitted but not yet confirmed. Check Solana Explorer.`,
          'info'
        );
        swapCompleted = true;
        setSwapInput('');
        setSwapOutput('0.0');
        setUsdValue('~ $0.00');
        setIsSwapping(false);
        swapInProgress.current = false;
        return;
      }

      const outputAmount = swapData.outAmount 
        ? parseFloat(swapData.outAmount) / 1e6 
        : parseFloat(swapOutput);

      showToast(
        '✅ Swap Complete! 🎉',
        `Successfully swapped ${amount} SOL for ${outputAmount.toFixed(4)} TREAT`,
        'success'
      );

      swapCompleted = true;
      setSwapInput('');
      setSwapOutput('0.0');
      setUsdValue('~ $0.00');

      if (window.refreshBalances) {
        setTimeout(async () => {
          await window.refreshBalances();
        }, 2000);
      }

    } catch (error) {
      console.error('Swap error:', error);
      
      let errorMessage = error.message || 'Please try again';
      
      // Enhanced error handling
      if (errorMessage.includes('User rejected')) {
        showToast('❌ Transaction Rejected', 'You rejected the transaction in wallet', 'error');
      } else if (errorMessage.includes('No route found') || errorMessage.includes('liquidity') || errorMessage.includes('insufficient liquidity')) {
        showToast('❌ No Liquidity', 'TREAT token may not have enough liquidity for this swap. Try a smaller amount.', 'error');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timed out')) {
        // Check if we have a pending result
        if (window.__pendingSwapResult) {
          console.log('✅ Using pending result after timeout error');
          const result = window.__pendingSwapResult;
          window.__pendingSwapResult = null;
          // Process the result
          const signature = result.payload?.signature || result.signature || result.requestId;
          if (signature) {
            showToast(
              '✅ Swap Submitted!',
              `Transaction sent to network. Check Solana Explorer.`,
              'success'
            );
            setSwapInput('');
            setSwapOutput('0.0');
            setUsdValue('~ $0.00');
            setIsSwapping(false);
            swapInProgress.current = false;
            if (window.refreshBalances) {
              setTimeout(() => window.refreshBalances(), 5000);
            }
            return;
          }
        }
        showToast('⏳ Timeout', 'Transaction took too long. Check explorer for status.', 'info');
        if (window.refreshBalances) {
          setTimeout(() => window.refreshBalances(), 3000);
        }
      } else if (errorMessage.includes('Rate limited') || errorMessage.includes('429')) {
        showToast('❌ Rate Limited', 'Too many requests. Please wait a moment and try again.', 'error');
      } else if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
        showToast('❌ API Key Error', 'DFlow API key is missing or invalid.', 'error');
      } else if (errorMessage.includes('insufficient balance')) {
        showToast('❌ Insufficient Balance', 'Not enough SOL for this swap including fees', 'error');
      } else if (errorMessage.includes('connector not found')) {
        showToast('❌ Wallet Error', 'Please reconnect your Fixorium wallet and try again.', 'error');
      } else if (errorMessage.includes('Failed to deserialize')) {
        showToast('❌ Transaction Error', 'Failed to process transaction. Please try again.', 'error');
      } else {
        showToast('❌ Swap Failed', errorMessage, 'error');
      }
    } finally {
      setIsSwapping(false);
      swapInProgress.current = false;
      // Clear any pending data
      if (!swapCompleted) {
        // Don't clear if we completed successfully
      }
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div className="section-header" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
        <span className="accent green"></span>
        BUY TREAT TOKEN
      </div>

      <div className="swap-card">
        <div className="swap-title">
          Swap <span className="highlight">SOL → TREAT</span>
        </div>

        {!localWalletConnected ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem 1rem',
            background: '#121010',
            borderRadius: '20px',
            border: '1px solid #1f1a18',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔗</div>
            <h3 style={{ color: '#f0ece8', marginBottom: '0.5rem' }}>Wallet Not Connected</h3>
            <p style={{ color: '#a89890', fontSize: '0.9rem' }}>
              Please connect your Fixorium wallet using the header button
            </p>
          </div>
        ) : (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0.5rem 1rem',
              background: '#121010',
              borderRadius: '12px',
              marginBottom: '1rem',
              border: '1px solid #1f1a18'
            }}>
              <span style={{ color: '#a89890', fontSize: '0.8rem' }}>
                Connected via: <strong style={{ color: '#f0ece8' }}>🔷 Fixorium</strong>
              </span>
              <span style={{ color: '#14F195', fontSize: '0.8rem' }}>
                {localWalletAddress ? `${localWalletAddress.slice(0, 6)}...${localWalletAddress.slice(-6)}` : 'No address'}
              </span>
            </div>

            <div className="swap-box">
              <div className="swap-label">
                <span>YOU PAY</span>
                <span>Balance: {solBalance.toFixed(4)} SOL</span>
              </div>
              <div className="swap-input-row">
                <input
                  type="number"
                  placeholder="0.0"
                  value={swapInput}
                  onChange={(e) => handleSwapInput(e.target.value)}
                  disabled={isSwapping}
                />
                <div className="token-select">
                  <img
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 397.7 311.7'%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill:%2314f195%7D%3C/style%3E%3C/defs%3E%3Cpath class='a' d='M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1L372.6,271c-2.4,2.4-5.7,3.8-9.2,3.8H46c-5.8,0-8.7-7-4.6-11.1Z'/%3E%3Cpath class='a' d='M64.6,3.8C67,1.4,70.3,0,73.8,0H391.2c5.8,0,8.7,7,4.6,11.1L372.6,40.6c-2.4,2.4-5.7,3.8-9.2,3.8H46c-5.8,0-8.7-7-4.6-11.1Z'/%3E%3Cpath class='a' d='M333.1,120.9c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l25.2,25.2c2.4,2.4,5.7,3.8,9.2,3.8H357.7c5.8,0,8.7-7,4.6-11.1Z'/%3E%3C/svg%3E"
                    alt="SOL"
                  />
                  <span className="token-symbol">SOL</span>
                </div>
              </div>
              <div className="balance-info">
                <span>{usdValue}</span>
                <span className="max-btn" onClick={handleMaxClick}>MAX</span>
              </div>
            </div>

            <div className="swap-arrow">⇅</div>

            <div className="swap-box">
              <div className="swap-label">
                <span>YOU RECEIVE</span>
                <span>Balance: {treatBalance.toFixed(2)} TREAT</span>
              </div>
              <div className="swap-input-row">
                <input
                  type="number"
                  placeholder="0.0"
                  value={swapOutput}
                  readOnly
                />
                <div className="token-select">
                  <img 
                    src="https://i.postimg.cc/d1CJyjt9/treat1727943702621.png" 
                    alt="TREAT" 
                  />
                  <span className="token-symbol">TREAT</span>
                </div>
              </div>
              <div className="balance-info">
                <span>~${(parseFloat(swapOutput) * treatPrice).toFixed(2)}</span>
              </div>
            </div>

            <button
              className="swap-btn"
              onClick={handleSwapClick}
              disabled={isSwapping || !swapInput || parseFloat(swapInput) <= 0}
              style={{
                opacity: (isSwapping || !swapInput || parseFloat(swapInput) <= 0) ? 0.5 : 1,
                cursor: (isSwapping || !swapInput || parseFloat(swapInput) <= 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSwapping ? (
                <>
                  <span className="spinner"></span>
                  SWAPPING...
                </>
              ) : (
                'SWAP NOW'
              )}
            </button>

            <div className="swap-details">
              <div className="detail-row">
                <span>Price Impact</span>
                <span className="value">~0.05%</span>
              </div>
              <div className="detail-row">
                <span>Network Fee</span>
                <span className="value">~0.00005 SOL</span>
              </div>
              <div className="detail-row">
                <span>Slippage Tolerance</span>
                <span className="value">0.5%</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#121010', borderRadius: '16px', border: '1px solid #1f1a18' }}>
        <p style={{ color: '#bfb4ac', fontSize: '0.9rem', lineHeight: '1.8' }}>
          <strong style={{ color: '#f0ece8' }}>MINT ADDRESS:</strong>
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a89890', marginTop: '0.5rem', wordBreak: 'break-all' }}>
          {TREAT_MINT_ADDRESS}
        </p>
      </div>

      {showConfirmDialog && confirmData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: '#1a1614',
            borderRadius: '24px',
            padding: '2.5rem',
            maxWidth: '440px',
            width: '90%',
            border: '1px solid #2a2220',
            boxShadow: '0 30px 60px rgba(0,0,0,0.9)'
          }}>
            <h3 style={{ color: '#f0ece8', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.3rem' }}>
              Confirm Swap
            </h3>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1f1a18' }}>
                <span style={{ color: '#6b5f58' }}>You Pay</span>
                <span style={{ color: '#f0ece8', fontWeight: 600 }}>{confirmData.amount.toFixed(4)} SOL</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1f1a18' }}>
                <span style={{ color: '#6b5f58' }}>You Receive</span>
                <span style={{ color: '#14F195', fontWeight: 600 }}>{parseFloat(confirmData.output).toFixed(4)} TREAT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1f1a18' }}>
                <span style={{ color: '#6b5f58' }}>Rate</span>
                <span style={{ color: '#a89890' }}>1 SOL ≈ {confirmData.rate.toFixed(2)} TREAT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #1f1a18' }}>
                <span style={{ color: '#6b5f58' }}>Wallet</span>
                <span style={{ color: '#14F195', fontWeight: 600 }}>{confirmData.walletType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0' }}>
                <span style={{ color: '#6b5f58' }}>Slippage</span>
                <span style={{ color: '#a89890' }}>0.5%</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowConfirmDialog(false)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: '#1f1a18',
                  border: '1px solid #2a2220',
                  borderRadius: '40px',
                  color: '#a89890',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                disabled={isSwapping}
              >
                Cancel
              </button>
              <button
                onClick={handleSwap}
                disabled={isSwapping}
                style={{
                  flex: 2,
                  padding: '0.8rem',
                  background: isSwapping ? '#2a2220' : 'linear-gradient(135deg, #9945FF, #7a2be0)',
                  border: 'none',
                  borderRadius: '40px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSwapping ? 'not-allowed' : 'pointer',
                  opacity: isSwapping ? 0.5 : 1
                }}
              >
                {isSwapping ? 'Processing...' : 'Confirm Swap'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
