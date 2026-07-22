// src/components/Header.jsx
import React, { useState, useEffect, useRef } from 'react';

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

const fixoriumWallet = new FixoriumWalletConnector();

export default function Header({ 
  activeSection, 
  onNavigate, 
  walletConnected, 
  walletAddress, 
  onConnect, 
  onDisconnect,
  isLoading
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const isConnectingRef = useRef(false);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleNavigate = (section) => {
    onNavigate(section);
    setDropdownOpen(false);
  };

  const handleBuyTreat = () => {
    if (walletConnected) {
      handleNavigate('buy');
      return;
    }
    setShowWalletModal(true);
  };

  const handleConnectFixorium = async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    setIsConnecting(true);
    
    try {
      const connection = await fixoriumWallet.connect();
      if (onConnect) {
        onConnect('fixorium');
      }
      setShowWalletModal(false);
      handleNavigate('buy');
    } catch (error) {
      console.error('Fixorium connection error:', error);
      alert('Failed to connect Fixorium Wallet');
    } finally {
      setIsConnecting(false);
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 500);
    }
  };

  const handleDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
    // Show wallet modal after disconnect
    setShowWalletModal(true);
  };

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
            {walletConnected && walletAddress ? (
              <div className="header-wallet-status">
                <span className="status-dot connected"></span>
                <span className="wallet-icon">🔷</span>
                <span className="wallet-name">Fixorium</span>
                <span className="wallet-addr">
                  {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-6)}`}
                </span>
                <button className="disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            ) : null}

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

      {/* Wallet Selection Modal - Only Fixorium */}
      {showWalletModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowWalletModal(false)}>
          <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wallet-modal-header">
              <h2>Connect Wallet</h2>
              <button className="wallet-modal-close-btn" onClick={() => setShowWalletModal(false)}>✕</button>
            </div>
            <p>Connect your Fixorium Wallet</p>
            
            <div className="wallet-options">
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

        .fixorium-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #00D4FF, #0099cc);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
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

        .connect-btn {
          display: none !important;
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
        }
      `}</style>
    </>
  );
}
