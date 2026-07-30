// src/components/Header.jsx - Use shared connector
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

// Modal component using React Portal
function WalletModal({ isOpen, onClose, onConnect, isConnecting }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
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
      zIndex: 99999,
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
    }} onClick={onClose}>
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
          }} onClick={onClose}>✕</button>
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
              cursor: isConnecting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              gap: '1rem',
              width: '100%',
              opacity: isConnecting ? 0.5 : 1,
            }}
            onClick={onConnect}
            disabled={isConnecting}
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
              <span></span>
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
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
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

  // 🔥 Use the shared connector from window
  const getConnector = () => {
    return window.fixoriumWalletConnector;
  };

  // Check for existing connection on mount
  useEffect(() => {
    const connector = getConnector();
    if (connector && connector.isConnected && connector.publicKey) {
      setLocalWalletAddress(connector.publicKey);
      // Update parent state if needed
      if (onConnect && !walletConnected) {
        console.log('🔄 Restoring connection and updating parent state');
        onConnect(connector.publicKey);
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
      const connector = getConnector();
      if (!connector) {
        throw new Error('Wallet connector not found. Please refresh the page.');
      }

      // 🔥 Use the connector's connect method
      const connection = await connector.connect();
      
      if (connection.publicKey) {
        console.log('✅ Connected via Header:', connection.publicKey);
        setLocalWalletAddress(connection.publicKey);
        
        // 🔥 Call onConnect to update parent state
        if (onConnect) {
          console.log('🔄 Updating parent state with connection:', connection.publicKey);
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
    const connector = getConnector();
    if (connector) {
      connector.disconnect();
    }
    setLocalWalletAddress(null);
    if (onDisconnect) {
      console.log('🔄 Updating parent state with disconnection');
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
                <span className="wallet-icon"></span>
                <span className="wallet-name">FIXORIUM</span>
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
      <WalletModal 
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleConnectFixorium}
        isConnecting={isConnecting}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
