#!/bin/bash

# Railway Deployment Script
echo "🚀 Starting Railway deployment process..."

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Error: app.py not found. Make sure you're in the saasa directory."
    exit 1
fi

# Backup original app.py if it exists and is different from production version
if [ -f "app.py" ] && [ -f "app_production.py" ]; then
    if ! cmp -s "app.py" "app_production.py"; then
        echo "📦 Backing up original app.py to app_original.py"
        cp app.py app_original.py
    fi
fi

# Use production version
if [ -f "app_production.py" ]; then
    echo "🔄 Using production version of app.py"
    cp app_production.py app.py
fi

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please log in to Railway:"
    railway login
fi

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo "📊 Check your deployment status at: https://railway.app/dashboard"
echo "🔍 Monitor logs with: railway logs"
echo "🏥 Health check: https://your-app.railway.app/health"
