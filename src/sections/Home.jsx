import React, { useState, useEffect } from 'react';

export default function Home({ treatPrice, fetchPriceData }) {
  const [priceChange, setPriceChange] = useState(0);
  const [treatSolPrice, setTreatSolPrice] = useState(0);
  const [marketCap, setMarketCap] = useState(0);

  useEffect(() => {
    updatePriceData();
  }, [treatPrice]);

  const updatePriceData = async () => {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump');
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          setPriceChange(pair.priceChange?.h24 || 0);
          
          const solPrice = await fetchSolPrice();
          const treatSol = solPrice > 0 ? treatPrice / solPrice : 0.0001;
          setTreatSolPrice(treatSol);
          
          const mc = treatPrice * 500000000;
          setMarketCap(mc);
        }
      }
    } catch (error) {
      console.error('Error updating price data:', error);
    }
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

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="logo-wrapper">
            <img src="https://i.postimg.cc/d1CJyjt9/treat1727943702621.png" alt="TREAT Token Logo" />
          </div>
          <div className="hero-text">
            <h1>TREAT TOKEN</h1>
            <div className="sub">
              <span>$TREAT</span>
              <span className="badge">SPL TOKEN</span>
              <span className="badge purple">SOLANA</span>
              <span className="badge orange">50% BURN</span>
            </div>
            <div className="tagline">
              <strong>COMMUNITY-DRIVEN TOKEN ON SOLANA</strong> — 50% OF SUPPLY BURNED OVER 1 YEAR TO CREATE SCARCITY AND LONG-TERM VALUE.
            </div>
          </div>
        </div>
      </section>

      <div className="price-ticker">
        <div className="price-item">
          <span>TREAT/USD</span>
          <span className="price-value">${treatPrice.toFixed(6)}</span>
          <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        <div className="price-item">
          <span>TREAT/SOL</span>
          <span className="price-value">{treatSolPrice.toFixed(6)} SOL</span>
        </div>
        <div className="price-item">
          <span>Market Cap</span>
          <span className="price-value">${marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      <div className="burn-highlight">
        <div className="burn-flex">
          <div>
            <div className="burn-number">50%</div>
            <div className="burn-label">BURN TARGET OVER 1 YEAR</div>
          </div>
          <div>
            <div className="burn-desc">
              <strong>500,000,000 TREAT</strong> (50% OF MAX SUPPLY) WILL BE PERMANENTLY BURNED OVER A PERIOD OF <strong>1 YEAR</strong> FROM LAUNCH. THIS DEFLATIONARY MECHANISM REDUCES TOTAL SUPPLY FROM 1 BILLION TO <strong>500 MILLION</strong> CIRCULATING TOKENS, CREATING SUSTAINABLE SCARCITY AND VALUE APPRECIATION POTENTIAL.
            </div>
          </div>
        </div>
      </div>

      <div className="banner-sep">
        <p>25% REWARD . 250 MILLION CIRCULATING TOKEN DISTRIBUTION</p>
        <div className="sub-text">250 MILLION TOKENS WILL BE DISTRIBUTED IN 1 YEAR RANDOMLY TO GIVE BETTER REWARD TO TREAT HOLDERS - BEST REWARD FOR COMMUNITY</div>
      </div>
    </>
  );
}
