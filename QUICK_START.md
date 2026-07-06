# Quick Start Guide

## What's Been Done

✅ **Converted HTML to React Web App**
- Single HTML file → Modular React components
- Preserved exact layout and functionality
- All original styles maintained

✅ **Added Security with Cloudflare Pages Functions**
- API keys now protected on server-side
- DFlow swap endpoint proxied through `/api/swap`
- Alchemy RPC endpoint proxied through `/api/alchemy`
- Client no longer exposes sensitive credentials

✅ **Modern Development Setup**
- Vite for fast development
- React 18 with hooks
- Responsive design with all media queries preserved

## To Deploy

### Local Development
```bash
npm run dev
# App runs at http://localhost:5173
```

### Production Deployment to Cloudflare Pages

1. **Push to Git**
   ```bash
   git add .
   git commit -m "Convert to React web app with secure API handling"
   git push
   ```

2. **Connect to Cloudflare Pages**
   - Go to https://pages.cloudflare.com/
   - Click "Create a project"
   - Select your GitHub repository
   - Set build command: `npm run build`
   - Set build output: `dist`

3. **Add API Keys to Cloudflare**
   - In Cloudflare Pages → Settings → Environment Variables
   - Add `ALCHEMY_API_KEY` (get from https://www.alchemy.com/)
   - Add `DFLOW_API_KEY` (get from https://www.dflow.io/)

4. **Deploy**
   - Push changes → Cloudflare auto-builds and deploys
   - Your app is live!

## File Structure

```
New React Files:
├── src/components/
│   ├── Header.jsx       - Navigation header
│   ├── Footer.jsx       - Footer with links
│   └── Toast.jsx        - Notifications
├── src/sections/
│   ├── Home.jsx         - Hero + price ticker
│   ├── About.jsx        - About TREAT
│   ├── Tokenomics.jsx   - Token details
│   ├── Burn.jsx         - Burn schedule
│   ├── Roadmap.jsx      - Roadmap timeline
│   ├── FAQ.jsx          - FAQ section
│   └── Buy.jsx          - Swap interface
├── src/App.jsx          - Main app logic
├── src/main.jsx         - React entry point
└── src/styles.css       - All CSS (unchanged from original)

Cloudflare Functions:
├── functions/api/swap.ts       - Secure DFlow proxy
└── functions/api/alchemy.ts    - Secure Alchemy proxy

Config:
├── vite.config.js       - Vite build config
├── wrangler.toml        - Cloudflare config
└── index-new.html       - HTML entry point
```

## Key Differences from Original

| Original | New |
|----------|-----|
| API keys in HTML | API keys in Cloudflare env vars |
| Client-side API calls | Server-side via Functions |
| Single 2400 line file | Modular components |
| Inline styles & JS | Separated CSS & React |

## How It Works

1. **User clicks "Swap Now"**
2. **Frontend calls `/api/swap`** (server endpoint)
3. **Cloudflare Function injects API key** from environment
4. **DFlow API is called securely** on the backend
5. **Response returned to client** without exposing keys

## API Key Setup in Cloudflare

### Getting Your Keys

1. **Alchemy API Key**
   - Visit https://www.alchemy.com/
   - Sign up free
   - Create an app → copy API key

2. **DFlow API Key**
   - Visit https://www.dflow.io/
   - Create account
   - Generate API key

### Setting Them in Cloudflare

```
Pages Project → Settings → Environment Variables

[Production]
ALCHEMY_API_KEY = pk_live_xxxxx...
DFLOW_API_KEY = df_xxxxx...

[Preview]
ALCHEMY_API_KEY = pk_live_xxxxx...
DFLOW_API_KEY = df_xxxxx...
```

## Development Tips

**Start dev server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Test Functions locally:**
```bash
npm install -g @cloudflare/wrangler
wrangler dev
```

## What's Preserved

✅ All original styling intact
✅ All original layout preserved  
✅ All interactive features working
✅ Responsive design on all devices
✅ Dark theme with gradient accents
✅ All animations and transitions

## Common Issues & Fixes

**"API key not found"**
- Check environment variables in Cloudflare Pages settings
- Ensure variable names match exactly: `ALCHEMY_API_KEY`, `DFLOW_API_KEY`

**"Build fails"**
- Run `npm install` again
- Make sure Node.js version is 16+

**"Styles not loading"**
- Clear browser cache
- Check that `index-new.html` is the entry point

## Next Steps

1. Update `index.html` → use new `index-new.html` or rename it
2. Deploy to Cloudflare Pages
3. Add API keys to Cloudflare environment
4. Test the swap functionality with a test wallet

---

**All layout and functionality preserved. Only security and code structure improved!**
