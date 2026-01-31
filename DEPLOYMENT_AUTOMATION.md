# Automated Render Deployment

This repository includes automated deployment to Render.com using GitHub Actions. All you need to do is run one command to set up everything!

## Prerequisites

1. **GitHub CLI (gh)** - Required to set secrets
   - macOS: `brew install gh`
   - Ubuntu/Debian: `sudo apt install gh`
   - Windows: `winget install --id GitHub.cli`
   - After installing, run: `gh auth login`

2. **Your Firebase Service Account** - You need the service account JSON from Firebase
   - Go to: https://console.firebase.google.com/
   - Project Settings → Service Accounts → Generate New Private Key
   - Save the JSON file securely

3. **Alchemy API Key** - Get from https://dashboard.alchemy.com/

## Quick Start (Automated Setup)

### Option 1: Python Script (Recommended)

```bash
cd fundtracer-by-dt
python3 scripts/deploy-render.py
```

The script will:
1. ✅ Check GitHub CLI is installed
2. ✅ Ask for your Firebase and Alchemy credentials
3. ✅ Set all GitHub secrets automatically
4. ✅ Create Render services (backend + frontend)
5. ✅ Configure service IDs as secrets

### Option 2: Bash Script

```bash
cd fundtracer-by-dt
./scripts/setup-render.sh
```

### Option 3: Manual Setup

If you prefer to set things up manually, follow the steps below.

## Manual Setup (If Scripts Don't Work)

### Step 1: Set GitHub Secrets

Go to your repository settings: https://github.com/Deji-Tech/fundtracer-by-dt/settings/secrets/actions

Add these secrets:

**Render Configuration:**
```
RENDER_API_KEY=rnd_r1d3It4WpgBi8CkBH6Ua76u8oBOS
RENDER_API_SERVICE_ID=<get from render dashboard after creation>
RENDER_WEB_SERVICE_ID=<get from render dashboard after creation>
```

**Backend Environment:**
```
FIREBASE_PROJECT_ID=fundtracer-by-dt
FIREBASE_CLIENT_EMAIL=your-service-account@fundtracer-by-dt.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
ALCHEMY_API_KEY=your_alchemy_key_here
JWT_SECRET=<generate with: openssl rand -base64 32>
BACKEND_URL=https://fundtracer-api.onrender.com
FRONTEND_URL=https://fundtracer-web.onrender.com
```

**Frontend Environment:**
```
VITE_FIREBASE_API_KEY=AIzaSyDIHXSDeSzIlnCEzAYOB9TjO5whGn__i8o
VITE_FIREBASE_AUTH_DOMAIN=fundtracer-by-dt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fundtracer-by-dt
VITE_FIREBASE_STORAGE_BUCKET=fundtracer-by-dt.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=486546370849
VITE_FIREBASE_APP_ID=1:486546370849:web:b040790b3fdc0a47bbce60
VITE_FIREBASE_MEASUREMENT_ID=G-3F10VCNG4B
VITE_API_URL=https://fundtracer-api.onrender.com
```

### Step 2: Create Render Services via Blueprint

1. Go to https://dashboard.render.com/
2. Sign in with GitHub
3. Click "Blueprints" → "New Blueprint Instance"
4. Select: `Deji-Tech/fundtracer-by-dt`
5. Click "Approve"

This will create two services:
- `fundtracer-api` - Backend API
- `fundtracer-web` - Frontend static site

### Step 3: Get Service IDs

After services are created:

1. Go to each service in Render dashboard
2. Click Settings
3. Copy the Service ID (looks like: `srv-xxxxxxxxxxxxxxxx`)
4. Add to GitHub secrets as:
   - `RENDER_API_SERVICE_ID` (for backend)
   - `RENDER_WEB_SERVICE_ID` (for frontend)

### Step 4: Deploy!

Push to master to trigger deployment:

```bash
git push origin master
```

Or manually trigger from GitHub Actions: https://github.com/Deji-Tech/fundtracer-by-dt/actions

