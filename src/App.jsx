import React, { useState, useEffect } from 'react';
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

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [solBalance, setSolBalance] = useState(0);
  const [treatBalance, setTreatBalance] = useState(0);
  const [treatPrice, setTreatPrice] = useState(0);
  const [toast, setToast] = useState(null);

  const showToast = (title, message, type = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    fetchPriceData();
    const interval = setInterval(fetchPriceData, 30000);
    return () => clearInterval(interval);
  }, []);

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
    />,
  };

  return (
    <div>
      <Header 
        activeSection={activeSection} 
        onNavigate={setActiveSection}
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        onConnect={() => setWalletConnected(true)}
        onDisconnect={() => setWalletConnected(false)}
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
