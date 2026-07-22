// src/sections/Buy.jsx
import React, { useState, useEffect } from 'react';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { callRpc } from '../utils/rpc';

const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const FIXORIUM_WALLET_URL = 'https://wallet.fixorium.com.pk';

console.log('🔗 Buy.jsx using RPC proxy');

// ============================================================
// FIXORIUM WALLET CONNECTOR
// ============================================================

class FixoriumWalletConnector {
  constructor() {
    this.publicKey = null;
    this.isConnected = false;
    this.popupWindow = null;
    this.pendingRequests = new Map();
    this.setupMessageListener();
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.origin !== FIXORIUM_WALLET_URL && event.origin !== window.location.origin) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('📩 Fixorium Wallet message:', data);

        if (data.type === 'CONNECTION_APPROVED' || data.type === 'WALLET_CONNECTED') {
          const publicKey = data.payload?.publicKey || data.publicKey;
          if (publicKey) {
            this.publicKey = publicKey;
            this.isConnected = true;
            this.closePopup();
            if (this.onConnect) this.onConnect(publicKey);
          }
        }

        if (data.type === 'TRANSACTION_SIGNED' || data.type === 'TRANSACTION_APPROVED') {
          const signature = data.payload?.signature || data.signature;
          const requestId = data.requestId;
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            pending.resolve({ signature });
            this.pendingRequests.delete(requestId);
          }
          this.closePopup();
        }

        if (data.type === 'TRANSACTION_REJECTED') {
          const requestId = data.requestId;
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            pending.reject(new Error('Transaction rejected by user'));
            this.pendingRequests.delete(requestId);
          }
          this.closePopup();
        }

        if (data.type === 'CONNECTION_REJECTED') {
          this.isConnected = false;
          this.closePopup();
          if (this.onReject) this.onReject();
        }
      } catch (error) {
        // Not JSON
      }
    });
  }

  closePopup() {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
      this.popupWindow = null;
    }
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const requestId = 'conn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      this.onConnect = resolve;
      this.onReject = reject;

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('message', 'Connect to Fixorium Swap');
      params.append('appName', 'Fixorium Swap');
      params.append('appUrl', window.location.origin);
      params.append('callbackUrl', window.location.origin + '/callback');

      const webUrl = `${FIXORIUM_WALLET_URL}/sign?${params.toString()}`;

      console.log('🔗 Opening Fixorium Wallet...');

      try {
        this.popupWindow = window.open(
          webUrl,
          'FixoriumWallet',
          'width=420,height=750,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes'
        );
        if (this.popupWindow) {
          this.popupWindow.focus();
        } else {
          window.location.href = webUrl;
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet'));
      }

      setTimeout(() => {
        if (this.popupWindow && !this.popupWindow.closed) {
          this.popupWindow.close();
          this.popupWindow = null;
        }
        reject(new Error('Connection timeout'));
      }, 60000);
    });
  }

  async signAndSendTransaction(transaction) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.publicKey) {
        reject(new Error('Wallet not connected'));
        return;
      }

      const requestId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      this.pendingRequests.set(requestId, { resolve, reject });

      const serialized = transaction.serialize();
      const transactionBase64 = btoa(String.fromCharCode.apply(null, serialized));

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('transaction', transactionBase64);
      params.append('message', 'Sign Swap Transaction');
      params.append('appName', 'Fixorium Swap');
      params.append('appUrl', window.location.origin);
      params.append('callbackUrl', window.location.origin + '/callback');

      const webUrl = `${FIXORIUM_WALLET_URL}/sign?${params.toString()}`;

      console.log('✍️ Opening Fixorium Wallet for signing...');

      try {
        this.popupWindow = window.open(
          webUrl,
          'FixoriumWallet',
          'width=420,height=750,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes'
        );
        if (this.popupWindow) {
          this.popupWindow.focus();
        } else {
          window.location.href = webUrl;
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet for signing'));
        this.pendingRequests.delete(requestId);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          this.closePopup();
          reject(new Error('Transaction signing timeout'));
        }
      }, 60000);
    });
  }

  disconnect() {
    this.publicKey = null;
    this.isConnected = false;
    this.pendingRequests.clear();
    this.closePopup();
    localStorage.removeItem('fixorium_connection');
  }

  getWalletInfo() {
    return {
      publicKey: this.publicKey,
      isConnected: this.isConnected,
      platform: 'web'
    };
  }
}

// Create singleton instance
const fixoriumWallet = new FixoriumWalletConnector();

// ============================================================
// BUY COMPONENT
// ============================================================

