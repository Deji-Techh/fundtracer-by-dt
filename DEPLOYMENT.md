# FundTracer Deployment Guide

## Overview
This guide will help you deploy FundTracer to Render.com with all necessary environment variables.

## Repository Information
- **GitHub Repo**: https://github.com/Deji-Tech/fundtracer-by-dt
- **Branch**: master
- **Render Blueprint**: render.yaml (included in repo)

## Prerequisites

### 1. GitHub Setup
- ✅ Code already pushed to: `https://github.com/Deji-Tech/fundtracer-by-dt`
- If you want to rename to "fundtracer" (private):
  1. Go to https://github.com/Deji-Tech/fundtracer-by-dt/settings
  2. Under "Repository name", change to "fundtracer"
  3. Under "Danger Zone", change visibility to Private
  4. Update remote URL: `git remote set-url origin https://github.com/Deji-Tech/fundtracer`

### 2. Firebase Project Setup
You need a Firebase project for authentication and database:

1. Go to https://console.firebase.google.com/
2. Create a new project (or use existing: `fundtracer-by-dt`)
3. Generate a service account key:
   - Project Settings → Service Accounts → Generate New Private Key
   - Save the JSON file securely
4. Note down these values from the service account JSON:
   - `project_id`
   - `client_email`
   - `private_key`

### 3. Alchemy API Key
Get a free API key from https://dashboard.alchemy.com/
- Create an account
- Create a new app
- Copy the API key

## Render.com Deployment Steps

### Step 1: Create Render Account
1. Go to https://render.com/
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 2: Deploy with Blueprint
1. In Render dashboard, click "Blueprints"
2. Click "New Blueprint Instance"
3. Connect your GitHub account
4. Select the repository: `Deji-Tech/fundtracer-by-dt`
5. Click "Approve" to allow Render to create services

### Step 3: Configure Environment Variables

After the blueprint creates the services, you'll need to manually add these environment variables:

#### For `fundtracer-api` (Backend):

**Required Variables:**
```
FIREBASE_PROJECT_ID=fundtracer-by-dt
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@fundtracer-by-dt.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n
DEFAULT_ALCHEMY_API_KEY=your_alchemy_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here_min_32_chars
```

**Notes:**
- For `FIREBASE_PRIVATE_KEY`, replace newlines with `\n` or use Render's multiline input
- `JWT_SECRET` should be a random string, at least 32 characters
- Generate a secure JWT secret: `openssl rand -base64 32`

#### For `fundtracer-web` (Frontend):

**Required Variables:**
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

**Note:** These are already in your local `.env` file

### Step 4: Deploy Services

1. Go to each service in Render dashboard
2. Click "Manual Deploy" → "Deploy latest commit"
3. Wait for build to complete (5-10 minutes)

### Step 5: Update CORS (After First Deploy)

Once you know your frontend URL:
1. Go to `fundtracer-api` service → Environment
2. Update `CORS_ORIGIN` to your actual frontend URL (e.g., `https://fundtracer-web.onrender.com`)
3. Redeploy the API service

### Step 6: Custom Domain (Optional)

1. In each service, go to Settings → Custom Domains
2. Add your domain (e.g., `fundtracer.xyz`)
3. Follow Render's DNS instructions
4. Update `CORS_ORIGIN` to your custom domain

## Environment Variables Reference

### Backend (fundtracer-api)
| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `PORT` | Yes | Set to `3001` |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Firebase service account private key |
| `DEFAULT_ALCHEMY_API_KEY` | Yes | Alchemy API key for blockchain data |
| `JWT_SECRET` | Yes | Secret for JWT token signing |
| `FREE_DAILY_LIMIT` | No | Daily analysis limit for free tier (default: 7) |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS |

### Frontend (fundtracer-web)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Yes | Google Analytics ID |
| `VITE_API_URL` | Yes | Backend API URL |

## Troubleshooting

### Build Failures
- Check that all environment variables are set correctly
- Ensure `JWT_SECRET` is at least 32 characters
- Verify Firebase credentials are valid

### CORS Errors
- Update `CORS_ORIGIN` in API service to match your frontend URL exactly
- Include `https://` prefix and no trailing slash

### Firebase Authentication Issues
- Verify service account has proper permissions
- Check that `FIREBASE_PRIVATE_KEY` is formatted correctly (with `\n` for newlines)

### API Not Connecting
- Verify `VITE_API_URL` in frontend matches the backend service URL
- Check backend health endpoint: `https://fundtracer-api.onrender.com/health`

## URLs After Deployment

Once deployed, your services will be available at:
- **Backend API**: `https://fundtracer-api.onrender.com`
- **Frontend**: `https://fundtracer-web.onrender.com`

## Next Steps

1. ✅ Code pushed to GitHub
2. ⏳ Create Render account
3. ⏳ Deploy using Blueprint
4. ⏳ Configure environment variables
5. ⏳ Test the deployment

## Support

If you encounter issues:
1. Check Render logs in the dashboard
2. Verify all environment variables are set
3. Test API health endpoint
4. Check browser console for frontend errors