## What Happens During Deployment?

### GitHub Actions Workflow:

1. **Backend Deployment**:
   - Installs dependencies
   - Builds `@fundtracer/core`
   - Builds `@fundtracer/server`
   - Deploys to Render
   - Sets environment variables

2. **Frontend Deployment**:
   - Waits for backend to finish
   - Builds with production environment variables
   - Deploys static site to Render
   - Sets environment variables

### Build Process:

```
Install → Build Core → Build Server → Build Web → Deploy
```

## Monitoring Deployment

**GitHub Actions**: https://github.com/Deji-Tech/fundtracer-by-dt/actions

**Render Dashboard**: https://dashboard.render.com/

**Your URLs** (after deployment):
- Backend: https://fundtracer-api.onrender.com
- Frontend: https://fundtracer-web.onrender.com

## Environment Variables Reference

### Backend (fundtracer-api)

| Variable | Description | Source |
|----------|-------------|--------|
| `NODE_ENV` | production | hardcoded |
| `PORT` | 3001 | hardcoded |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Firebase service account JSON |
| `DEFAULT_ALCHEMY_API_KEY` | Alchemy API key | Alchemy Dashboard |
| `JWT_SECRET` | Random 32+ char string | Generate with openssl |
| `FREE_DAILY_LIMIT` | 7 | hardcoded |
| `CORS_ORIGIN` | Frontend URL | your frontend URL |

### Frontend (fundtracer-web)

| Variable | Description | Value |
|----------|-------------|-------|
| `VITE_FIREBASE_API_KEY` | Firebase web API | AIzaSyDIHXSDeSzIlnCEzAYOB9TjO5whGn__i8o |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | fundtracer-by-dt.firebaseapp.com |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | fundtracer-by-dt |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage | fundtracer-by-dt.firebasestorage.app |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | 486546370849 |
| `VITE_FIREBASE_APP_ID` | App ID | 1:486546370849:web:b040790b3fdc0a47bbce60 |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics | G-3F10VCNG4B |
| `VITE_API_URL` | Backend URL | https://fundtracer-api.onrender.com |

## Troubleshooting

### Build Failures

Check GitHub Actions logs: https://github.com/Deji-Tech/fundtracer-by-dt/actions

Common issues:
1. **Missing secrets** - Make sure all required secrets are set
2. **Invalid Firebase credentials** - Verify private key format
3. **Build timeouts** - Free tier has build limits

### CORS Errors

Update `CORS_ORIGIN` in backend environment variables to match your exact frontend URL.

### Service Not Found

If GitHub Actions can't find the Render service:
1. Check that `RENDER_API_SERVICE_ID` and `RENDER_WEB_SERVICE_ID` are set correctly
2. Service IDs look like: `srv-xxxxxxxxxxxxxxxxxxxxx`
3. Get them from Render dashboard → Service → Settings

### Manual Deployment

If GitHub Actions fails, you can deploy manually:

```bash
# Deploy backend
npm install
npm run build --workspace=@fundtracer/core
npm run build --workspace=@fundtracer/server
# Then use Render dashboard to deploy

# Deploy frontend
npm run build --workspace=@fundtracer/web
# Then use Render dashboard to deploy static site
```

## Custom Domain (Optional)

After deployment, add your custom domain:

1. In Render dashboard, go to each service
2. Settings → Custom Domains
3. Add your domain
4. Update DNS as instructed
5. Update `CORS_ORIGIN` and `VITE_API_URL` with your custom domain

## Support

- **GitHub Issues**: https://github.com/Deji-Tech/fundtracer-by-dt/issues
- **Render Docs**: https://render.com/docs
- **GitHub Actions Docs**: https://docs.github.com/en/actions

## Security Notes

⚠️ **Important**: 
- Never commit the `RENDER_API_KEY` or other secrets to the repository
- All secrets are stored in GitHub Secrets and Render Environment Variables
- The `.env` file is in `.gitignore` and should never be committed
- Rotate your `JWT_SECRET` periodically for better security
