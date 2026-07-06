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

const NETWORK = WalletAdapterNetwork.Mainnet;
const ENDPOINT = clusterApiUrl(NETWORK);
const TREAT_MINT_ADDRESS = '3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump';

const wallets = [new PhantomWalletAdapter()];

function AppContent() {
  const [activeSection, setActiveSection] = useState('home');
  const [walletAddress, setWalletAddress] = useState('');
  const [solBalance, setSolBalance] = useState(0);
  const [treatBalance, setTreatBalance] = useState(0);
  const [treatPrice, setTreatPrice] = useState(0);
  const [toast, setToast] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);

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
  }, []);

  const checkWalletConnection = async () => {
    if (window.phantom?.solana?.isPhantom) {
      try {
        const phantom = window.phantom.solana;
        if (phantom.isConnected) {
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
      const phantom = window.phantom.solana;
      const response = await phantom.connect();
      const pubKey = response.publicKey.toString();
      setWalletAddress(pubKey);
      setWalletConnected(true);
      await fetchBalances(pubKey);
      showToast('✅ Connected', `Connected to ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`, 'success');
    } catch (error) {
      showToast('❌ Connection Failed', error.message || 'Failed to connect wallet', 'error');
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
    try {
      const connection = new Connection(ENDPOINT, 'confirmed');
      const pubKey = new PublicKey(pubKeyStr);

      const solBalance = await connection.getBalance(pubKey);
      setSolBalance(solBalance / 1e9);

      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        mint: new PublicKey(TREAT_MINT_ADDRESS),
      });

      let treatBalance = 0;
      if (tokenAccounts.value.length > 0) {
        treatBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      }
      setTreatBalance(treatBalance);
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  };

  const fetchPriceData = async () => {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/search?q=3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump');
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const price = parseFloat(data.pairs[0].priceUsd || 0.001);
          setTreatPrice(price);
        }
      }
    } catch (error) {
      console.error('Price fetch error:', error);
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
      onConnect={connectWallet}
      onDisconnect={disconnectWallet}
    />,
  };

  return (
    <div>
      <Header
        activeSection={activeSection}
        onNavigate={setActiveSection}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={connectWallet}
        onDisconnect={disconnectWallet}
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
    </div>
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
