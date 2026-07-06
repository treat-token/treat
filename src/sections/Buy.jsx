import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
const RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

export default function Buy({ 
  walletConnected, 
  walletAddress, 
  solBalance, 
  treatBalance, 
  treatPrice, 
  showToast 
}) {
  const [swapInput, setSwapInput] = useState('');
  const [swapOutput, setSwapOutput] = useState('0.0');
  const [usdValue, setUsdValue] = useState('~ $0.00');
  const [isSwapping, setIsSwapping] = useState(false);
  const [solPrice, setSolPrice] = useState(150);

  // Fetch SOL price on mount
  useEffect(() => {
    fetchSolPrice();
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

    // Calculate output based on treat price
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

  const handleSwap = async () => {
    if (!walletConnected) {
      showToast('❌ Not Connected', 'Please connect your wallet using the header button', 'error');
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

    if (amount > solBalance) {
      showToast('❌ Insufficient Balance', 'Not enough SOL in wallet', 'error');
      return;
    }

    setIsSwapping(true);
    try {
      const phantom = window.phantom.solana;
      const connection = new Connection(RPC_ENDPOINT, 'confirmed');

      // 1. Get swap quote from Dflow via backend
      const quoteResponse = await fetch('/api/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/quote',
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: TREAT_MINT_ADDRESS,
          amount: Math.floor(amount * 1e9),
          slippageBps: 50,
        }),
      });

      if (!quoteResponse.ok) {
        const errorData = await quoteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Quote API error: ${quoteResponse.statusText}`);
      }

      const quoteData = await quoteResponse.json();
      
      if (quoteData.error) {
        throw new Error(quoteData.error);
      }

      // 2. Get swap transaction from Dflow via backend
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
        const errorData = await swapResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Swap API error: ${swapResponse.statusText}`);
      }

      const swapData = await swapResponse.json();
      
      if (swapData.error) {
        throw new Error(swapData.error);
      }

      // 3. Deserialize and send transaction
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // 4. Sign and send transaction using Phantom wallet
      const signedTx = await phantom.signAndSendTransaction(transaction);

      showToast('✅ Swap Initiated', `Transaction: ${signedTx.signature.slice(0, 8)}...`, 'success');
      setSwapInput('');
      setSwapOutput('0.0');
      setUsdValue('~ $0.00');
      
      // Refresh balances after swap
      if (window.refreshBalances) {
        window.refreshBalances();
      }
    } catch (error) {
      console.error('Swap error:', error);
      showToast('❌ Swap Failed', error.message || 'Please try again', 'error');
    } finally {
      setIsSwapping(false);
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

        {!walletConnected ? (
          // Show "Connect Wallet" message when not connected
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
              Please connect your Phantom wallet using the button in the top right corner
            </p>
            <div style={{ 
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#1f1a18',
              borderRadius: '8px',
              display: 'inline-block',
              fontSize: '0.75rem',
              color: '#6b5f58'
            }}>
              Click "BUY TREAT" in header to navigate here after connecting
            </div>
          </div>
        ) : (
          // Show swap interface when connected
          <>
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
                    src="https://upload.wikimedia.org/wikipedia/commons/9/92/Solana_logo.png" 
                    alt="SOL" 
                  />
                  <span className="token-symbol">SOL</span>
                  <span className="arrow-down">▼</span>
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
    </div>
  );
}
