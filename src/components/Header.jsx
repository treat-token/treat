import React, { useState } from 'react';

export default function Header({ activeSection, onNavigate, walletConnected, walletAddress, onConnect, onDisconnect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleNavigate = (section) => {
    onNavigate(section);
    setDropdownOpen(false);
  };

  const handleBuyTreat = async () => {
    if (!walletConnected) {
      await onConnect();
    }
    handleNavigate('buy');
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a 
          href="#" 
          className="brand" 
          onClick={(e) => {
            e.preventDefault();
            handleNavigate('home');
          }}
        >
          <img src="https://i.postimg.cc/d1CJyjt9/treat1727943702621.png" alt="TREAT Logo" />
          TREAT<span>.</span>
        </a>

        <div className="nav-right">
          {walletConnected && (
            <div className="header-wallet-status">
              <span className={`status-dot ${walletConnected ? 'connected' : ''}`}></span>
              <span className="wallet-addr">
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`}
              </span>
              <button className="disconnect-btn" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          )}

          <button className="cta" onClick={handleBuyTreat}>
            BUY TREAT
          </button>

          <div className="dropdown">
            <button className="dropbtn" onClick={toggleDropdown}>
              ☰
            </button>
            {dropdownOpen && (
              <div className="dropdown-content show">
                <button 
                  className={activeSection === 'home' ? 'active' : ''} 
                  onClick={() => handleNavigate('home')}
                >
                  HOME
                </button>
                <button 
                  className={activeSection === 'about' ? 'active' : ''} 
                  onClick={() => handleNavigate('about')}
                >
                  ABOUT
                </button>
                <button 
                  className={activeSection === 'tokenomics' ? 'active' : ''} 
                  onClick={() => handleNavigate('tokenomics')}
                >
                  TOKENOMICS
                </button>
                <button 
                  className={activeSection === 'burn' ? 'active' : ''} 
                  onClick={() => handleNavigate('burn')}
                >
                  BURN
                </button>
                <button 
                  className={activeSection === 'roadmap' ? 'active' : ''} 
                  onClick={() => handleNavigate('roadmap')}
                >
                  ROADMAP
                </button>
                <button 
                  className={activeSection === 'faq' ? 'active' : ''} 
                  onClick={() => handleNavigate('faq')}
                >
                  FAQ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
