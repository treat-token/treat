// src/App.jsx
import React, { useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { PublicKey } from '@solana/web3.js';
import Header from './components/Header';
import Home from './sections/Home';
import About from './sections/About';
import Tokenomics from './sections/Tokenomics';
import Burn from './sections/Burn';
import Roadmap from './sections/Roadmap';
import FAQ from './sections/FAQ';
import Buy from './sections/Buy';
import Footer from './components/Footer';
import Toast from './components/Toast';
import { callRpc } from './utils/rpc';

const NETWORK = WalletAdapterNetwork.Mainnet;
const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';
const FIXORIUM_WALLET_URL = 'https://wallet.fixorium.com.pk';

const ENDPOINT = window.location.origin + '/api/rpc';

console.log('🚀 App initialized with proxy RPC endpoint:', ENDPOINT);

// ============================================================
// FIXORIUM WALLET CONNECTOR
// ============================================================

class FixoriumWalletConnector {
  constructor() {
    this.publicKey = null;
    this.isConnected = false;
    this.popupWindow = null;
    this.pendingRequests = new Map();
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

  async signAndSendTransaction(transaction) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.publicKey) {
        reject(new Error('Wallet not connected'));
        return;
      }

      const requestId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      this.pendingRequests.set(requestId, { resolve, reject });

      const serialized = transaction.serialize();
      const transactionBase64 = btoa(String.fromCharCode.apply(null, serialized));

      const params = new URLSearchParams();
      params.append('requestId', requestId);
      params.append('transaction', transactionBase64);
      params.append('message', 'Sign Swap Transaction');
      params.append('appName', 'TREAT App');
      params.append('appUrl', window.location.origin);
      params.append('callbackUrl', window.location.origin + '/callback');

      const webUrl = `${FIXORIUM_WALLET_URL}/sign?${params.toString()}`;

      console.log('✍️ Opening Fixorium Wallet for signing...');

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
        reject(new Error('Failed to open Fixorium Wallet for signing'));
        this.pendingRequests.delete(requestId);
      }

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          this.closePopup();
          reject(new Error('Transaction signing timeout'));
        }
      }, 60000);
    });
  }

  disconnect() {
    this.publicKey = null;
    this.isConnected = false;
    this.pendingRequests.clear();
    this.closePopup();
    localStorage.removeItem('fixorium_connection');
  }

  getWalletInfo() {
    return {
      publicKey: this.publicKey,
      isConnected: this.isConnected,
      platform: 'web'
    };
  }
}

// Create singleton instance
const fixoriumWallet = new FixoriumWalletConnector();

// ============================================================
// APP CONTENT
// ============================================================

