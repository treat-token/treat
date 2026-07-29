// src/components/Header.jsx - Fixed with inline styles for modal
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

  const handleBuyTreat = () => {
    const isConnected = walletConnected || !!localWalletAddress;
    
    if (!isConnected) {
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

      {/* Wallet Selection Modal - WITH INLINE STYLES */}
      {showWalletModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }} onClick={() => setShowWalletModal(false)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '420px',
            width: '90%',
            border: '1px solid #e5e7eb',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.15)',
            position: 'relative',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <h2 style={{
                color: '#111827',
                fontSize: '1.5rem',
                margin: 0,
                fontWeight: 700,
              }}>Connect Wallet</h2>
              <button style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
              }} onClick={() => setShowWalletModal(false)}>✕</button>
            </div>
            <p style={{
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
            }}>Connect your Fixorium Wallet</p>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              marginBottom: '1.5rem',
            }}>
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem 1.2rem',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  gap: '1rem',
                  width: '100%',
                  opacity: isConnecting ? 0.5 : 1,
                  cursor: isConnecting ? 'not-allowed' : 'pointer',
                }}
                onClick={handleConnectFixorium}
                disabled={isConnecting}
                onMouseEnter={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #00D4FF, #0099cc)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  flexShrink: 0,
                }}>
                  <span>🔷</span>
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}>
                  <span style={{
                    color: '#111827',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                  }}>Fixorium Wallet</span>
                  <span style={{
                    color: '#6b7280',
                    fontSize: '0.75rem',
                  }}>Secure Solana Wallet</span>
                </div>
                <span style={{
                  color: '#6b7280',
                  fontSize: '1.2rem',
                }}>→</span>
              </button>
            </div>

            {isConnecting && (
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.9rem',
                marginBottom: '1rem',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #e5e7eb',
                  borderTopColor: '#6366f1',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  verticalAlign: 'middle',
                  marginRight: '8px',
                }}></span>
                Connecting...
              </div>
            )}

            <button 
              style={{
                width: '100%',
                padding: '0.8rem',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '40px',
                color: '#4b5563',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => setShowWalletModal(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
