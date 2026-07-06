import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="https://solscan.io/" target="_blank" rel="noopener noreferrer">SOLSCAN</a>
        <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer">PHANTOM WALLET</a>
        <a href="https://raydium.io/" target="_blank" rel="noopener noreferrer">RAYDIUM</a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">TWITTER</a>
        <a href="https://discord.com" target="_blank" rel="noopener noreferrer">DISCORD</a>
      </div>
      <div className="disclaimer">
        <strong>DISCLAIMER:</strong> TREAT TOKEN IS PROVIDED "AS IS" WITHOUT WARRANTY. THE CREATORS AND CONTRIBUTORS ARE NOT LIABLE FOR ANY LOSSES. ALWAYS CONDUCT YOUR OWN RESEARCH AND NEVER INVEST MORE THAN YOU CAN AFFORD TO LOSE. THIS IS NOT FINANCIAL ADVICE.
      </div>
      <div className="burn-note">🔥 50% BURN OVER 1 YEAR</div>
    </footer>
  );
}