function AppContent() {
  const [activeSection, setActiveSection] = useState('home');
  const [phantomAddress, setPhantomAddress] = useState('');
  const [phantomConnected, setPhantomConnected] = useState(false);
  const [solBalance, setSolBalance] = useState(0);
  const [treatBalance, setTreatBalance] = useState(0);
  const [treatPrice, setTreatPrice] = useState(0);
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeWalletType, setActiveWalletType] = useState(null); // 'phantom' or 'fixorium'

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Get the active wallet address
  const getActiveAddress = () => {
    if (fixoriumWallet.isConnected && fixoriumWallet.publicKey) {
      return fixoriumWallet.publicKey;
    }
    if (phantomConnected && phantomAddress) {
      return phantomAddress;
    }
    return null;
  };

  // Check if any wallet is connected
  const isWalletConnected = () => {
    return (fixoriumWallet.isConnected && fixoriumWallet.publicKey) || 
           (phantomConnected && phantomAddress);
  };

  // Fetch balances for a given address
  const fetchBalances = async (pubKeyStr) => {
    console.log('📊 Fetching balances for:', pubKeyStr);
    
    if (!pubKeyStr) {
      setSolBalance(0);
      setTreatBalance(0);
      return;
    }

    try {
      const pubKey = new PublicKey(pubKeyStr);
      
      // Fetch SOL balance
      try {
        const result = await callRpc('getBalance', [pubKey.toBase58()]);
        const balance = result.value || 0;
        const sol = balance / 1e9;
        console.log('💰 SOL Balance:', sol);
        setSolBalance(sol);
      } catch (solError) {
        console.warn('Could not fetch SOL balance:', solError.message);
        setSolBalance(0);
      }

      // Fetch TREAT token balance
      try {
        const result = await callRpc('getTokenAccountsByOwner', [
          pubKey.toBase58(),
          { mint: TREAT_MINT_ADDRESS },
          { encoding: 'jsonParsed' }
        ]);
        
        let treat = 0;
        if (result.value && result.value.length > 0) {
          treat = result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
        }
        console.log('💰 TREAT Balance:', treat);
        setTreatBalance(treat);
      } catch (tokenError) {
        console.warn('Could not fetch TREAT balance:', tokenError.message);
        setTreatBalance(0);
      }
    } catch (error) {
      console.warn('Balance fetch failed:', error.message);
      setSolBalance(0);
      setTreatBalance(0);
    }
  };

  // Refresh balances for the active wallet
  const refreshBalances = async () => {
    const address = getActiveAddress();
    if (address) {
      await fetchBalances(address);
    }
  };

  // Make refreshBalances available globally
  useEffect(() => {
    window.refreshBalances = refreshBalances;
  }, []);

  // Check for Fixorium connection on mount
  useEffect(() => {
    const stored = localStorage.getItem('fixorium_connection');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publicKey) {
          fixoriumWallet.publicKey = data.publicKey;
          fixoriumWallet.isConnected = true;
          setActiveWalletType('fixorium');
          console.log('✅ Fixorium wallet restored from localStorage');
          setTimeout(() => {
            fetchBalances(data.publicKey);
          }, 500);
        }
      } catch (e) {}
    }

    // DO NOT auto-check Phantom connection on mount
    // Phantom should ONLY connect when user explicitly clicks it

    // Listen for storage changes (Fixorium)
    const handleStorageChange = (e) => {
      if (e.key === 'fixorium_connection') {
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.publicKey) {
              fixoriumWallet.publicKey = data.publicKey;
              fixoriumWallet.isConnected = true;
              setActiveWalletType('fixorium');
              fetchBalances(data.publicKey);
            }
          } catch (e) {}
        } else {
          fixoriumWallet.isConnected = false;
          fixoriumWallet.publicKey = null;
          if (activeWalletType === 'fixorium') {
            setActiveWalletType(null);
            if (!phantomConnected) {
              setSolBalance(0);
              setTreatBalance(0);
            } else {
              setActiveWalletType('phantom');
              fetchBalances(phantomAddress);
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Phantom wallet events - only listen for user-initiated disconnects
    if (window.phantom?.solana) {
      const handleDisconnect = () => {
        console.log('🟣 Phantom disconnected');
        if (activeWalletType === 'phantom') {
          setPhantomAddress('');
          setPhantomConnected(false);
          if (!fixoriumWallet.isConnected) {
            setActiveWalletType(null);
            setSolBalance(0);
            setTreatBalance(0);
          } else {
            setActiveWalletType('fixorium');
            fetchBalances(fixoriumWallet.publicKey);
          }
        }
      };

      window.phantom.solana.on('disconnect', handleDisconnect);

      return () => {
        window.phantom.solana.off('disconnect', handleDisconnect);
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Connect wallet - MANUAL ONLY
  const connectWallet = async (walletType = 'phantom') => {
    if (walletType === 'fixorium') {
      try {
        setIsLoading(true);
        // Disconnect Phantom if connected
        if (phantomConnected && window.phantom?.solana) {
          try {
            await window.phantom.solana.disconnect();
          } catch (e) {}
          setPhantomAddress('');
          setPhantomConnected(false);
        }
        
        const connection = await fixoriumWallet.connect();
        setActiveWalletType('fixorium');
        localStorage.setItem('fixorium_connection', JSON.stringify({
          publicKey: connection.publicKey,
          connectedAt: Date.now()
        }));
        await fetchBalances(connection.publicKey);
        showToast('✅ Connected', `Connected to Fixorium Wallet`, 'success');
      } catch (error) {
        showToast('❌ Connection Failed', error.message || 'Failed to connect Fixorium wallet', 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Phantom wallet - MANUAL CONNECT ONLY
    if (!window.phantom?.solana) {
      showToast('❌ Wallet Not Found', 'Please install Phantom wallet', 'error');
      return;
    }

    try {
      setIsLoading(true);
      // Disconnect Fixorium if connected
      if (fixoriumWallet.isConnected) {
        fixoriumWallet.disconnect();
      }
      
      const phantom = window.phantom.solana;
      const response = await phantom.connect();
      const pubKey = response.publicKey.toString();
      setPhantomAddress(pubKey);
      setPhantomConnected(true);
      setActiveWalletType('phantom');
      await fetchBalances(pubKey);
      showToast('✅ Connected', `Connected to ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`, 'success');
    } catch (error) {
      showToast('❌ Connection Failed', error.message || 'Failed to connect wallet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    if (activeWalletType === 'fixorium') {
      fixoriumWallet.disconnect();
      setActiveWalletType(null);
      setSolBalance(0);
      setTreatBalance(0);
      showToast('✅ Disconnected', 'Fixorium wallet disconnected', 'success');
      return;
    }

    if (activeWalletType === 'phantom') {
      try {
        if (window.phantom?.solana) {
          await window.phantom.solana.disconnect();
        }
        setPhantomAddress('');
        setPhantomConnected(false);
        setActiveWalletType(null);
        setSolBalance(0);
        setTreatBalance(0);
        showToast('✅ Disconnected', 'Phantom wallet disconnected', 'success');
      } catch (error) {
        showToast('❌ Disconnect Failed', error.message || 'Failed to disconnect', 'error');
      }
    }
  };

  const fetchPriceData = async () => {
    try {
      const response = await Promise.race([
        fetch('https://api.dexscreener.com/latest/dex/search?q=3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Price fetch timeout')), 10000)
        )
      ]);

      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const price = parseFloat(data.pairs[0].priceUsd || 0.001);
          setTreatPrice(price);
        }
      }
    } catch (error) {
      console.warn('Price fetch error:', error.message);
      setTreatPrice(0.001);
    }
  };

  useEffect(() => {
    fetchPriceData();
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get active wallet info
  const getActiveWalletInfo = () => {
    if (fixoriumWallet.isConnected && fixoriumWallet.publicKey) {
      return {
        type: 'fixorium',
        address: fixoriumWallet.publicKey,
        isConnected: true
      };
    }
    if (phantomConnected && phantomAddress) {
      return {
        type: 'phantom',
        address: phantomAddress,
        isConnected: true
      };
    }
    return {
      type: null,
      address: null,
      isConnected: false
    };
  };

  const activeWallet = getActiveWalletInfo();
  const isConnected = activeWallet.isConnected;
  const displayAddress = activeWallet.address || '';
  const displayWalletType = activeWallet.type;

  // Log current state
  console.log('🔍 App State:', {
    activeWalletType: displayWalletType,
    displayAddress: displayAddress,
    fixoriumConnected: fixoriumWallet.isConnected,
    fixoriumAddress: fixoriumWallet.publicKey,
    phantomConnected: phantomConnected,
    phantomAddress: phantomAddress,
    solBalance: solBalance,
    treatBalance: treatBalance
  });

  const sections = {
    home: <Home treatPrice={treatPrice} fetchPriceData={fetchPriceData} />,
    about: <About />,
    tokenomics: <Tokenomics />,
    burn: <Burn />,
    roadmap: <Roadmap />,
    faq: <FAQ />,
    buy: <Buy
      walletConnected={isConnected}
      walletAddress={displayAddress}
      solBalance={solBalance}
      treatBalance={treatBalance}
      treatPrice={treatPrice}
      showToast={showToast}
      isLoading={isLoading}
      activeWalletType={displayWalletType}
      refreshBalances={refreshBalances}
    />,
  };

  return (
    <>
      <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        walletConnected={isConnected}
        walletAddress={displayAddress}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={isLoading}
        activeWalletType={displayWalletType}
      />

      <div className="container">
        {Object.entries(sections).map(([key, component]) => (
          <div
            key={key}
            className={`section ${activeSection === key ? 'active' : ''}`}
          >
            {component}
          </div>
        ))}
      </div>

      <div className="container">
        <Footer />
      </div>

      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          type={toast.type}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ConnectionProvider endpoint={ENDPOINT}>
      <WalletProvider wallets={[]} autoConnect={false}>
        <AppContent />
      </WalletProvider>
    </ConnectionProvider>
  );
}
