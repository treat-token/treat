import React, { useState } from 'react';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export default function Buy({ walletConnected, walletAddress, solBalance, treatBalance, treatPrice, showToast, onConnect, onDisconnect }) {
  const [swapInput, setSwapInput] = useState('');
  const [swapOutput, setSwapOutput] = useState('0.0');
  const [usdValue, setUsdValue] = useState('~ $0.00');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwapInput = async (value) => {
    setSwapInput(value);
    if (!value || isNaN(value) || parseFloat(value) <= 0) {
      setSwapOutput('0.0');
      setUsdValue('~ $0.00');
      return;
    }

    try {
      const solPrice = await fetchSolPrice();
      const usd = parseFloat(value) * solPrice;
      setUsdValue(`~ $${usd.toFixed(2)}`);
    } catch (error) {
      console.error('Price calculation error:', error);
    }
  };

  const handleMaxClick = () => {
    setSwapInput(solBalance.toFixed(4));
    handleSwapInput(solBalance.toFixed(4));
  };

  const fetchSolPrice = async () => {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=SOL');
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs.find(p => p.baseToken?.symbol === 'SOL');
          if (pair?.priceUsd) {
            return parseFloat(pair.priceUsd);
          }
        }
      }
    } catch (error) {
      console.warn('SOL price fetch error:', error);
    }
    return 150;
  };

  const handleSwap = async () => {
    if (!walletConnected) {
      showToast('❌ Not Connected', 'Please connect your wallet first', 'error');
      return;
    }

    if (!window.phantom?.solana) {
      showToast('❌ Phantom Not Found', 'Phantom wallet is not installed', 'error');
      return;
    }

    const amount = parseFloat(swapInput);
    if (!amount || amount <= 0) {
      showToast('❌ Invalid Amount', 'Please enter a valid amount', 'error');
      return;
    }

    setIsSwapping(true);
    try {
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');
      const phantom = window.phantom.solana;
      const userPublicKey = new PublicKey(walletAddress);

      // Get swap quote from Jupiter API via backend
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/swap/quote',
          inputMint: 'So11111111111111111111111111111111111111112',
          outputMint: TREAT_MINT_ADDRESS,
          amount: Math.floor(amount * 1e9),
          slippageBps: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Quote API error: ${response.statusText}`);
      }

      const quoteData = await response.json();

      // Get swap instruction from Jupiter API via backend
      const swapResponse = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/swap',
          quoteResponse: quoteData,
          userPublicKey: walletAddress,
          wrapAndUnwrapSol: true,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error(`Swap API error: ${swapResponse.statusText}`);
      }

      const swapData = await swapResponse.json();
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign and send transaction using Phantom wallet
      const signedTx = await phantom.signAndSendTransaction(transaction);

      showToast('✅ Swap Initiated', `Transaction: ${signedTx.signature.slice(0, 8)}...`, 'success');
      setSwapInput('');
      setSwapOutput('0.0');
      setUsdValue('~ $0.00');
    } catch (error) {
      console.error('Swap error:', error);
      showToast('❌ Swap Failed', error.message || 'Please try again', 'error');
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div className="buy-header">
        <div className="section-header" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <span className="accent green"></span>
          BUY TREAT TOKEN
        </div>
        <div className="wallet-controls">
          {walletConnected ? (
            <>
              <span className="wallet-status">Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}</span>
              <button className="disconnect-btn" onClick={onDisconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="connect-wallet-btn" onClick={onConnect}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div className="swap-card">
        <div className="swap-title">
          Swap <span className="highlight">SOL → TREAT</span>
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
              disabled={!walletConnected}
            />
            <div className="token-select">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/9/92/Solana_logo.png" 
                alt="SOL" 
              />
              <span className="token-symbol">SOL</span>
              <span className="arrow-down">▼</span>
            </div>
          </div>
          <div className="balance-info">
            <span>{usdValue}</span>
            {walletConnected && (
              <span className="max-btn" onClick={handleMaxClick}>MAX</span>
            )}
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
              <span className="arrow-down">▼</span>
            </div>
          </div>
          <div className="balance-info">
            <span>~${(parseFloat(swapOutput) * treatPrice).toFixed(2)}</span>
          </div>
        </div>

        <button
          className="swap-btn"
          onClick={handleSwap}
          disabled={isSwapping || !swapInput || !walletConnected}
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
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#121010', borderRadius: '16px', border: '1px solid #1f1a18' }}>
        <p style={{ color: '#bfb4ac', fontSize: '0.9rem', lineHeight: '1.8' }}>
          <strong style={{ color: '#f0ece8' }}>MINT ADDRESS:</strong>
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#a89890', marginTop: '0.5rem', wordBreak: 'break-all' }}>
          {TREAT_MINT_ADDRESS}
        </p>
      </div>
    </div>
  );
}
