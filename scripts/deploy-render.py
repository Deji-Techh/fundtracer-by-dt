#!/usr/bin/env python3
"""
Render Deployment Automation Script
Automates the creation of Render services and configuration of GitHub secrets
"""

import os
import sys
import json
import base64
import subprocess
import secrets
import string
from pathlib import Path

# Configuration
REPO_OWNER = "Deji-Tech"
REPO_NAME = "fundtracer-by-dt"
RENDER_API_KEY = "rnd_r1d3It4WpgBi8CkBH6Ua76u8oBOS"

def print_header(text):
    print(f"\n{'='*60}")
    print(f"🚀 {text}")
    print(f"{'='*60}\n")

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_warning(text):
    print(f"⚠️  {text}")

def run_command(cmd, check=True):
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            check=check, 
            capture_output=True, 
            text=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        if check:
            print_error(f"Command failed: {cmd}")
            print(f"Error: {e.stderr}")
        return None

def check_github_cli():
    """Check if GitHub CLI is installed and authenticated"""
    print("Checking GitHub CLI...")
    
    if run_command("which gh", check=False) is None:
        print_error("GitHub CLI (gh) is not installed")
        print("\nInstall it:")
        print("  macOS: brew install gh")
        print("  Ubuntu/Debian: sudo apt install gh")
        print("  Windows: winget install --id GitHub.cli")
        print("  Or visit: https://cli.github.com/")
        return False
    
    if run_command("gh auth status", check=False) is None:
        print_error("Not logged in to GitHub CLI")
        print("\nPlease run: gh auth login")
        return False
    
    print_success("GitHub CLI is ready")
    return True

def set_github_secret(name, value):
    """Set a GitHub secret using gh CLI"""
    cmd = f'gh secret set "{name}" --body "{value}" --repo "{REPO_OWNER}/{REPO_NAME}"'
    result = run_command(cmd, check=False)
    return result is not None

def generate_jwt_secret():
    """Generate a secure JWT secret"""
    alphabet = string.ascii_letters + string.digits + string.punctuation
    return ''.join(secrets.choice(alphabet) for _ in range(64))

def get_user_input():
    """Collect all required environment variables from user"""
    print_header("Environment Variables Setup")
    
    env_vars = {}
    
    print("Please enter the following information:\n")
    
    # Firebase Configuration
    env_vars['FIREBASE_PROJECT_ID'] = input("Firebase Project ID [fundtracer-by-dt]: ").strip() or "fundtracer-by-dt"
    env_vars['FIREBASE_CLIENT_EMAIL'] = input("Firebase Client Email: ").strip()
    
    print("\nFirebase Private Key (paste the entire key, including BEGIN/END lines):")
    print("Press Ctrl+D (Unix) or Ctrl+Z (Windows) when done:")
    private_key_lines = []
    try:
        while True:
            line = input()
            private_key_lines.append(line)
    except EOFError:
        pass
    env_vars['FIREBASE_PRIVATE_KEY'] = '\n'.join(private_key_lines)
    
    env_vars['ALCHEMY_API_KEY'] = input("\nAlchemy API Key: ").strip()
    env_vars['JWT_SECRET'] = generate_jwt_secret()
    print(f"\nGenerated JWT_SECRET: {env_vars['JWT_SECRET'][:20]}...")
    
    env_vars['BACKEND_URL'] = input("\nBackend URL [https://fundtracer-api.onrender.com]: ").strip() or "https://fundtracer-api.onrender.com"
    env_vars['FRONTEND_URL'] = input("Frontend URL [https://fundtracer-web.onrender.com]: ").strip() or "https://fundtracer-web.onrender.com"
    
    # Firebase Web Config (from .env)
    env_vars['VITE_FIREBASE_API_KEY'] = "AIzaSyDIHXSDeSzIlnCEzAYOB9TjO5whGn__i8o"
    env_vars['VITE_FIREBASE_AUTH_DOMAIN'] = "fundtracer-by-dt.firebaseapp.com"
    env_vars['VITE_FIREBASE_PROJECT_ID'] = env_vars['FIREBASE_PROJECT_ID']
    env_vars['VITE_FIREBASE_STORAGE_BUCKET'] = "fundtracer-by-dt.firebasestorage.app"
    env_vars['VITE_FIREBASE_MESSAGING_SENDER_ID'] = "486546370849"
    env_vars['VITE_FIREBASE_APP_ID'] = "1:486546370849:web:b040790b3fdc0a47bbce60"
    env_vars['VITE_FIREBASE_MEASUREMENT_ID'] = "G-3F10VCNG4B"
    
    # Render configuration
    env_vars['RENDER_API_KEY'] = RENDER_API_KEY
    
    return env_vars

