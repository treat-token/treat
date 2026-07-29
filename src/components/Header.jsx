// src/components/Header.jsx - Fixed wallet modal display
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
      const walletUrl = 'https://wallet.fixorium.com.pk';
      if (event.origin !== walletUrl && event.origin !== window.location.origin) {
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
            
            localStorage.setItem('fixorium_connection', JSON.stringify({
              publicKey: publicKey,
              connected: true,
              timestamp: Date.now()
            }));
            
            setTimeout(() => this.closePopup(), 500);
            
            if (this.onConnectCallback) {
              this.onConnectCallback(publicKey);
            }
          }
        }

        if (data.type === 'TRANSACTION_RESULT') {
          console.log('✅ Transaction result received:', data);
          if (this.onTransactionCallback) {
            this.onTransactionCallback(data.payload);
          }
          setTimeout(() => this.closePopup(), 500);
        }

        if (data.type === 'CONNECTION_REJECTED') {
          this.isConnected = false;
          this.closePopup();
          if (this.onConnectCallback) {
            this.onConnectCallback(null, true);
          }
        }
      } catch (error) {
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
      params.append('action', 'connect');

      const webUrl = `https://wallet.fixorium.com.pk/approve?${params.toString()}`;

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
          window.location.href = webUrl;
          setTimeout(() => {
            resolve({ publicKey: 'redirect' });
          }, 1000);
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet: ' + e.message));
      }

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
      params.append('action', 'sign');
      
      if (transaction) {
        params.append('transaction', transaction);
      }
      if (message) {
        params.append('message', message);
      }

      const webUrl = `https://wallet.fixorium.com.pk/approve?${params.toString()}`;

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
          window.location.href = webUrl;
          setTimeout(() => {
            reject(new Error('Redirected to wallet. Please approve in the wallet.'));
          }, 1000);
        }
      } catch (e) {
        reject(new Error('Failed to open Fixorium Wallet: ' + e.message));
      }

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

  // 🔥 FIX: Always show modal if not connected, regardless of walletConnected prop
  const handleBuyTreat = () => {
    console.log('🔍 handleBuyTreat called');
    console.log('📊 walletConnected:', walletConnected);
    console.log('📊 localWalletAddress:', localWalletAddress);
    
    // Check if wallet is connected (either via prop or local state)
    const isConnected = walletConnected || !!localWalletAddress;
    
    if (!isConnected) {
      console.log('🔓 Wallet not connected - showing modal');
      setShowWalletModal(true);
    } else {
      console.log('✅ Wallet connected - navigating to buy');
      handleNavigate('buy');
    }
  };

  const handleConnectFixorium = async () => {
    if (isConnectingRef.current) return;
    
    // If already connected, just navigate
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
  const isConnected = walletConnected || !!displayAddress;

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
            {isConnected && displayAddress ? (
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

      {/* Wallet Selection Modal */}
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
    </>
  );
}
