# 🚀 FundTracer Deployment Checklist

## Pre-Deployment (Do This First!)

### 1. ✅ Rotate Exposed Secrets (CRITICAL)

**You shared production secrets in chat - rotate them NOW:**

```bash
# Generate new Firebase service account key:
# 1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
# 2. Select your project: fundtracer-by-dt
# 3. Find your service account (firebase-adminsdk-...)
# 4. Click "Keys" → "Add Key" → "Create new key" → JSON
# 5. Download the new key file
# 6. Delete the old key that was exposed

# Generate new Alchemy API key:
# 1. Go to: https://dashboard.alchemy.com/
# 2. Create a new app or regenerate API key
# 3. Delete the old key
```

### 2. ✅ Prepare Environment Variables

You need to set these in **Render Dashboard** after deployment:

#### Backend Environment Variables (`fundtracer-api` service):

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `FIREBASE_PROJECT_ID` | `fundtracer-by-dt` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-...` | service-account.json file |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY...` | service-account.json file |
| `DEFAULT_ALCHEMY_API_KEY` | `your-alchemy-key` | Alchemy Dashboard |
| `JWT_SECRET` | random-32-char-string | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` | Already set in render.yaml |
| `PORT` | `3001` | Already set in render.yaml |

**Alternative (Easier): Use Base64 Service Account**
Instead of setting 3 Firebase variables, you can use:
- `FIREBASE_SERVICE_ACCOUNT_BASE64`: Base64-encoded service account JSON

```bash
# Generate base64 from service account file:
base64 -i service-account.json | pbcopy  # macOS
base64 -i service-account.json -w 0 | xclip -selection clipboard  # Linux
```

#### Frontend Environment Variables (`fundtracer-web` service):

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `VITE_WALLETCONNECT_PROJECT_ID` | `50d2e6a49b5c231708de8e982bf538d5` | Already in reown.config.ts (can also set in env) |
| `VITE_API_URL` | Leave empty (uses same domain) | Not needed for Render |

---

## Deployment Steps

### Step 1: Push to GitHub

```bash
# From your project root:
git add .
git commit -m "feat: fix wallet login configuration and add deployment configs

- Fix AuthContext to use correct wallet address field
- Add auto-signin when wallet connects
- Update reown.config with proper AppKit v1.8+ wallet IDs
- Add JWT_SECRET and improve render.yaml
- Update .gitignore for better secret protection
- Create deployment documentation"

git push origin master
```

### Step 2: Connect to Render

1. **Go to:** https://dashboard.render.com/
2. **Click:** "New" → "Blueprint"
3. **Connect:** Your GitHub repository (fundtracer-by-dt)
4. **Select:** Branch `master`
5. **Click:** "Approve" to create resources

Render will automatically:
- Create `fundtracer-api` (Node.js backend)
- Create `fundtracer-web` (Static frontend)
- Run the build commands from `render.yaml`

### Step 3: Set Environment Variables (CRITICAL)

**Do this BEFORE the first deploy completes:**

1. In Render dashboard, click on `fundtracer-api` service
2. Go to "Environment" tab
3. Add each environment variable from the table above
4. Click "Save Changes"

### Step 4: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for build to complete (2-3 minutes)
3. Check logs for any errors

---

## Post-Deployment Verification

### Test the Health Endpoint

```bash
curl https://your-api-url.onrender.com/health
```

Should return: `{"status":"ok"}`

### Test Wallet Login

1. Visit your deployed frontend URL
2. Click "Connect Wallet"
3. Connect with MetaMask or other wallet
4. Sign the login message
5. Should see your wallet address and tier info

### Verify Database Connection

Check Render logs for:
```
[Firebase] ✅ Initialized from base64 service account
```

Or if using individual vars:
```
[Firebase] Project ID: ✓ set
[Firebase] Client Email: ✓ set
[Firebase] Private Key: ✓ set (XXX chars)
[Firebase] ✅ Initialized from env vars
```

---

## Troubleshooting

### Build Fails

**Problem:** `npm install` fails or build errors

**Solution:**
```bash
# Try building locally first:
npm install
npm run build
```

### Firebase Connection Fails

**Problem:** Logs show "Firebase credentials not configured"

**Solution:**
1. Double-check environment variables are set
2. For `FIREBASE_PRIVATE_KEY`: Make sure newlines are preserved:
   - Copy the key exactly as-is from service account JSON
   - Or use base64 method (easier)

### Wallet Won't Connect

**Problem:** Wallet modal doesn't open or connections fail

**Solution:**
1. Check browser console for errors
2. Verify `VITE_WALLETCONNECT_PROJECT_ID` is set
3. Check Content Security Policy in server logs

### API Returns 401

**Problem:** Authentication not working

**Solution:**
1. Check `JWT_SECRET` is set in backend
2. Clear browser localStorage and try again
3. Check Firebase user document is created

---

## URLs After Deployment

After successful deployment, you'll have:

- **Frontend:** `https://fundtracer-web.onrender.com`
- **Backend:** `https://fundtracer-api.onrender.com`
- **Health Check:** `https://fundtracer-api.onrender.com/health`

You can configure custom domains in Render dashboard.

---

## Files Changed in This Deployment

✅ `packages/web/src/contexts/AuthContext.tsx` - Fixed wallet address field
✅ `packages/web/src/reown.config.ts` - Updated wallet configuration
✅ `packages/web/.env.example` - Added environment variable template
✅ `render.yaml` - Added JWT_SECRET and improved config
✅ `.gitignore` - Enhanced secret protection
✅ `SECRETS.md` - Security documentation
✅ `DEPLOYMENT_CHECKLIST.md` - This file

---

## Quick Reference

### Generate JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Base64 Encode Service Account
```bash
# macOS:
base64 -i service-account.json | pbcopy

# Linux:
base64 -i service-account.json -w 0 | xclip -selection clipboard
```

### Check Render Logs
1. Go to render.com dashboard
2. Click on your service
3. Click "Logs" tab
4. Watch for errors

---

## Need Help?

If deployment fails:
1. Check Render logs (they're very detailed)
2. Verify all environment variables are set
3. Make sure you rotated the exposed secrets
4. Test locally first: `npm run dev:server` and `npm run dev`

Good luck! 🚀
