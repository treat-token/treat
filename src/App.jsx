// src/App.jsx
import React, { useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey } from '@solana/web3.js';
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

// Use the full URL for the proxy endpoint
const ENDPOINT = window.location.origin + '/api/rpc';

console.log('🚀 App initialized with proxy RPC endpoint:', ENDPOINT);

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

const wallets = [new PhantomWalletAdapter()];

function AppContent() {
  const [activeSection, setActiveSection] = useState('home');
  const [walletAddress, setWalletAddress] = useState('');
  const [solBalance, setSolBalance] = useState(0);
  const [treatBalance, setTreatBalance] = useState(0);
  const [treatPrice, setTreatPrice] = useState(0);
  const [toast, setToast] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeWalletType, setActiveWalletType] = useState(null); // 'phantom' or 'fixorium'
  const [fixoriumAddress, setFixoriumAddress] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Make refreshBalances available globally
  useEffect(() => {
    window.refreshBalances = async () => {
      const address = fixoriumAddress || walletAddress;
      if (address) {
        await fetchBalances(address);
      }
    };
  }, [walletAddress, fixoriumAddress]);

  useEffect(() => {
    fetchPriceData();
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check for stored Fixorium connection
  useEffect(() => {
    const stored = localStorage.getItem('fixorium_connection');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.publicKey) {
          fixoriumWallet.publicKey = data.publicKey;
          fixoriumWallet.isConnected = true;
          setFixoriumAddress(data.publicKey);
          setActiveWalletType('fixorium');
          setWalletConnected(true);
          fetchBalances(data.publicKey);
          console.log('✅ Fixorium wallet restored from localStorage');
        }
      } catch (e) {}
    }

    // Check Phantom connection
    checkWalletConnection();

    // Listen for storage changes
    const handleStorageChange = (e) => {
      if (e.key === 'fixorium_connection') {
        if (e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data.publicKey) {
              fixoriumWallet.publicKey = data.publicKey;
              fixoriumWallet.isConnected = true;
              setFixoriumAddress(data.publicKey);
              setActiveWalletType('fixorium');
              setWalletConnected(true);
              fetchBalances(data.publicKey);
            }
          } catch (e) {}
        } else {
          // Disconnected
          fixoriumWallet.isConnected = false;
          fixoriumWallet.publicKey = null;
          setFixoriumAddress(null);
          if (activeWalletType === 'fixorium') {
            setActiveWalletType(null);
            setWalletConnected(false);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Phantom wallet events
    if (window.phantom?.solana) {
      const handleConnect = () => checkWalletConnection();
      const handleDisconnect = () => {
        if (activeWalletType === 'phantom') {
          setWalletAddress('');
          setWalletConnected(false);
          setActiveWalletType(null);
          setSolBalance(0);
          setTreatBalance(0);
        }
      };

      window.phantom.solana.on('connect', handleConnect);
      window.phantom.solana.on('disconnect', handleDisconnect);

      return () => {
        window.phantom.solana.off('connect', handleConnect);
        window.phantom.solana.off('disconnect', handleDisconnect);
        window.removeEventListener('storage', handleStorageChange);
      };
    }

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkWalletConnection = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (window.phantom?.solana?.isPhantom) {
      try {
        const phantom = window.phantom.solana;
        if (phantom.isConnected && phantom.publicKey) {
          const pubKey = phantom.publicKey.toString();
          // Only set if no Fixorium wallet is connected
          if (!fixoriumWallet.isConnected) {
            setWalletAddress(pubKey);
            setWalletConnected(true);
            setActiveWalletType('phantom');
            await fetchBalances(pubKey);
          }
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const getActiveAddress = () => {
    if (fixoriumWallet.isConnected && fixoriumWallet.publicKey) {
      return fixoriumWallet.publicKey;
    }
    if (walletConnected && walletAddress) {
      return walletAddress;
    }
    return null;
  };

  const connectWallet = async (walletType = 'phantom') => {
    if (walletType === 'fixorium') {
      try {
        setIsLoading(true);
        const connection = await fixoriumWallet.connect();
        setFixoriumAddress(connection.publicKey);
        setActiveWalletType('fixorium');
        setWalletConnected(true);
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

    // Phantom wallet
    if (!window.phantom?.solana) {
      showToast('❌ Wallet Not Found', 'Please install Phantom wallet', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const phantom = window.phantom.solana;
      const response = await phantom.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setWalletConnected(true);
      setActiveWalletType('phantom');
      await fetchBalances(pubKey);
      showToast('✅ Connected', `Connected to ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`, 'success');
    } catch (error) {
      showToast('❌ Connection Failed', error.message || 'Failed to connect wallet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    if (activeWalletType === 'fixorium') {
      fixoriumWallet.disconnect();
      setFixoriumAddress(null);
      setActiveWalletType(null);
      setWalletConnected(false);
      setSolBalance(0);
      setTreatBalance(0);
      showToast('✅ Disconnected', 'Fixorium wallet disconnected', 'success');
      return;
    }

    try {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
      setWalletAddress('');
      setWalletConnected(false);
      setActiveWalletType(null);
      setSolBalance(0);
      setTreatBalance(0);
      showToast('✅ Disconnected', 'Wallet disconnected', 'success');
    } catch (error) {
      showToast('❌ Disconnect Failed', error.message || 'Failed to disconnect', 'error');
    }
  };

  const fetchBalances = async (pubKeyStr) => {
    const pubKey = new PublicKey(pubKeyStr);
    
    try {
      // Fetch SOL balance
      try {
        const result = await callRpc('getBalance', [pubKey.toBase58()]);
        const balance = result.value || 0;
        setSolBalance(balance / 1e9);
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
        
        let treatBalance = 0;
        if (result.value && result.value.length > 0) {
          treatBalance = result.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
        }
        setTreatBalance(treatBalance);
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

  // Get the active address for display
  const displayAddress = fixoriumAddress || walletAddress;
  const isWalletConnected = !!(fixoriumAddress || walletConnected);

  const sections = {
    home: <Home treatPrice={treatPrice} fetchPriceData={fetchPriceData} />,
    about: <About />,
    tokenomics: <Tokenomics />,
    burn: <Burn />,
    roadmap: <Roadmap />,
    faq: <FAQ />,
    buy: <Buy
      walletConnected={isWalletConnected}
      walletAddress={displayAddress}
      solBalance={solBalance}
      treatBalance={treatBalance}
      treatPrice={treatPrice}
      showToast={showToast}
      isLoading={isLoading}
    />,
  };

  return (
    <>
      <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        walletConnected={isWalletConnected}
        walletAddress={displayAddress}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={isLoading}
        activeWalletType={activeWalletType}
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
      <WalletProvider wallets={wallets} autoConnect>
        <AppContent />
      </WalletProvider>
    </ConnectionProvider>
  );
}
