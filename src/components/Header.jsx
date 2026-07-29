// src/components/Header.jsx
import React, { useState, useRef, useEffect } from 'react';

// Fixorium Wallet Connector - Complete Implementation
class FixoriumWalletConnector {
  constructor() {
    this.publicKey = null;
    this.isConnected = false;
    this.popupWindow = null;
    this.onConnectCallback = null;
    this.onTransactionCallback = null;
    this.requestId = null;
    this.setupMessageListener();
  }

  setupMessageListener() {
    window.addEventListener('message', (event) => {
      // Allow messages from our wallet URL and local origin
      const walletUrl = 'https://wallet.fixorium.com.pk';
      if (event.origin !== walletUrl && event.origin !== window.location.origin) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('📩 Fixorium Wallet message:', data);

        // Handle connection approval
        if (data.type === 'CONNECTION_APPROVED' || data.type === 'WALLET_CONNECTED') {
          const publicKey = data.payload?.publicKey || data.publicKey;
          if (publicKey) {
            this.publicKey = publicKey;
            this.isConnected = true;
            
            // Save connection to localStorage
            localStorage.setItem('fixorium_connection', JSON.stringify({
              publicKey: publicKey,
              connected: true,
              timestamp: Date.now()
            }));
            
            // Close popup after connection
            setTimeout(() => this.closePopup(), 500);
            
            if (this.onConnectCallback) {
              this.onConnectCallback(publicKey);
            }
          }
        }

        // Handle transaction result
        if (data.type === 'TRANSACTION_RESULT') {
          console.log('✅ Transaction result received:', data);
          if (this.onTransactionCallback) {
            this.onTransactionCallback(data.payload);
          }
          setTimeout(() => this.closePopup(), 500);
        }

        // Handle rejection
        if (data.type === 'CONNECTION_REJECTED') {
          this.isConnected = false;
          this.closePopup();
          if (this.onConnectCallback) {
            this.onConnectCallback(null, true);
          }
        }
      } catch (error) {
        // Not JSON or error
        console.debug('Message parse error:', error);
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
      this.requestId = requestId;

      this.onConnectCallback = (publicKey, rejected = false) => {
        if (rejected) {
          reject(new Error('Connection rejected'));
        } else {
          resolve({ publicKey });
        }
        this.onConnectCallback = null;
      };

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('appName', 'TREAT App');
      params.append('appUrl', window.location.origin);
      params.append('callbackUrl', window.location.origin + '/callback');
      params.append('action', 'connect'); // Explicitly set action to connect

      const webUrl = `https://wallet.fixorium.com.pk/sign?${params.toString()}`;

      console.log('🔗 Opening Fixorium Wallet for CONNECTION...');

      try {
        this.popupWindow = window.open(
          webUrl,
          'FixoriumWallet',
          'width=420,height=750,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes'
        );
        if (this.popupWindow) {
          this.popupWindow.focus();
        } else {
          // Fallback: redirect
          window.location.href = webUrl;
          // Resolve after redirect
          setTimeout(() => {
            resolve({ publicKey: 'redirect' });
          }, 1000);
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet: ' + e.message));
      }

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.popupWindow && !this.popupWindow.closed) {
          this.popupWindow.close();
          this.popupWindow = null;
        }
        if (this.onConnectCallback) {
          reject(new Error('Connection timeout'));
          this.onConnectCallback = null;
        }
      }, 60000);
    });
  }

  async signTransaction(transaction, message = null) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.publicKey) {
        reject(new Error('Wallet not connected'));
        return;
      }

      const requestId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      this.requestId = requestId;

      this.onTransactionCallback = (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || 'Transaction failed'));
        }
        this.onTransactionCallback = null;
      };

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('appName', 'TREAT App');
      params.append('appUrl', window.location.origin);
      params.append('callbackUrl', window.location.origin + '/callback');
      params.append('action', 'sign'); // Explicitly set action to sign
      
      if (transaction) {
        params.append('transaction', transaction);
      }
      if (message) {
        params.append('message', message);
      }

      const webUrl = `https://wallet.fixorium.com.pk/sign?${params.toString()}`;

      console.log('✍️ Opening Fixorium Wallet for TRANSACTION SIGNING...');

      try {
        this.popupWindow = window.open(
          webUrl,
          'FixoriumWallet',
          'width=420,height=750,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes'
        );
        if (this.popupWindow) {
          this.popupWindow.focus();
        } else {
          // Fallback: redirect
          window.location.href = webUrl;
          setTimeout(() => {
            reject(new Error('Redirected to wallet. Please approve in the wallet.'));
          }, 1000);
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet: ' + e.message));
      }

      // Timeout after 120 seconds for transactions
      setTimeout(() => {
        if (this.popupWindow && !this.popupWindow.closed) {
          this.popupWindow.close();
          this.popupWindow = null;
        }
        if (this.onTransactionCallback) {
          reject(new Error('Transaction timeout'));
          this.onTransactionCallback = null;
        }
      }, 120000);
    });
  }

  disconnect() {
    this.publicKey = null;
    this.isConnected = false;
    this.closePopup();
    localStorage.removeItem('fixorium_connection');
    console.log('🔌 Fixorium Wallet disconnected');
  }
}

