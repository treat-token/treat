import React, { useState, useEffect } from 'react';

const FIXORIUM_WALLET_URL = 'https://wallet.fixorium.com.pk';

// Fixorium Wallet Connector
class FixoriumWalletConnector {
  constructor() {
    this.publicKey = null;
    this.isConnected = false;
    this.popupWindow = null;
    this.onConnectCallback = null;
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
            if (this.onConnectCallback) {
              this.onConnectCallback(publicKey);
            }
          }
        }

        if (data.type === 'CONNECTION_REJECTED') {
          this.isConnected = false;
          this.closePopup();
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

      this.onConnectCallback = (publicKey) => {
        resolve({ publicKey });
      };

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('message', 'Connect to TREAT App');
      params.append('appName', 'TREAT App');
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
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, 60000);
    });
  }

  disconnect() {
    this.publicKey = null;
    this.isConnected = false;
    this.closePopup();
    localStorage.removeItem('fixorium_connection');
  }
}

// Create singleton instance
const fixoriumWallet = new FixoriumWalletConnector();

export default function Header({ 
  activeSection, 
  onNavigate, 
  walletConnected, 
  walletAddress, 
  onConnect, 
  onDisconnect,
  onFixoriumConnect,
  onFixoriumDisconnect
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Check for stored Fixorium connection on mount
  useEffect(() => {
    const stored = localStorage.getItem('fixorium_connection');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publicKey) {
          fixoriumWallet.publicKey = data.publicKey;
          fixoriumWallet.isConnected = true;
          if (onFixoriumConnect) {
            onFixoriumConnect(data.publicKey);
          }
          setSelectedWallet('fixorium');
        }
      } catch (e) {}
    }

    // Check if Phantom is connected
    if (window.phantom?.solana?.isConnected) {
      setSelectedWallet('phantom');
    }
  }, []);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleNavigate = (section) => {
    onNavigate(section);
    setDropdownOpen(false);
  };

  const handleBuyTreat = () => {
    // If already connected, go to buy section
    if (walletConnected || fixoriumWallet.isConnected) {
      handleNavigate('buy');
      return;
    }
    // Otherwise show wallet selection modal
    setShowWalletModal(true);
  };

  const handleConnectPhantom = async () => {
    setIsConnecting(true);
    try {
      if (window.phantom?.solana) {
        const result = await window.phantom.solana.connect();
        const publicKey = result.publicKey.toString();
        setSelectedWallet('phantom');
        if (onConnect) {
          onConnect(publicKey);
        }
        setShowWalletModal(false);
        handleNavigate('buy');
      } else {
        window.open('https://phantom.app/', '_blank');
        alert('Please install Phantom wallet extension first');
      }
    } catch (error) {
      console.error('Phantom connection error:', error);
      alert('Failed to connect Phantom wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectFixorium = async () => {
    setIsConnecting(true);
    try {
      const connection = await fixoriumWallet.connect();
      setSelectedWallet('fixorium');
      if (onFixoriumConnect) {
        onFixoriumConnect(connection.publicKey);
      }
      setShowWalletModal(false);
      handleNavigate('buy');
    } catch (error) {
      console.error('Fixorium connection error:', error);
      alert('Failed to connect Fixorium Wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (selectedWallet === 'fixorium') {
      fixoriumWallet.disconnect();
      if (onFixoriumDisconnect) {
        onFixoriumDisconnect();
      }
    } else {
      if (onDisconnect) {
        onDisconnect();
      }
      if (window.phantom?.solana) {
        try {
          window.phantom.solana.disconnect();
        } catch (e) {}
      }
    }
    setSelectedWallet(null);
    setShowWalletModal(true); // Show wallet selection after disconnect
  };

  const handleOpenWalletModal = () => {
    setShowWalletModal(true);
  };

  const getWalletDisplay = () => {
    if (walletConnected && selectedWallet === 'phantom') {
      return {
        name: 'Phantom',
        icon: '🟣',
        address: walletAddress
      };
    }
    if (fixoriumWallet.isConnected && selectedWallet === 'fixorium') {
      return {
        name: 'Fixorium',
        icon: '🔷',
        address: fixoriumWallet.publicKey
      };
    }
    return null;
  };

  const walletDisplay = getWalletDisplay();

  return (
    <>
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
            {walletDisplay ? (
              <div className="header-wallet-status">
                <span className="status-dot connected"></span>
                <span className="wallet-icon">{walletDisplay.icon}</span>
                <span className="wallet-name">{walletDisplay.name}</span>
                <span className="wallet-addr">
                  {`${walletDisplay.address.slice(0, 6)}...${walletDisplay.address.slice(-6)}`}
                </span>
                <button className="disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="connect-btn" onClick={handleOpenWalletModal}>
                Connect Wallet
              </button>
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

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h2>Connect Wallet</h2>
              <button className="wallet-modal-close-btn" onClick={() => setShowWalletModal(false)}>✕</button>
            </div>
            <p>Choose your wallet to connect</p>
            
            <div className="wallet-options">
              {/* Phantom Wallet */}
              <button 
                className="wallet-option phantom"
                onClick={handleConnectPhantom}
                disabled={isConnecting}
              >
                <div className="wallet-option-icon">
                  <img 
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 397.7 311.7'%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill:%2314f195%7D%3C/style%3E%3C/defs%3E%3Cpath class='a' d='M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1L372.6,271c-2.4,2.4-5.7,3.8-9.2,3.8H46c-5.8,0-8.7-7-4.6-11.1Z'/%3E%3Cpath class='a' d='M64.6,3.8C67,1.4,70.3,0,73.8,0H391.2c5.8,0,8.7,7,4.6,11.1L372.6,40.6c-2.4,2.4-5.7,3.8-9.2,3.8H46c-5.8,0-8.7-7-4.6-11.1Z'/%3E%3Cpath class='a' d='M333.1,120.9c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l25.2,25.2c2.4,2.4,5.7,3.8,9.2,3.8H357.7c5.8,0,8.7-7,4.6-11.1Z'/%3E%3C/svg%3E"
                    alt="Phantom"
                  />
                </div>
                <div className="wallet-option-info">
                  <span className="wallet-option-name">Phantom</span>
                  <span className="wallet-option-desc">Solana Wallet</span>
                </div>
                <span className="wallet-option-arrow">→</span>
              </button>

              {/* Fixorium Wallet */}
              <button 
                className="wallet-option fixorium"
                onClick={handleConnectFixorium}
                disabled={isConnecting}
              >
                <div className="wallet-option-icon fixorium-icon">
                  <span>🔷</span>
                </div>
                <div className="wallet-option-info">
                  <span className="wallet-option-name">Fixorium Wallet</span>
                  <span className="wallet-option-desc">Secure Solana Wallet</span>
                </div>
                <span className="wallet-option-arrow">→</span>
              </button>
            </div>

            {isConnecting && (
              <div className="wallet-connecting">
                <span className="spinner"></span>
                Connecting...
              </div>
            )}

            <button 
              className="wallet-modal-cancel"
              onClick={() => setShowWalletModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Wallet Modal Styles */
        .wallet-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(8px);
        }

        .wallet-modal {
          background: #1a1614;
          border-radius: 24px;
          padding: 2rem;
          max-width: 420px;
          width: 90%;
          border: 1px solid #2a2220;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9);
        }

        .wallet-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .wallet-modal-header h2 {
          color: #f0ece8;
          font-size: 1.5rem;
        }

        .wallet-modal-close-btn {
          background: none;
          border: none;
          color: #6b5f58;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .wallet-modal-close-btn:hover {
          color: #f0ece8;
          background: #1f1a18;
        }

        .wallet-modal p {
          color: #6b5f58;
          text-align: center;
          margin-bottom: 1.5rem;
          font-size: 0.9rem;
        }

        .wallet-options {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          margin-bottom: 1.5rem;
        }

        .wallet-option {
          display: flex;
          align-items: center;
          padding: 1rem 1.2rem;
          background: #121010;
          border: 1px solid #1f1a18;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          gap: 1rem;
          width: 100%;
        }

        .wallet-option:hover:not(:disabled) {
          border-color: #2a2220;
          background: #1f1a18;
          transform: translateX(4px);
        }

        .wallet-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wallet-option-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #1f1a18;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .wallet-option-icon img {
          width: 28px;
          height: 28px;
        }

        .fixorium-icon {
          background: linear-gradient(135deg, #00D4FF, #0099cc);
          font-size: 22px;
        }

        .wallet-option-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .wallet-option-name {
          color: #f0ece8;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .wallet-option-desc {
          color: #6b5f58;
          font-size: 0.75rem;
        }

        .wallet-option-arrow {
          color: #6b5f58;
          font-size: 1.2rem;
        }

        .wallet-modal-cancel {
          width: 100%;
          padding: 0.8rem;
          background: #1f1a18;
          border: 1px solid #2a2220;
          border-radius: 40px;
          color: #a89890;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .wallet-modal-cancel:hover {
          background: #2a2220;
        }

        .wallet-connecting {
          text-align: center;
          color: #a89890;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #6b5f58;
          border-top-color: #f0ece8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Header Styles */
        .connect-btn {
          padding: 8px 20px;
          background: linear-gradient(135deg, #9945FF, #7a2be0);
          border: none;
          border-radius: 40px;
          color: #fff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-right: 12px;
        }

        .connect-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(153, 69, 255, 0.3);
        }

        .header-wallet-status {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #121010;
          padding: 6px 12px 6px 8px;
          border-radius: 40px;
          border: 1px solid #1f1a18;
          margin-right: 12px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4a3f3a;
        }

        .status-dot.connected {
          background: #14F195;
          box-shadow: 0 0 8px rgba(20, 241, 149, 0.3);
        }

        .wallet-icon {
          font-size: 14px;
        }

        .wallet-name {
          font-size: 11px;
          color: #a89890;
          font-weight: 500;
        }

        .wallet-addr {
          font-size: 12px;
          color: #f0ece8;
          font-weight: 500;
          font-family: monospace;
        }

        .disconnect-btn {
          background: transparent;
          border: none;
          color: #6b5f58;
          font-size: 10px;
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .disconnect-btn:hover {
          color: #f87171;
          background: rgba(248, 113, 113, 0.1);
        }

        @media (max-width: 768px) {
          .wallet-modal {
            padding: 1.5rem;
          }

          .wallet-option {
            padding: 0.8rem 1rem;
          }

          .header-wallet-status {
            padding: 4px 8px 4px 6px;
            margin-right: 6px;
          }

          .wallet-name {
            display: none;
          }

          .wallet-addr {
            font-size: 10px;
          }

          .connect-btn {
            padding: 6px 14px;
            font-size: 0.7rem;
            margin-right: 6px;
          }
        }
      `}</style>
    </>
  );
}
