# Deployment Checklist

## Pre-Deployment ✅

- [x] React components created and tested
- [x] Cloudflare Pages Functions configured
- [x] CSS styles preserved (all 1300+ lines)
- [x] All sections implemented
- [x] Build test successful (89KB HTML, 15KB gzipped)
- [x] Documentation complete

## Local Testing (Before Pushing)

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
# Check: http://localhost:5173 loads correctly

# 3. Test each section
- [ ] Click Home - Hero loads with price ticker
- [ ] Click About - Content displays
- [ ] Click Tokenomics - Table shows correctly
- [ ] Click Burn - Schedule visible
- [ ] Click Roadmap - 6 items shown
- [ ] Click FAQ - Questions expandable
- [ ] Click Buy - Swap card loads

# 4. Test responsive design
- [ ] Desktop (1920px+)
- [ ] Laptop (1200px)
- [ ] Tablet (768px) - hamburger menu appears
- [ ] Mobile (480px) - layout adjusts
- [ ] Small mobile (380px) - still readable

# 5. Build production version
npm run build
# Check: dist/index.html is ~89KB
```

## GitHub Setup

```bash
# 1. Commit changes
git add .
git commit -m "Convert HTML to React with Cloudflare Functions for secure API handling

- Converted single HTML file to modular React components
- Created 10 React components (Header, Footer, 7 sections)
- Added Cloudflare Pages Functions for API security
- Preserved all original styling and functionality
- Optimized for production with Vite"

# 2. Push to repository
git push origin main
```

## Cloudflare Pages Deployment

### Step 1: Connect Repository
- [ ] Visit https://pages.cloudflare.com/
- [ ] Click "Create a project"
- [ ] Select "Connect to Git"
- [ ] Choose your GitHub repository
- [ ] Select branch: `main`

### Step 2: Configure Build Settings
- [ ] Build command: `npm run build`
- [ ] Build output directory: `dist`
- [ ] Root directory: `/`
- [ ] Framework: None (leave blank)

### Step 3: Add Environment Variables
- [ ] Click "Settings" → "Environment Variables"
- [ ] Add variable for **Production**:
  ```
  Name: ALCHEMY_API_KEY
  Value: [your_alchemy_key]
  ```
- [ ] Add variable for **Production**:
  ```
  Name: DFLOW_API_KEY
  Value: [your_dflow_key]
  ```
- [ ] Repeat for **Preview** environment

### Step 4: Deploy
- [ ] Save all settings
- [ ] Cloudflare automatically triggers build
- [ ] Wait for "Build successful" message
- [ ] Visit your new site URL

---

## Post-Deployment Verification

### Check Deployment Success
- [ ] Site loads without errors
- [ ] No 404 errors in console
- [ ] CSS styles apply correctly
- [ ] All sections accessible

### Test Functionality
- [ ] Home section shows with gradient text
- [ ] Price ticker updates from API
- [ ] Swap card displays correctly
- [ ] Form inputs responsive
- [ ] Toast notifications appear
- [ ] FAQ items expand/collapse

### Test Responsive Design
- [ ] Mobile menu (hamburger) works
- [ ] Layout adjusts on tablet
- [ ] Text readable on all sizes
- [ ] Images scale properly
- [ ] No horizontal scrolling

### Monitor for Errors
- [ ] Check Cloudflare Analytics
- [ ] Review worker logs (if any errors)
- [ ] Monitor API key usage
- [ ] Check for 5xx errors

---

## Production Maintenance

### Weekly
- [ ] Monitor Cloudflare Analytics
- [ ] Check API key usage (Alchemy + DFlow)
- [ ] Review error logs
- [ ] Test core functionality

### Monthly
- [ ] Rotate API keys if needed
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Backup configuration

### As Needed
- [ ] Update price ticker refresh rate
- [ ] Adjust slippage settings
- [ ] Add new features
- [ ] Fix bugs or issues

---

## API Key Management

### Security Checklist
- [ ] API keys stored in Cloudflare environment (NOT in code)
- [ ] Never commit `.env` file to Git
- [ ] Use strong/random keys from providers
- [ ] Set API key permissions to minimum required
- [ ] Monitor usage for suspicious activity

### Access Control
- [ ] Only required team members have API keys
- [ ] Rotate keys quarterly
- [ ] Use separate keys for prod/staging
- [ ] Revoke old keys after rotation

---

## Troubleshooting

### If Site Won't Load
1. [ ] Check build logs in Cloudflare
2. [ ] Verify `npm run build` works locally
3. [ ] Check for Node.js version incompatibility
4. [ ] Verify all dependencies installed

### If API Calls Fail
1. [ ] Verify environment variables are set
2. [ ] Check variable names are exact (`ALCHEMY_API_KEY`, `DFLOW_API_KEY`)
3. [ ] Verify API keys are valid in provider dashboards
4. [ ] Check Cloudflare function logs for errors

### If Styles Look Wrong
1. [ ] Clear browser cache (Ctrl+Shift+Del)
2. [ ] Verify CSS file loaded in Network tab
3. [ ] Check for CSS syntax errors in build output
4. [ ] Verify media queries applying at breakpoints

### If Page Is Slow
1. [ ] Check Cloudflare Analytics for latency
2. [ ] Verify API responses are fast
3. [ ] Check for large images or unoptimized assets
4. [ ] Review bundle size: `npm run build` output

---

## Rollback Plan

If something breaks after deployment:

```bash
# 1. Check what changed
git log --oneline -5

# 2. Revert to previous version
git revert HEAD --no-edit
git push origin main

# OR revert to specific commit
git reset --hard [commit-hash]
git push origin main --force

# 3. Cloudflare auto-deploys previous version
```

---

## Launch Checklist

Before announcing the launch:

- [ ] All sections load correctly
- [ ] Swap functionality working
- [ ] Price ticker updating
- [ ] No console errors
- [ ] Mobile responsive ✓
- [ ] API keys secure ✓
- [ ] Documentation complete ✓
- [ ] Monitoring setup ✓

---

## Success Criteria

✅ **Deployment is successful when:**
1. Site loads without errors
2. All sections display correctly
3. Styles match original design exactly
4. Swap interface functional
5. Price data updates live
6. Mobile responsive works
7. No API keys exposed
8. Analytics collecting data
9. Team can maintain codebase
10. Performance is fast (<2s load)

---

**Ready to deploy? Follow the steps above in order!**
