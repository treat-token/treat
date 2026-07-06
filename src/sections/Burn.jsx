import React from 'react';

export default function Burn() {
  return (
    <>
      <div className="burn-highlight" style={{ marginTop: 0 }}>
        <div className="burn-flex">
          <div>
            <div className="burn-number">50%</div>
            <div className="burn-label">BURN TARGET OVER 1 YEAR</div>
          </div>
          <div>
            <div className="burn-desc">
              <strong>500,000,000 TREAT</strong> (50% OF MAX SUPPLY) WILL BE PERMANENTLY BURNED OVER A PERIOD OF <strong>1 YEAR</strong> FROM LAUNCH.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span className="accent red"></span>
          WHY 50% BURN OVER 1 YEAR?
        </div>
        <p>
          THE <strong>50% TOKEN BURN</strong> IS EXECUTED GRADUALLY OVER 1 YEAR TO CREATE A <strong>SUSTAINABLE DEFLATIONARY MECHANISM</strong> THAT BENEFITS ALL HOLDERS. HERE'S WHY THIS MATTERS:
        </p>
        <ul>
          <li className="burn-item"><strong>SUSTAINABLE SCARCITY</strong> — GRADUAL BURN PREVENTS SUDDEN SUPPLY SHOCKS WHILE STEADILY REDUCING TOTAL SUPPLY</li>
          <li className="burn-item"><strong>LONG-TERM VALUE</strong> — LOWER SUPPLY WITH SAME OR INCREASING DEMAND = HIGHER PRICE POTENTIAL</li>
          <li className="burn-item"><strong>COMMUNITY TRUST</strong> — TRANSPARENT, ON-CHAIN BURN SCHEDULE DEMONSTRATES COMMITMENT</li>
          <li className="burn-item"><strong>VERIFIABLE</strong> — ALL BURN TRANSACTIONS ARE RECORDED ON SOLANA BLOCKCHAIN AND PUBLICLY AUDITABLE</li>
        </ul>
        <p style={{ marginTop: '1rem', color: '#d4b896' }}>
          BURNED TOKENS ARE SENT TO SOLANA'S NULL ADDRESS (<span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#f7931a' }}>111111111111....11111111</span>), MAKING THEM PERMANENTLY INACCESSIBLE FOREVER.
        </p>
        <div className="pill-group">
          <span className="pill orange">DEFLATIONARY</span>
          <span className="pill red">SCARCE</span>
          <span className="pill purple">TRANSPARENT</span>
          <span className="pill green">COMMUNITY TRUST</span>
        </div>
      </div>

      <div className="card">
        <div className="section-header">
          <span className="accent orange"></span>
          BURN SCHEDULE
        </div>
        <div className="tokenomics">
          <div className="row"><span className="key">TOTAL BURN TARGET</span><span className="val"><span className="orange">500,000,000 TREAT</span></span></div>
          <div className="row"><span className="key">BURN DURATION</span><span className="val"><span className="orange">365 DAYS</span></span></div>
          <div className="row"><span className="key">DAILY BURN</span><span className="val"><span className="orange">~1,369,863 TREAT</span></span></div>
          <div className="row"><span className="key">WEEKLY BURN</span><span className="val"><span className="orange">~9,589,041 TREAT</span></span></div>
          <div className="row"><span className="key">MONTHLY BURN</span><span className="val"><span className="orange">~41,666,667 TREAT</span></span></div>
          <div className="row"><span className="key">QUARTERLY BURN</span><span className="val"><span className="orange">~125,000,000 TREAT</span></span></div>
        </div>
      </div>
    </>
  );
}
