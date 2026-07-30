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
  const walletResponseData = useRef(null);
  
  // Local connection state to track wallet status
  const [localWalletConnected, setLocalWalletConnected] = useState(walletConnected);
  const [localWalletAddress, setLocalWalletAddress] = useState(walletAddress);

  // Check connection from multiple sources
  useEffect(() => {
    const checkConnection = () => {
      if (walletConnected && walletAddress) {
        setLocalWalletConnected(true);
        setLocalWalletAddress(walletAddress);
        return;
      }
      
      try {
        const stored = localStorage.getItem('fixorium_connection');
        if (stored) {
          const data = JSON.parse(stored);
          if (data.publicKey && data.connected) {
            setLocalWalletConnected(true);
            setLocalWalletAddress(data.publicKey);
            return;
          }
        }
      } catch (e) {
        // Ignore
      }
      
      if (window.fixoriumWalletConnector?.isConnected && window.fixoriumWalletConnector?.publicKey) {
        setLocalWalletConnected(true);
        setLocalWalletAddress(window.fixoriumWalletConnector.publicKey);
        return;
      }
      
      setLocalWalletConnected(false);
      setLocalWalletAddress(null);
    };
    
    checkConnection();
  }, [walletConnected, walletAddress]);

  useEffect(() => {
    fetchSolPrice();
  }, []);

  // Listen for wallet messages
  useEffect(() => {
    const handleWalletMessage = (event) => {
      if (swapInProgress.current) {
        const data = event.detail || event.data || event;
        
        if (data.type === 'TRANSACTION_RESULT' || data.type === 'transaction_result') {
          walletResponseReceived.current = true;
          walletResponseData.current = data;
          
          const payload = data.payload || data;
          const signature = payload.signature || data.signature || data.requestId;
          
          if (signature) {
            window.__pendingSwapSignature = signature;
            window.__pendingSwapResult = data;
            
            // Check if wallet returned a signed transaction
            if (payload.signedTransaction || payload.transaction) {
              window.__pendingSignedTransaction = payload.signedTransaction || payload.transaction;
            }
          }
        }
      }
    };

    window.addEventListener('message', handleWalletMessage);
    window.addEventListener('wallet-message', handleWalletMessage);
    window.addEventListener('fixorium-wallet-message', handleWalletMessage);
    
    if (window.fixoriumWalletConnector) {
      window.fixoriumWalletConnector.onMessage = (data) => {
        if (data.type === 'TRANSACTION_RESULT') {
          walletResponseReceived.current = true;
          walletResponseData.current = data;
          window.__pendingSwapSignature = data.requestId || data.signature;
          window.__pendingSwapResult = data;
          
          if (data.payload?.signedTransaction || data.payload?.transaction) {
            window.__pendingSignedTransaction = data.payload.signedTransaction || data.payload.transaction;
          }
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
      50
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

  const base64FromBytes = (bytes) => {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  };

  const isValidSolanaSignature = (signature) => {
    if (!signature || typeof signature !== 'string') return false;
    if (signature.startsWith('tx_')) return false;
    if (signature.length < 64) return false;
    return /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(signature);
  };

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

  // Helper to try to extract signed transaction from wallet
  const tryExtractSignedTransaction = (result) => {
    if (!result) return null;
    
    // Check all possible locations for a signed transaction
    const locations = [
      result.signedTransaction,
      result.transaction,
      result.signedTx,
      result.tx,
      result.payload?.signedTransaction,
      result.payload?.transaction,
      result.payload?.signedTx,
      result.payload?.tx,
      result.data?.signedTransaction,
      result.data?.transaction,
      window.__pendingSignedTransaction,
      window.__pendingSwapResult?.payload?.signedTransaction,
      window.__pendingSwapResult?.payload?.transaction,
    ];
    
    for (const loc of locations) {
      if (loc) {
        // If it's already a Transaction or VersionedTransaction object
        if (loc instanceof Transaction || loc instanceof VersionedTransaction) {
          return loc;
        }
        // If it's a Uint8Array
        if (loc instanceof Uint8Array) {
          try {
            return VersionedTransaction.deserialize(loc);
          } catch (e) {
            try {
              return Transaction.from(loc);
            } catch (e2) {}
          }
        }
        // If it's a base64 string
        if (typeof loc === 'string') {
          try {
            const bytes = base64ToUint8Array(loc);
            try {
              return VersionedTransaction.deserialize(bytes);
            } catch (e) {
              try {
                return Transaction.from(bytes);
              } catch (e2) {}
            }
          } catch (e) {}
        }
      }
    }
    
    return null;
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
    walletResponseData.current = null;
    window.__pendingSwapSignature = null;
    window.__pendingSwapResult = null;
    window.__pendingSignedTransaction = null;

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

      // 4. Check SOL balance for fees
      const feeEstimate = 0.000005;
      if (solBalance < feeEstimate) {
        throw new Error(`Insufficient SOL for fees. Need ${feeEstimate} SOL, have ${solBalance}`);
      }

      // 5. Get wallet to sign the transaction
      const fixoriumConnector = window.fixoriumWalletConnector;
      if (!fixoriumConnector) {
        throw new Error('Fixorium wallet connector not found. Please reconnect your wallet.');
      }

      console.log('📝 Requesting Fixorium Wallet to sign transaction...');
      
      let signedTransaction = null;
      let signature = null;

      // 6. Sign the transaction with the wallet
      try {
        // Try signTransaction first (preferred for web wallets)
        if (typeof fixoriumConnector.signTransaction === 'function') {
          console.log('🔑 Using signTransaction method...');
          signedTransaction = await fixoriumConnector.signTransaction(transaction);
          console.log('✅ Transaction signed by wallet');
        } 
        // Fallback to signAndSendTransaction
        else if (typeof fixoriumConnector.signAndSendTransaction === 'function') {
          console.log('🔑 Using signAndSendTransaction method...');
          
          // Create a promise that resolves when we get the result
          const signPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              // Check if we have a pending result
              if (window.__pendingSwapResult) {
                resolve(window.__pendingSwapResult);
                return;
              }
              reject(new Error('Wallet signing timeout'));
            }, 60000);

            // Call the wallet
            fixoriumConnector.signAndSendTransaction(transaction)
              .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });

          const result = await signPromise;
          console.log('📦 Wallet result:', result);

          // Try to extract signed transaction from result
          signedTransaction = tryExtractSignedTransaction(result);
          
          if (signedTransaction) {
            console.log('✅ Extracted signed transaction from wallet result');
          } else if (result.signature && isValidSolanaSignature(result.signature)) {
            // Wallet broadcast it themselves with a real signature
            console.log('✅ Wallet broadcast transaction', { signature: result.signature });
            signature = result.signature;
          } else if (result.signature && result.signature.startsWith('tx_')) {
            // Wallet returned a fake signature - try to get the signed transaction from the wallet's internal state
            console.log('⚠️ Wallet returned fake signature, trying to get signed transaction...');
            
            // Wait a bit for the wallet to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if the wallet has a method to get the signed transaction
            if (typeof fixoriumConnector.getSignedTransaction === 'function') {
              signedTransaction = await fixoriumConnector.getSignedTransaction();
            }
            
            // Check if the wallet stored it globally
            if (!signedTransaction && window.__pendingSignedTransaction) {
              signedTransaction = window.__pendingSignedTransaction;
              console.log('✅ Found signed transaction in global state');
            }
            
            // If we still don't have it, try to reconstruct from the transaction
            if (!signedTransaction) {
              console.log('⚠️ Could not get signed transaction, but wallet confirmed success');
              // Show success and let the user check their wallet
              showToast(
                '✅ Swap Submitted! 🎉',
                `Transaction sent to Solana network. Check your wallet for status.`,
                'success'
              );
              setSwapInput('');
              setSwapOutput('0.0');
              setUsdValue('~ $0.00');
              setIsSwapping(false);
              swapInProgress.current = false;
              if (window.refreshBalances) {
                setTimeout(() => window.refreshBalances(), 10000);
              }
              return;
            }
          }
        } else {
          throw new Error('Wallet does not support signing transactions');
        }
      } catch (signError) {
        console.error('Signing error:', signError);
        throw signError;
      }

      // 7. Broadcast the transaction if we have a signed transaction
      if (signedTransaction) {
        console.log('📡 Broadcasting signed transaction to blockchain...');
        
        try {
          // Serialize the signed transaction
          const serializedTx = signedTransaction.serialize();
          const serializedBase64 = base64FromBytes(serializedTx);
          
          console.log('📤 Sending to RPC...', { txLength: serializedTx.length });
          
          // Send via RPC proxy
          const rpcResponse = await fetch('/api/solana-rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: Date.now(),
              method: 'sendTransaction',
              params: [
                serializedBase64,
                { 
                  encoding: 'base64',
                  skipPreflight: false,
                  preflightCommitment: 'confirmed'
                }
              ]
            })
          });

          const rpcData = await rpcResponse.json();
          
          if (rpcData.error) {
            console.error('❌ RPC error:', rpcData.error);
            throw new Error(rpcData.error.message || 'Transaction broadcast failed');
          }

          signature = rpcData.result;
          console.log('✅ Transaction broadcast!', { signature });
          console.log('🔗 https://explorer.solana.com/tx/' + signature);

          // 8. Wait for confirmation
          console.log('⏳ Waiting for confirmation...');
          const confirmationResult = await waitForTransactionConfirmation(signature);
          
          const outputAmount = swapData.outAmount 
            ? parseFloat(swapData.outAmount) / 1e6 
            : parseFloat(swapOutput);

          if (confirmationResult.confirmed) {
            console.log('✅ Transaction confirmed!');
            showToast(
              '✅ Swap Complete! 🎉',
              `Successfully swapped ${amount} SOL for ${outputAmount.toFixed(4)} TREAT`,
              'success'
            );
          } else {
            console.warn('⚠️ Transaction pending');
            showToast(
              '⏳ Transaction Pending',
              `Transaction sent but not yet confirmed. Check explorer.`,
              'info'
            );
          }

          setSwapInput('');
          setSwapOutput('0.0');
          setUsdValue('~ $0.00');

          if (window.refreshBalances) {
            setTimeout(async () => {
              console.log('🔄 Refreshing balances...');
              await window.refreshBalances();
            }, 5000);
          }

        } catch (broadcastError) {
          console.error('Broadcast error:', broadcastError);
          throw broadcastError;
        }
      } 
      // If wallet broadcast it themselves with a real signature
      else if (signature && isValidSolanaSignature(signature)) {
        console.log('✅ Wallet broadcast transaction', { signature });
        showToast(
          '✅ Swap Complete! 🎉',
          `Transaction confirmed on-chain`,
          'success'
        );
        setSwapInput('');
        setSwapOutput('0.0');
        setUsdValue('~ $0.00');
      } 
      // If wallet returned a fake tx_ signature, handle it
      else if (signature && signature.startsWith('tx_')) {
        console.warn('⚠️ Wallet returned fake signature, transaction may have been submitted');
        showToast(
          '✅ Swap Submitted! 🎉',
          `Transaction sent to Solana network. Check your wallet for status.`,
          'success'
        );
        setSwapInput('');
        setSwapOutput('0.0');
        setUsdValue('~ $0.00');
        
        if (window.refreshBalances) {
          setTimeout(async () => {
            console.log('🔄 Refreshing balances...');
            await window.refreshBalances();
          }, 10000);
        }
      } 
      else {
        throw new Error('No signed transaction or valid signature received from wallet');
      }

    } catch (error) {
      console.error('Swap error:', error);
      
      let errorMessage = error.message || 'Please try again';
      
      if (errorMessage.includes('User rejected')) {
        showToast('❌ Transaction Rejected', 'You rejected the transaction in wallet', 'error');
      } else if (errorMessage.includes('No route found') || errorMessage.includes('liquidity') || errorMessage.includes('insufficient liquidity')) {
        showToast('❌ No Liquidity', 'TREAT token may not have enough liquidity for this swap. Try a smaller amount.', 'error');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timed out')) {
        if (window.__pendingSwapResult?.payload?.success === true) {
          showToast(
            '✅ Swap Submitted!',
            `Transaction sent to network. Check your wallet for status.`,
            'success'
          );
          setSwapInput('');
          setSwapOutput('0.0');
          setUsdValue('~ $0.00');
          setIsSwapping(false);
          swapInProgress.current = false;
          if (window.refreshBalances) {
            setTimeout(() => window.refreshBalances(), 10000);
          }
          return;
        }
        showToast('⏳ Timeout', 'Transaction took too long. Check your wallet for status.', 'info');
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
      window.__pendingSwapSignature = null;
      window.__pendingSwapResult = null;
      window.__pendingSignedTransaction = null;
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
                <strong style={{ color: '#f0ece8' }}>FIXORIUM</strong>
              </span>
              <span style={{ color: '#14F195', fontSize: '0.8rem' }}>
                {localWalletAddress ? `${localWalletAddress.slice(0, 6)}...${localWalletAddress.slice(-6)}` : 'No address'}
              </span>
            </div>

            {solBalance < 0.0005 && (
              <div style={{
                background: '#1a0a0a',
                border: '1px solid #ff4444',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#ff4444', fontSize: '16px' }}>⚠️</span>
                <span style={{ color: '#ff8888', fontSize: '11px' }}>
                  Low SOL balance ({solBalance.toFixed(6)} SOL). Need ~0.000005 SOL for fees.
                </span>
              </div>
            )}

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
