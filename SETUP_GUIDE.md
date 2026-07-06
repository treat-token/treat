# TREAT Token Web App - Setup Guide

## Overview
This is a modern React web app converted from the original HTML page. It maintains the exact same layout and functionality while adding security improvements through Cloudflare Pages Functions.

## Key Improvements
✅ **Modular React Components** - Separated concerns for better maintainability
✅ **Secure API Handling** - Alchemy and DFlow API keys are now protected via Cloudflare Pages Functions
✅ **Responsive Design** - All original styles preserved with media queries intact
✅ **Modern Tooling** - Vite for fast development and optimized builds

## Project Structure
```
.
├── src/
│   ├── components/          # Reusable React components
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   └── Toast.jsx
│   ├── sections/            # Page sections
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   ├── Tokenomics.jsx
│   │   ├── Burn.jsx
│   │   ├── Roadmap.jsx
│   │   ├── FAQ.jsx
│   │   └── Buy.jsx
│   ├── styles.css           # All CSS styles (preserved from original)
│   ├── App.jsx              # Main app component
│   └── main.jsx             # React entry point
├── functions/
│   ├── api/
│   │   ├── swap.ts          # DFlow swap endpoint proxy
│   │   └── alchemy.ts       # Alchemy RPC endpoint proxy
├── index-new.html           # HTML entry point
├── vite.config.js           # Vite configuration
├── wrangler.toml            # Cloudflare configuration
├── package.json             # Dependencies
└── .env.example             # Environment variables template

```

## Prerequisites
- Node.js 16+ and npm
- Cloudflare account
- Alchemy API key (free tier available at https://www.alchemy.com/)
- DFlow API key (from https://www.dflow.io/)

## Installation & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create a `wrangler.toml` file with your API keys (for production):
```toml
[env.production]
vars = { 
  ALCHEMY_API_KEY = "your_key_here",
  DFLOW_API_KEY = "your_key_here"
}
```

Or set them in your Cloudflare Pages project settings.

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Build for Production
```bash
npm run build
```

Output files are in the `dist/` directory.

## Deployment to Cloudflare Pages

### 1. Connect Your Repository
- Go to [Cloudflare Pages](https://pages.cloudflare.com/)
- Click "Create a project"
- Connect your Git repository
- Select the branch to deploy

### 2. Configure Build Settings
- **Framework preset**: None (custom)
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (leave default)

### 3. Set Environment Variables
In your Cloudflare Pages project:
1. Go to **Settings** → **Environment Variables**
2. Add the following variables:
   - `ALCHEMY_API_KEY` - Your Alchemy API key
   - `DFLOW_API_KEY` - Your DFlow API key

Set them for both **Production** and **Preview** environments.

### 4. Deploy
Push your changes to the connected branch, and Cloudflare Pages will automatically build and deploy.

## How API Keys Are Secured

### Original (Insecure)
```javascript
// ❌ BAD: API keys exposed in client-side code
const DFLOW_API_KEY = 'your_key_here';
const alchemyUrl = 'https://solana-mainnet.g.alchemy.com/v2/your_key_here';
```

### New (Secure)
```javascript
// ✅ GOOD: API calls go through Cloudflare Functions
const response = await fetch('/api/swap', {
  method: 'POST',
  body: JSON.stringify({
    endpoint: '/swap/quote',
    // ... swap parameters
  })
});
```

The Cloudflare Pages Functions automatically inject the API keys from environment variables on the server side, preventing client exposure.

## Layout & Functionality Preserved

✅ All original sections maintained:
- Home (hero, price ticker, burn highlight)
- About (project info, why Solana)
- Tokenomics (supply details)
- Burn (burn schedule)
- Roadmap (milestones)
- FAQ (Q&A section)
- Buy (swap interface)
- Footer (links, disclaimer)

✅ All original styles preserved:
- Dark theme (#0a0a0a background)
- Gradient accents (purple #9945FF, green #14F195, orange #f7931a)
- Responsive design (breakpoints at 992px, 768px, 480px, 380px)
- All animations and hover effects

## Migration Notes

### What Changed
1. Single HTML file → React component-based architecture
2. Inline JavaScript → Modular React hooks
3. Direct API calls → Cloudflare Pages Functions
4. CSS in `<style>` tag → Separate `styles.css`

### What Stayed the Same
- Layout and visual design
- All functionality
- Animation timings
- Color scheme
- Typography
- Responsive breakpoints
- All interactive features

## API Endpoints

### /api/swap
Proxies DFlow swap API requests securely.

**Request:**
```json
{
  "endpoint": "/swap/quote",
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "3tj92yVKduEBypdVh8nNViDgrbTaxpoSWAnzVdenpump",
  "amount": 1000000000,
  "slippageBps": 50
}
```

### /api/alchemy
Proxies Alchemy RPC requests securely.

**Request:**
```json
{
  "endpoint": "/",
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getBalance",
  "params": ["wallet_address"]
}
```

## Troubleshooting

### API Key Not Working
- Check that environment variables are set in Cloudflare Pages settings
- Verify API keys are valid and have appropriate permissions
- Check Cloudflare Functions logs for errors

### Build Fails
- Ensure Node.js version is 16+
- Run `npm install` to install all dependencies
- Check that all imports are correct

### Style Issues
- Clear browser cache
- Verify `styles.css` is loaded in Network tab
- Check media query breakpoints if on mobile

## Support

For issues with:
- **Cloudflare**: https://developers.cloudflare.com/
- **Alchemy**: https://www.alchemy.com/
- **DFlow**: https://www.dflow.io/
- **Solana**: https://docs.solana.com/

## Security Best Practices

1. **Never commit API keys** - Use environment variables only
2. **Rotate keys periodically** - Update Cloudflare settings
3. **Monitor usage** - Check Alchemy and DFlow dashboards
4. **Use IP whitelist** - If available in your API provider settings
5. **Rate limit** - Add rate limiting middleware if needed

---

**Created**: 2024
**Framework**: React 18 + Vite
**Deployment**: Cloudflare Pages
**Security**: Cloudflare Pages Functions
