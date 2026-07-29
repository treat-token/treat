// src/components/Home.jsx - White Theme
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

      <style>{`
        /* ============================================================
           WHITE THEME STYLES
           ============================================================ */
        
        /* Hero Section */
        .hero {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          padding: 60px 20px 40px;
          border-radius: 24px;
          margin-bottom: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }

        .hero-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 40px;
          max-width: 900px;
          margin: 0 auto;
          flex-wrap: wrap;
        }

        .logo-wrapper {
          flex-shrink: 0;
        }

        .logo-wrapper img {
          width: 120px;
          height: 120px;
          border-radius: 24px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          background: #ffffff;
          padding: 8px;
        }

        .hero-text {
          text-align: left;
        }

        .hero-text h1 {
          font-size: 2.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #1e293b, #334155);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }

        .sub {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }

        .sub span {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .badge.purple {
          background: #eef2ff;
          color: #4f46e5;
        }

        .badge.orange {
          background: #fffbeb;
          color: #d97706;
        }

        .badge:not(.purple):not(.orange) {
          background: #f1f5f9;
          color: #475569;
        }

        .tagline {
          font-size: 14px;
          color: #475569;
          line-height: 1.6;
          max-width: 500px;
        }

        .tagline strong {
          color: #1e293b;
        }

        /* Price Ticker */
        .price-ticker {
          display: flex;
          justify-content: center;
          gap: 32px;
          padding: 16px 20px;
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          margin-bottom: 24px;
          flex-wrap: wrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .price-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #475569;
        }

        .price-item span:first-child {
          font-weight: 500;
          color: #64748b;
        }

        .price-value {
          font-weight: 700;
          color: #0f172a;
          font-size: 15px;
        }

        .price-change {
          font-weight: 600;
          font-size: 13px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .price-change.positive {
          color: #16a34a;
          background: #dcfce7;
        }

        .price-change.negative {
          color: #dc2626;
          background: #fee2e2;
        }

        /* Burn Highlight */
        .burn-highlight {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          padding: 28px 32px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .burn-flex {
          display: flex;
          gap: 32px;
          align-items: center;
          flex-wrap: wrap;
        }

        .burn-number {
          font-size: 4rem;
          font-weight: 900;
          color: #dc2626;
          line-height: 1;
        }

        .burn-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .burn-desc {
          font-size: 14px;
          line-height: 1.8;
          color: #475569;
        }

        .burn-desc strong {
          color: #0f172a;
          font-weight: 700;
        }

        /* Banner Separator */
        .banner-sep {
          background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
          border-radius: 16px;
          padding: 24px 32px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .banner-sep p {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: 0.5px;
        }

        .sub-text {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          max-width: 600px;
          margin: 0 auto;
        }

        /* ============================================================
           RESPONSIVE
           ============================================================ */
        @media (max-width: 768px) {
          .hero {
            padding: 40px 16px 28px;
          }

          .hero-content {
            flex-direction: column;
            text-align: center;
            gap: 20px;
          }

          .hero-text {
            text-align: center;
          }

          .hero-text h1 {
            font-size: 2rem;
          }

          .sub {
            justify-content: center;
          }

          .tagline {
            margin: 0 auto;
          }

          .price-ticker {
            gap: 16px;
            padding: 12px 16px;
          }

          .price-item {
            font-size: 12px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .burn-highlight {
            padding: 20px;
          }

          .burn-flex {
            flex-direction: column;
            text-align: center;
          }

          .burn-number {
            font-size: 3rem;
          }

          .banner-sep {
            padding: 16px 20px;
          }

          .banner-sep p {
            font-size: 15px;
          }
        }

        @media (max-width: 480px) {
          .logo-wrapper img {
            width: 80px;
            height: 80px;
          }

          .hero-text h1 {
            font-size: 1.6rem;
          }

          .price-value {
            font-size: 13px;
          }

          .burn-number {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </>
  );
}
