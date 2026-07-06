import React from 'react';

export default function About() {
  return (
    <>
      <div className="card">
        <div className="section-header">
          <span className="accent green"></span>
          ABOUT TREAT TOKEN
        </div>
        <p>
          <strong>$TREAT</strong> IS A COMMUNITY-DRIVEN TOKEN BUILT ON THE <strong>SOLANA BLOCKCHAIN</strong>. INSPIRED BY THE VISION OF DECENTRALIZED ECOSYSTEMS, TREAT AIMS TO BRING UTILITY, REWARDS, AND GOVERNANCE TO THE SOLANA NETWORK — COMBINING THE SPEED AND LOW FEES OF SOLANA WITH THE SPIRIT OF COMMUNITY INNOVATION.
        </p>
        <p style={{ marginTop: '1rem' }}>
          OUR MISSION IS TO CREATE A TOKEN THAT EMPOWERS HOLDERS WITH ACCESS TO:
        </p>
        <ul>
          <li><strong>YIELD FARMING</strong> — EARN REWARDS BY PROVIDING LIQUIDITY IN SOLANA DEFI PROTOCOLS</li>
          <li><strong>COMMUNITY GOVERNANCE</strong> — VOTE ON PROJECT DECISIONS AND FUTURE DEVELOPMENTS</li>
          <li><strong>STAKING REWARDS</strong> — STAKE YOUR TREAT TOKENS TO EARN PASSIVE INCOME</li>
          <li><strong>MEME CULTURE & UTILITY</strong> — A TOKEN WITH BOTH FUN AND PURPOSE</li>
        </ul>
        <div className="pill-group">
          <span className="pill purple">SPL TOKEN</span>
          <span className="pill green">SOLANA</span>
          <span className="pill purple">GOVERNANCE</span>
          <span className="pill orange">50% BURN</span>
          <span className="pill green">STAKING</span>
          <span className="pill white">YIELD FARMING</span>
          <span className="pill white">COMMUNITY</span>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span className="accent green"></span>
          WHY SOLANA?
        </div>
        <p>
          SOLANA OFFERS <strong>LOW TRANSACTION FEES</strong> (FRACTION OF A CENT), <strong>HIGH SPEED</strong> (400MS BLOCK TIMES), AND A <strong>THRIVING DEFI ECOSYSTEM</strong>. TREAT LEVERAGES SOLANA'S INFRASTRUCTURE TO PROVIDE A SEAMLESS, COST-EFFECTIVE EXPERIENCE FOR ALL USERS — FROM BEGINNERS TO INSTITUTIONAL TRADERS.
        </p>
        <div className="pill-group">
          <span className="pill green">LOW FEES</span>
          <span className="pill purple">HIGH SPEED</span>
          <span className="pill white">SCALABLE</span>
          <span className="pill green">ECO-FRIENDLY</span>
        </div>
      </div>
    </>
  );
}
