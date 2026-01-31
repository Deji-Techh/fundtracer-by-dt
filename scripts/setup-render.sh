#!/bin/bash

# Render Deployment Setup Script
# This script helps set up Render services and GitHub Actions secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER="Deji-Tech"
REPO_NAME="fundtracer-by-dt"
RENDER_API_KEY="rnd_r1d3It4WpgBi8CkBH6Ua76u8oBOS"

echo -e "${GREEN}🚀 FundTracer Render Deployment Setup${NC}"
echo "======================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed.${NC}"
    echo "Please install it first:"
    echo "  - macOS: brew install gh"
    echo "  - Ubuntu/Debian: sudo apt install gh"
    echo "  - Or visit: https://cli.github.com/"
    exit 1
fi

# Check if user is logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not logged in to GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI is configured${NC}"
echo ""

# Function to set GitHub secret
set_secret() {
    local name=$1
    local value=$2
    
    echo -n "Setting $name... "
    if gh secret set "$name" --body "$value" --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📋 Required Environment Variables${NC}"
echo "======================================"
echo ""

# Collect environment variables
echo "Please enter the following information:"
echo ""

read -p "Firebase Project ID [fundtracer-by-dt]: " FIREBASE_PROJECT_ID
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-fundtracer-by-dt}

read -p "Firebase Client Email: " FIREBASE_CLIENT_EMAIL
read -sp "Firebase Private Key (paste entire key with newlines): " FIREBASE_PRIVATE_KEY
echo ""

read -p "Alchemy API Key: " ALCHEMY_API_KEY

# Generate JWT secret if not provided
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
echo -e "${GREEN}Generated JWT_SECRET${NC}"

read -p "Backend URL [https://fundtracer-api.onrender.com]: " BACKEND_URL
BACKEND_URL=${BACKEND_URL:-https://fundtracer-api.onrender.com}

read -p "Frontend URL [https://fundtracer-web.onrender.com]: " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-https://fundtracer-web.onrender.com}

echo ""
echo -e "${YELLOW}📦 Setting GitHub Secrets${NC}"
echo "======================================"
echo ""

# Set all secrets
set_secret "RENDER_API_KEY" "$RENDER_API_KEY"
set_secret "FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
set_secret "FIREBASE_CLIENT_EMAIL" "$FIREBASE_CLIENT_EMAIL"
set_secret "FIREBASE_PRIVATE_KEY" "$FIREBASE_PRIVATE_KEY"
set_secret "ALCHEMY_API_KEY" "$ALCHEMY_API_KEY"
set_secret "JWT_SECRET" "$JWT_SECRET"
set_secret "BACKEND_URL" "$BACKEND_URL"
set_secret "FRONTEND_URL" "$FRONTEND_URL"

# Firebase Web Config (from your .env file)
set_secret "VITE_FIREBASE_API_KEY" "AIzaSyDIHXSDeSzIlnCEzAYOB9TjO5whGn__i8o"
set_secret "VITE_FIREBASE_AUTH_DOMAIN" "fundtracer-by-dt.firebaseapp.com"
set_secret "VITE_FIREBASE_PROJECT_ID" "$FIREBASE_PROJECT_ID"
set_secret "VITE_FIREBASE_STORAGE_BUCKET" "fundtracer-by-dt.firebasestorage.app"
set_secret "VITE_FIREBASE_MESSAGING_SENDER_ID" "486546370849"
set_secret "VITE_FIREBASE_APP_ID" "1:486546370849:web:b040790b3fdc0a47bbce60"
set_secret "VITE_FIREBASE_MEASUREMENT_ID" "G-3F10VCNG4B"

echo ""
echo -e "${YELLOW}🔧 Creating Render Services${NC}"
echo "======================================"
echo ""

# Create backend service
echo "Creating backend service (fundtracer-api)..."
BACKEND_SERVICE=$(curl -s -X POST \
  https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "web_service",
    "name": "fundtracer-api",
    "ownerId": "usr-'"$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/users | jq -r '.[0].id')"'",
    "region": "oregon",
    "env": "node",
    "plan": "starter",
    "branch": "master",
    "repo": "https://github.com/'$REPO_OWNER'/'$REPO_NAME'",
    "buildCommand": "npm install && npm run build --workspace=@fundtracer/core && npm run build --workspace=@fundtracer/server",
    "startCommand": "npm start --workspace=@fundtracer/server",
    "healthCheckPath": "/health"
  }' | jq -r '.service.id // empty')

if [ -n "$BACKEND_SERVICE" ]; then
    echo -e "${GREEN}✅ Backend service created: $BACKEND_SERVICE${NC}"
    set_secret "RENDER_API_SERVICE_ID" "$BACKEND_SERVICE"
else
    echo -e "${YELLOW}⚠️  Backend service may already exist or error occurred${NC}"
fi

# Create frontend service
echo "Creating frontend service (fundtracer-web)..."
FRONTEND_SERVICE=$(curl -s -X POST \
  https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "static_site",
    "name": "fundtracer-web",
    "ownerId": "usr-'"$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/users | jq -r '.[0].id')"'",
    "region": "oregon",
    "branch": "master",
    "repo": "https://github.com/'$REPO_OWNER'/'$REPO_NAME'",
    "buildCommand": "npm install && npm run build --workspace=@fundtracer/core && npm run build --workspace=@fundtracer/web",
    "publishPath": "./packages/web/dist"
  }' | jq -r '.service.id // empty')

if [ -n "$FRONTEND_SERVICE" ]; then
    echo -e "${GREEN}✅ Frontend service created: $FRONTEND_SERVICE${NC}"
    set_secret "RENDER_WEB_SERVICE_ID" "$FRONTEND_SERVICE"
else
    echo -e "${YELLOW}⚠️  Frontend service may already exist or error occurred${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. GitHub Secrets have been set"
echo "2. Render services created (or already exist)"
echo "3. Push to master to trigger deployment:"
echo "   git push origin master"
echo ""
echo "Monitor deployment at:"
echo "  - Backend: $BACKEND_URL"
echo "  - Frontend: $FRONTEND_URL"
echo ""
echo "Or manually trigger deployment from GitHub Actions tab"
