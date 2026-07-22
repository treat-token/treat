# DFlow API Setup Guide for Swap Integration

## Problem
The swap is currently failing with `POST /api/dflow 400 (Bad Request)` because the **DFLOW_API_KEY is not properly configured**.

## Root Cause
In `wrangler.toml`, the API key is set to a placeholder:
```toml
[vars]
DFLOW_API_KEY = "REPLACE_ENV.DFLOW_API_KEY"
```

This is not a valid API key and needs to be replaced with your actual DFlow API key.

## Solution

### Step 1: Get Your DFlow API Key
1. Go to https://dflow.net (or your DFlow provider)
2. Sign up or log in to your account
3. Generate an API key from your dashboard
4. Copy the API key

### Step 2: Set the API Key in Cloudflare

You have two options:

#### Option A: Using Wrangler CLI (Recommended)
```bash
wrangler secret put DFLOW_API_KEY
# Paste your API key when prompted
```

#### Option B: Using Cloudflare Dashboard
1. Go to https://dash.cloudflare.com/
2. Select your Workers project
3. Go to Settings → Environment Variables
4. Add/update `DFLOW_API_KEY` with your actual key
5. Deploy the changes

#### Option C: Update wrangler.toml (for development only)
Edit `wrangler.toml`:
```toml
[vars]
DFLOW_API_KEY = "your-actual-dflow-api-key-here"
ALCHEMY_API_KEY = "k5jwTvMDFEvbPGj5yreGA"
```

⚠️ **Warning**: Do NOT commit real API keys to git. Use Wrangler CLI or Cloudflare Dashboard for production.

### Step 3: Verify Setup
After setting the API key:
1. Restart your dev server
2. Try the swap again
3. Check browser console for logs:
   - If successful: "✅ DFlow quote successful"
   - If failed: More detailed error message will appear

## How the Swap Flow Works

```
User clicks "Swap Now"
    ↓
Gets quote from DFlow API
    ↓
Builds swap transaction from DFlow
    ↓
Deserializes transaction
    ↓
Signs with Fixorium Wallet (user approval)
    ↓
Sends to Solana RPC
    ↓
✅ Swap complete!
```

## Troubleshooting

### "API key not configured" Error
- Check that `DFLOW_API_KEY` is set in Cloudflare
- Verify it's not the placeholder value
- Restart dev server after setting the key

### "DFlow API error: 400" Error
- Check that the API key format is correct
- Verify the API key has valid permissions
- Check Cloudflare Worker logs for more details

### "DFlow API error: 401" Error
- The API key is invalid or expired
- Get a new API key from DFlow
- Update it in Cloudflare

### "No quote received from DFlow" Error
- The quote endpoint may have specific parameter requirements
- Check DFlow API documentation for exact parameters
- Look at Cloudflare logs for the actual error response

## Environment Variables Reference

| Variable | Value | Source |
|----------|-------|--------|
| `DFLOW_API_KEY` | Your DFlow API key | DFlow Dashboard |
| `ALCHEMY_API_KEY` | Your Alchemy API key | Already set |

## Current Integration Points

- **DFlow Quote**: `/api/dflow?endpoint=quote&method=GET`
- **DFlow Swap**: `/api/dflow?endpoint=swap&method=POST`
- **Fixorium Wallet**: Signs transaction via keypair
- **Solana RPC**: Sends signed transaction

## Next Steps

1. ✅ Set `DFLOW_API_KEY` in Cloudflare
2. ✅ Restart dev server
3. ✅ Test swap button
4. ✅ Check browser console for success/error logs
