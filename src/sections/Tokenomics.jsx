import React from 'react';

export default function Tokenomics() {
  return (
    <div className="card">
      <div className="section-header">
        <span className="accent orange"></span>
        TOKENOMICS & BURN MECHANISM
      </div>
      
      <p>
        <strong>TREAT TOKEN</strong> is an SPL token built on the <strong>SOLANA</strong> blockchain with a maximum supply of <strong>1,000,000,000</strong> tokens.
      </p>
      
      <p>
        The token features a <strong>50% deflationary burn mechanism</strong>, targeting the permanent removal of <strong>500,000,000 TREAT</strong> from circulation. This will leave a circulating supply of <strong>500,000,000</strong> tokens with <strong>9 decimals</strong> for fractional trading.
      </p>
      
      <p>
        Both <strong>MINT AUTHORITY</strong> and <strong>FREEZE AUTHORITY</strong> have been permanently revoked, ensuring no additional tokens can ever be created or frozen. The burn process is conducted over a period of <strong>1 YEAR (365 DAYS)</strong> with a daily burn rate of approximately <strong>1,369,863 TREAT</strong>.
      </p>
      
      <p>
        All burned tokens are sent to Solana's null address: <span style={{ fontFamily: 'monospace' }}>1111111111111111...1111</span>, making them permanently inaccessible and irrecoverable.
      </p>
      
      <div className="pill-group">
        <span className="pill orange">DEFLATIONARY</span>
        <span className="pill red">SCARCE</span>
        <span className="pill purple">TRANSPARENT</span>
        <span className="pill green">COMMUNITY TRUST</span>
        <span className="pill white">AUDITED</span>
      </div>
    </div>
  );
}