export default function Buy({ 
  walletConnected, 
  walletAddress, 
  solBalance, 
  treatBalance, 
  treatPrice, 
  showToast,
  isLoading,
  onWalletChange // New prop for wallet change callback
}) {
  const [swapInput, setSwapInput] = useState('');
  const [swapOutput, setSwapOutput] = useState('0.0');
  const [usdValue, setUsdValue] = useState('~ $0.00');
  const [isSwapping, setIsSwapping] = useState(false);
  const [solPrice, setSolPrice] = useState(150);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [activeWallet, setActiveWallet] = useState(null); // 'phantom' or 'fixorium'

  useEffect(() => {
    fetchSolPrice();
    checkActiveWallet();
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom wallet change events
    window.addEventListener('walletChanged', handleWalletChangeEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('walletChanged', handleWalletChangeEvent);
    };
  }, []);

  const handleStorageChange = (e) => {
    if (e.key === 'fixorium_connection') {
      checkActiveWallet();
    }
  };

  const handleWalletChangeEvent = (e) => {
    const { walletType, address } = e.detail || {};
    if (walletType === 'fixorium' && address) {
      setActiveWallet('fixorium');
      if (onWalletChange) onWalletChange('fixorium', address);
    } else if (walletType === 'phantom' && address) {
      setActiveWallet('phantom');
      if (onWalletChange) onWalletChange('phantom', address);
    }
  };

  const checkActiveWallet = () => {
    // Check Fixorium first
    const stored = localStorage.getItem('fixorium_connection');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publicKey) {
          fixoriumWallet.publicKey = data.publicKey;
          fixoriumWallet.isConnected = true;
          setActiveWallet('fixorium');
          if (onWalletChange) onWalletChange('fixorium', data.publicKey);
          return;
        }
      } catch (e) {}
    }

    // Check Phantom
    if (walletConnected && walletAddress) {
      setActiveWallet('phantom');
      if (onWalletChange) onWalletChange('phantom', walletAddress);
      return;
    }

    setActiveWallet(null);
    if (onWalletChange) onWalletChange(null, null);
  };

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
    const isFixoriumConnected = fixoriumWallet.isConnected && fixoriumWallet.publicKey;
    const isPhantomConnected = walletConnected && walletAddress;

    if (!isPhantomConnected && !isFixoriumConnected) {
      showToast('❌ Not Connected', 'Please connect your wallet first', 'error');
      return;
    }

    const amount = parseFloat(swapInput);
    if (!amount || amount <= 0) {
      showToast('❌ Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    if (amount > solBalance) {
      showToast('❌ Insufficient Balance', 'Not enough SOL in wallet', 'error');
      return;
    }

    setConfirmData({
      amount: amount,
      output: swapOutput,
      rate: solPrice / treatPrice
    });
    setShowConfirmDialog(true);
  };

  // DFlow API call via Cloudflare proxy
  const callDflowApi = async (endpoint, method, data) => {
    const response = await fetch('/api/dflow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint: endpoint,
        method: method,
        data: data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return await response.json();
  };

  const getDflowQuote = async (amount) => {
    console.log('Fetching quote from DFlow via proxy...');
    console.log('From:', SOL_MINT);
    console.log('To:', TREAT_MINT_ADDRESS);
    console.log('Amount:', amount);
    
    const data = await callDflowApi('quote', 'GET', {
      inputMint: SOL_MINT,
      outputMint: TREAT_MINT_ADDRESS,
      amount: amount.toString(),
      slippageBps: '50',
    });

    console.log('✅ Quote received:', data);
    
    if (!data || !data.routePlan) {
      throw new Error('No quote received from DFlow');
    }

    return data;
  };

  const getDflowSwap = async (quoteData) => {
    const currentAddress = fixoriumWallet.publicKey || walletAddress;
    const data = await callDflowApi('swap', 'POST', {
      userPublicKey: currentAddress,
      quoteResponse: quoteData,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 150000,
    });

    console.log('✅ Swap transaction received');
    return data;
  };

  // Helper function to convert base64 to Uint8Array
  const base64ToUint8Array = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const handleSwap = async () => {
    setShowConfirmDialog(false);

    const isFixoriumConnected = fixoriumWallet.isConnected && fixoriumWallet.publicKey;
    const isPhantomConnected = walletConnected && walletAddress;
    const currentAddress = fixoriumWallet.publicKey || walletAddress;

    if (!currentAddress) {
      showToast('❌ Not Connected', 'Please connect your wallet first', 'error');
      return;
    }

    const amount = parseFloat(swapInput);
    if (!amount || amount <= 0) {
      showToast('❌ Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    if (amount > solBalance) {
      showToast('❌ Insufficient Balance', 'Not enough SOL in wallet', 'error');
      return;
    }

    setIsSwapping(true);
    try {
      const hasPhantom = !!window.phantom?.solana;
      const usePhantom = isPhantomConnected && hasPhantom && !isFixoriumConnected;

      console.log('🔄 Starting swap with DFlow...');
      console.log('Amount:', amount);
      console.log('Wallet:', currentAddress);
      console.log('Wallet Type:', isFixoriumConnected ? 'Fixorium' : 'Phantom');

      // Convert SOL to lamports (1 SOL = 1e9 lamports)
      const amountInLamports = Math.floor(amount * 1e9);
      
      // 1. Get quote from DFlow
      let quoteData;
      try {
        quoteData = await getDflowQuote(amountInLamports);
        console.log('📊 Quote received:', quoteData);
        
        if (quoteData && quoteData.outAmount) {
          const outAmount = parseFloat(quoteData.outAmount) / 1e6;
          setSwapOutput(outAmount.toFixed(4));
        }
      } catch (quoteError) {
        console.error('Quote error:', quoteError);
        throw new Error(`Could not get swap quote: ${quoteError.message}`);
      }

      // 2. Get swap transaction from DFlow
      let swapData;
      try {
        swapData = await getDflowSwap(quoteData);
        console.log('📝 Swap transaction received');
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

      let signature;

      // 4. Send transaction with appropriate wallet
      if (usePhantom) {
        console.log('📝 Requesting Phantom to sign and send transaction...');
        try {
          const result = await window.phantom.solana.signAndSendTransaction(transaction);
          signature = result.signature;
        } catch (phantomError) {
          console.error('Phantom error:', phantomError);
          if (phantomError.code === 4001 || phantomError.message?.includes('User rejected')) {
            throw new Error('User rejected the transaction');
          }
          throw new Error(`Failed to send transaction: ${phantomError.message}`);
        }
      } else if (isFixoriumConnected) {
        console.log('📝 Requesting Fixorium Wallet to sign and send transaction...');
        try {
          const result = await fixoriumWallet.signAndSendTransaction(transaction);
          signature = result.signature;
        } catch (fixoriumError) {
          console.error('Fixorium error:', fixoriumError);
          throw new Error(`Failed to send transaction with Fixorium Wallet: ${fixoriumError.message}`);
        }
      } else {
        throw new Error('No wallet available to sign transaction');
      }

      console.log('✅ Transaction sent! Signature:', signature);

      // 5. Wait for confirmation using RPC proxy
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 30;

      while (!confirmed && attempts < maxAttempts) {
        try {
          const status = await callRpc('getSignatureStatuses', [[signature]]);
          if (status.value && status.value[0]) {
            const txStatus = status.value[0];
            if (txStatus.confirmationStatus === 'confirmed' || txStatus.confirmationStatus === 'finalized') {
              confirmed = true;
              console.log('✅ Transaction confirmed:', txStatus);
            } else if (txStatus.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(txStatus.err)}`);
            }
          }
        } catch (e) {
          console.warn(`Confirmation check attempt ${attempts + 1}:`, e.message);
        }

        if (!confirmed) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
      }

      if (!confirmed) {
        throw new Error('Transaction confirmation timeout. Check explorer for status.');
      }

      const outputAmount = swapData.outAmount 
        ? parseFloat(swapData.outAmount) / 1e6 
        : parseFloat(swapOutput);

      showToast(
        '✅ Swap Complete! 🎉',
        `Successfully swapped ${amount} SOL for ${outputAmount.toFixed(4)} TREAT`,
        'success'
      );

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
      
      if (errorMessage.includes('User rejected')) {
        showToast('❌ Transaction Rejected', 'You rejected the transaction in wallet', 'error');
      } else if (errorMessage.includes('No route found') || errorMessage.includes('liquidity') || errorMessage.includes('insufficient liquidity')) {
        showToast('❌ No Liquidity', 'TREAT token may not have enough liquidity for this swap. Try a smaller amount.', 'error');
      } else if (errorMessage.includes('timeout')) {
        showToast('❌ Timeout', 'Transaction took too long. Check explorer for status.', 'error');
      } else if (errorMessage.includes('Rate limited') || errorMessage.includes('429')) {
        showToast('❌ Rate Limited', 'Too many requests. Please wait a moment and try again.', 'error');
      } else if (errorMessage.includes('API key') || errorMessage.includes('not configured')) {
        showToast('❌ API Key Error', 'DFlow API key is missing or invalid. Please check environment variables.', 'error');
      } else if (errorMessage.includes('insufficient balance')) {
        showToast('❌ Insufficient Balance', 'Not enough SOL for this swap including fees', 'error');
      } else {
        showToast('❌ Swap Failed', errorMessage, 'error');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  // Determine which wallet is connected
  const isFixoriumConnected = fixoriumWallet.isConnected && fixoriumWallet.publicKey;
  const isPhantomConnected = walletConnected && walletAddress;
  const isWalletConnected = isPhantomConnected || isFixoriumConnected;
  const displayAddress = fixoriumWallet.publicKey || walletAddress || '';
  const displayWalletType = isFixoriumConnected ? 'fixorium' : (isPhantomConnected ? 'phantom' : null);
  const displayWalletIcon = isFixoriumConnected ? '🔷' : '🟣';
  const displayWalletName = isFixoriumConnected ? 'Fixorium' : 'Phantom';

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

        {!isWalletConnected ? (
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
              Please connect your wallet using the header button
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
                Connected via: <strong style={{ color: '#f0ece8' }}>
                  {displayWalletIcon} {displayWalletName}
                </strong>
              </span>
              <span style={{ color: '#14F195', fontSize: '0.8rem' }}>
                {displayAddress.slice(0, 6)}...{displayAddress.slice(-6)}
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
              >
                Cancel
              </button>
              <button
                onClick={handleSwap}
                style={{
                  flex: 2,
                  padding: '0.8rem',
                  background: 'linear-gradient(135deg, #9945FF, #7a2be0)',
                  border: 'none',
                  borderRadius: '40px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