def create_render_services():
    """Create Render services via API"""
    print_header("Creating Render Services")
    
    import urllib.request
    import urllib.error
    
    headers = {
        "Authorization": f"Bearer {RENDER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Get user ID
    try:
        req = urllib.request.Request(
            "https://api.render.com/v1/users",
            headers=headers,
            method="GET"
        )
        with urllib.request.urlopen(req) as response:
            users = json.loads(response.read().decode())
            if users:
                owner_id = users[0]['id']
                print_success(f"Found user: {owner_id}")
            else:
                print_error("Could not get user ID")
                return None, None
    except Exception as e:
        print_error(f"Failed to get user info: {e}")
        return None, None
    
    # Create backend service
    print("\nCreating backend service (fundtracer-api)...")
    backend_payload = {
        "type": "web_service",
        "name": "fundtracer-api",
        "ownerId": owner_id,
        "region": "oregon",
        "env": "node",
        "plan": "starter",
        "branch": "master",
        "repo": f"https://github.com/{REPO_OWNER}/{REPO_NAME}",
        "buildCommand": "npm install && npm run build --workspace=@fundtracer/core && npm run build --workspace=@fundtracer/server",
        "startCommand": "npm start --workspace=@fundtracer/server",
        "healthCheckPath": "/health"
    }
    
    backend_id = None
    try:
        req = urllib.request.Request(
            "https://api.render.com/v1/services",
            data=json.dumps(backend_payload).encode(),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            backend_id = result.get('service', {}).get('id')
            if backend_id:
                print_success(f"Backend service created: {backend_id}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print_warning("Backend service may already exist")
        else:
            print_error(f"Failed to create backend: {e}")
    
    # Create frontend service
    print("\nCreating frontend service (fundtracer-web)...")
    frontend_payload = {
        "type": "static_site",
        "name": "fundtracer-web",
        "ownerId": owner_id,
        "region": "oregon",
        "branch": "master",
        "repo": f"https://github.com/{REPO_OWNER}/{REPO_NAME}",
        "buildCommand": "npm install && npm run build --workspace=@fundtracer/core && npm run build --workspace=@fundtracer/web",
        "publishPath": "./packages/web/dist"
    }
    
    frontend_id = None
    try:
        req = urllib.request.Request(
            "https://api.render.com/v1/services",
            data=json.dumps(frontend_payload).encode(),
            headers=headers,
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            frontend_id = result.get('service', {}).get('id')
            if frontend_id:
                print_success(f"Frontend service created: {frontend_id}")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print_warning("Frontend service may already exist")
        else:
            print_error(f"Failed to create frontend: {e}")
    
    return backend_id, frontend_id

def main():
    print_header("FundTracer Render Deployment Automation")
    
    # Check prerequisites
    if not check_github_cli():
        sys.exit(1)
    
    # Get environment variables
    env_vars = get_user_input()
    
    # Set GitHub secrets
    print_header("Setting GitHub Secrets")
    
    secrets_to_set = [
        ('RENDER_API_KEY', env_vars['RENDER_API_KEY']),
        ('FIREBASE_PROJECT_ID', env_vars['FIREBASE_PROJECT_ID']),
        ('FIREBASE_CLIENT_EMAIL', env_vars['FIREBASE_CLIENT_EMAIL']),
        ('FIREBASE_PRIVATE_KEY', env_vars['FIREBASE_PRIVATE_KEY']),
        ('ALCHEMY_API_KEY', env_vars['ALCHEMY_API_KEY']),
        ('JWT_SECRET', env_vars['JWT_SECRET']),
        ('BACKEND_URL', env_vars['BACKEND_URL']),
        ('FRONTEND_URL', env_vars['FRONTEND_URL']),
        ('VITE_FIREBASE_API_KEY', env_vars['VITE_FIREBASE_API_KEY']),
        ('VITE_FIREBASE_AUTH_DOMAIN', env_vars['VITE_FIREBASE_AUTH_DOMAIN']),
        ('VITE_FIREBASE_PROJECT_ID', env_vars['VITE_FIREBASE_PROJECT_ID']),
        ('VITE_FIREBASE_STORAGE_BUCKET', env_vars['VITE_FIREBASE_STORAGE_BUCKET']),
        ('VITE_FIREBASE_MESSAGING_SENDER_ID', env_vars['VITE_FIREBASE_MESSAGING_SENDER_ID']),
        ('VITE_FIREBASE_APP_ID', env_vars['VITE_FIREBASE_APP_ID']),
        ('VITE_FIREBASE_MEASUREMENT_ID', env_vars['VITE_FIREBASE_MEASUREMENT_ID']),
        ('VITE_API_URL', env_vars['BACKEND_URL']),
    ]
    
    failed_secrets = []
    for name, value in secrets_to_set:
        print(f"Setting {name}... ", end="")
        if set_github_secret(name, value):
            print("✓")
        else:
            print("✗")
            failed_secrets.append(name)
    
    if failed_secrets:
        print_warning(f"Failed to set {len(failed_secrets)} secrets. You may need to set them manually.")
    
    # Create Render services
    backend_id, frontend_id = create_render_services()
    
    if backend_id:
        set_github_secret('RENDER_API_SERVICE_ID', backend_id)
    if frontend_id:
        set_github_secret('RENDER_WEB_SERVICE_ID', frontend_id)
    
    # Final summary
    print_header("Setup Complete!")
    
    print("✅ GitHub Secrets configured")
    print("✅ Render services created (or already exist)")
    print("")
    print("Next steps:")
    print("1. Push to master to trigger deployment:")
    print("   git push origin master")
    print("")
    print("2. Or manually trigger from GitHub Actions tab:")
    print(f"   https://github.com/{REPO_OWNER}/{REPO_NAME}/actions")
    print("")
    print("Your services will be available at:")
    print(f"   Backend: {env_vars['BACKEND_URL']}")
    print(f"   Frontend: {env_vars['FRONTEND_URL']}")
    print("")
    print("Monitor deployment status in the GitHub Actions tab")

if __name__ == "__main__":
    main()
