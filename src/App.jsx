import React, { useState, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';
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

// Use a custom RPC endpoint that goes through our Cloudflare Function
const ENDPOINT = '/api/rpc'; // This will be handled by Cloudflare Functions
const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';

const wallets = [new PhantomWalletAdapter()];

// Custom Connection that uses our proxy
class ProxyConnection extends Connection {
  constructor() {
    super(ENDPOINT);
    // Override the _rpcRequest method to use our proxy
    this._rpcRequest = async (method, args) => {
      const body = {
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: args,
      };

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`RPC request failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }
      return data.result;
    };
  }
}

function AppContent() {
  const [activeSection, setActiveSection] = useState('home');
  const [walletAddress, setWalletAddress] = useState('');
  const [solBalance, setSolBalance] = useState(0);
  const [treatBalance, setTreatBalance] = useState(0);
  const [treatPrice, setTreatPrice] = useState(0);
  const [toast, setToast] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchPriceData();
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkWalletConnection();

    const handleConnect = () => {
      checkWalletConnection();
    };

    const handleDisconnect = () => {
      setWalletAddress('');
      setWalletConnected(false);
      setSolBalance(0);
      setTreatBalance(0);
    };

    if (window.phantom?.solana) {
      window.phantom.solana.on('connect', handleConnect);
      window.phantom.solana.on('disconnect', handleDisconnect);

      return () => {
        window.phantom.solana.off('connect', handleConnect);
        window.phantom.solana.off('disconnect', handleDisconnect);
      };
    }
  }, []);

  const checkWalletConnection = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (window.phantom?.solana?.isPhantom) {
      try {
        const phantom = window.phantom.solana;
        if (phantom.isConnected && phantom.publicKey) {
          const pubKey = phantom.publicKey.toString();
          setWalletAddress(pubKey);
          setWalletConnected(true);
          await fetchBalances(pubKey);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const connectWallet = async () => {
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
      await fetchBalances(pubKey);
      showToast('✅ Connected', `Connected to ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`, 'success');
    } catch (error) {
      showToast('❌ Connection Failed', error.message || 'Failed to connect wallet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.phantom?.solana) {
        await window.phantom.solana.disconnect();
      }
      setWalletAddress('');
      setWalletConnected(false);
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
      const connection = new ProxyConnection();

      // Fetch SOL balance
      try {
        const solBalance = await Promise.race([
          connection.getBalance(pubKey),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SOL balance fetch timeout')), 10000)
          )
        ]);
        setSolBalance(solBalance / 1e9);
      } catch (solError) {
        console.warn('Could not fetch SOL balance:', solError.message);
        setSolBalance(0);
      }

      // Fetch TREAT token balance
      try {
        const tokenAccounts = await Promise.race([
          connection.getParsedTokenAccountsByOwner(pubKey, {
            mint: new PublicKey(TREAT_MINT_ADDRESS),
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Token balance fetch timeout')), 10000)
          )
        ]);

        let treatBalance = 0;
        if (tokenAccounts.value && tokenAccounts.value.length > 0) {
          treatBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
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

  const sections = {
    home: <Home treatPrice={treatPrice} fetchPriceData={fetchPriceData} />,
    about: <About />,
    tokenomics: <Tokenomics />,
    burn: <Burn />,
    roadmap: <Roadmap />,
    faq: <FAQ />,
    buy: <Buy
      walletConnected={walletConnected}
      walletAddress={walletAddress}
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
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
        isLoading={isLoading}
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