// Create singleton instance and expose globally
let fixoriumWalletInstance = null;

export function getFixoriumWallet() {
  if (!fixoriumWalletInstance) {
    fixoriumWalletInstance = new FixoriumWalletConnector();
    // Expose globally for use in other components
    if (typeof window !== 'undefined') {
      window.fixoriumWalletConnector = fixoriumWalletInstance;
    }
  }
  return fixoriumWalletInstance;
}

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
  const [localWalletAddress, setLocalWalletAddress] = useState(walletAddress);
  const isConnectingRef = useRef(false);
  const connectorRef = useRef(null);

  // Initialize connector and check stored connection
  useEffect(() => {
    connectorRef.current = getFixoriumWallet();
    
    // Check if we have a stored connection
    const stored = localStorage.getItem('fixorium_connection');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publicKey && data.connected) {
          const connector = connectorRef.current;
          connector.publicKey = data.publicKey;
          connector.isConnected = true;
          setLocalWalletAddress(data.publicKey);
          if (onConnect && !walletConnected) {
            onConnect(data.publicKey);
          }
        }
      } catch (e) {
        console.error('Failed to restore connection:', e);
      }
    }
  }, []);

  // Update local wallet address when prop changes
  useEffect(() => {
    if (walletAddress) {
      setLocalWalletAddress(walletAddress);
    }
  }, [walletAddress]);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleNavigate = (section) => {
    onNavigate(section);
    setDropdownOpen(false);
  };

  const handleBuyTreat = () => {
    if (!walletConnected && !localWalletAddress) {
      setShowWalletModal(true);
    } else {
      handleNavigate('buy');
    }
  };

  const handleConnectFixorium = async () => {
    if (isConnectingRef.current) return;
    if (walletConnected || localWalletAddress) {
      setShowWalletModal(false);
      handleNavigate('buy');
      return;
    }

    isConnectingRef.current = true;
    setIsConnecting(true);

    try {
      const connector = connectorRef.current || getFixoriumWallet();
      const connection = await connector.connect();
      if (connection.publicKey && connection.publicKey !== 'redirect') {
        setLocalWalletAddress(connection.publicKey);
        if (onConnect) {
          onConnect(connection.publicKey);
        }
        setShowWalletModal(false);
        handleNavigate('buy');
      }
    } catch (error) {
      console.error('Fixorium connection error:', error);
      // Don't show alert for user rejection
      if (!error.message.includes('rejected')) {
        alert('Failed to connect Fixorium Wallet: ' + error.message);
      }
    } finally {
      setIsConnecting(false);
      setTimeout(() => {
        isConnectingRef.current = false;
      }, 500);
    }
  };

  const handleDisconnect = () => {
    const connector = connectorRef.current || getFixoriumWallet();
    connector.disconnect();
    setLocalWalletAddress(null);
    if (onDisconnect) {
      onDisconnect();
    }
    setDropdownOpen(false);
  };

  // Display address (use prop or local state)
  const displayAddress = walletAddress || localWalletAddress;

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
            {(walletConnected || localWalletAddress) && displayAddress ? (
              <div className="header-wallet-status">
                <span className="status-dot connected"></span>
                <span className="wallet-icon">🔷</span>
                <span className="wallet-name">Fixorium</span>
                <span className="wallet-addr">
                  {`${displayAddress.slice(0, 6)}...${displayAddress.slice(-6)}`}
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
          margin: 0;
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
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
