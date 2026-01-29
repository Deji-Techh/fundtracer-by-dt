# Secret Management Guide

## ⚠️ CRITICAL: Never Commit Secrets

You just shared production secrets in chat. Here's how to properly manage them:

## Immediate Actions Required

1. **Rotate your secrets immediately:**
   - Generate a new Firebase service account key in Google Cloud Console
   - Generate a new Alchemy API key in your Alchemy dashboard
   - Generate a new WalletConnect Project ID in Reown Cloud (if that was also exposed)

2. **Remove exposed secrets from git history:**
   ```bash
   # If you committed secrets, you need to rewrite git history
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch path/to/secret-file" \
   --prune-empty --tag-name-filter cat -- --all
   ```

## Proper Secret Management

### For Local Development

1. Create a `.env` file in `/packages/web/` (it's already in `.gitignore`):
   ```bash
   cd packages/web
   cp .env.example .env
   # Edit .env and add your real values (never commit this file)
   ```

2. Required variables for wallet login:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=your_real_project_id_here
   ```

### For Production (Cloud Deployment)

#### Option 1: Environment Variables in Hosting Platform
- **Vercel**: Settings → Environment Variables
- **Netlify**: Site settings → Build & deploy → Environment
- **Railway**: Project → Variables

#### Option 2: Secret Managers (Recommended for production)
- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault
- Doppler

### For Server Secrets (Firebase, Alchemy)

Create `/packages/server/.env`:
```env
# Server-side only - never expose to frontend
DEFAULT_ALCHEMY_API_KEY=your_server_alchemy_key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-service-account.json
JWT_SECRET=your_random_jwt_secret_min_32_chars
```

## What Counts as a Secret?

**NEVER commit or share:**
- Private keys (Firebase service accounts, ETH wallets, etc.)
- API keys with write access or sensitive data
- JWT secrets
- Database connection strings with passwords
- OAuth client secrets

**OK to share (with caution):**
- WalletConnect Project ID (limited risk, but still keep private)
- Public API keys for read-only services
- Firebase config (apiKey, authDomain, projectId) - these are client-side anyway

## Current Status

✅ I've fixed your wallet login configuration:
1. Created `.env.example` with proper structure
2. Fixed `AuthContext.tsx` to use correct wallet address field
3. Added automatic sign-in when wallet connects
4. Verified `ConnectButton` and `reown.config.ts` are properly configured

**Next steps:**
1. Set your `VITE_WALLETCONNECT_PROJECT_ID` in production environment
2. Rotate any exposed secrets immediately
3. Run `npm install` in the web package directory
4. Test the wallet connection
