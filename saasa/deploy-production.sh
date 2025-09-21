#!/bin/bash

# Production Deployment Script
echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    print_error "app.py not found. Make sure you're in the saasa directory."
    exit 1
fi

# Check if required files exist
print_status "Checking required files..."
required_files=("requirements.txt" "Dockerfile" "railway.json")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file $file not found!"
        exit 1
    fi
done

# Set production environment
print_status "Setting production environment..."
export FLASK_ENV=production
export DEBUG=False

# Install dependencies
print_status "Installing dependencies..."
pip install -r requirements.txt

# Run tests (if available)
if [ -d "tests" ]; then
    print_status "Running tests..."
    python -m pytest tests/ -v
    if [ $? -ne 0 ]; then
        print_warning "Tests failed, but continuing with deployment..."
    fi
fi

# Check environment variables
print_status "Checking environment variables..."
required_vars=("SECRET_KEY" "TOGETHER_API_KEY" "GEMINI_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    print_warning "Missing environment variables: ${missing_vars[*]}"
    print_warning "Please set these in your deployment platform"
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads logs

# Set proper permissions
print_status "Setting permissions..."
chmod 755 uploads
chmod 755 logs

# Check if Railway CLI is available
if command -v railway &> /dev/null; then
    print_status "Railway CLI found. Deploying to Railway..."
    
    # Login check
    if ! railway whoami &> /dev/null; then
        print_warning "Not logged in to Railway. Please run: railway login"
        exit 1
    fi
    
    # Deploy to Railway
    railway up --detach
    
    if [ $? -eq 0 ]; then
        print_status "✅ Successfully deployed to Railway!"
        print_status "Check your deployment at: https://railway.app/dashboard"
    else
        print_error "❌ Railway deployment failed!"
        exit 1
    fi
else
    print_warning "Railway CLI not found. Skipping Railway deployment."
    print_status "You can deploy manually using:"
    print_status "1. Go to https://railway.app"
    print_status "2. Create new project"
    print_status "3. Connect your GitHub repository"
    print_status "4. Set environment variables"
fi

# Docker deployment option
if command -v docker &> /dev/null; then
    print_status "Docker found. Building Docker image..."
    
    # Build Docker image
    docker build -t rag-app:latest .
    
    if [ $? -eq 0 ]; then
        print_status "✅ Docker image built successfully!"
        print_status "To run: docker run -p 5000:5000 rag-app:latest"
    else
        print_error "❌ Docker build failed!"
    fi
else
    print_warning "Docker not found. Skipping Docker build."
fi

print_status "🎉 Production deployment setup complete!"
print_status "Next steps:"
print_status "1. Set your environment variables"
print_status "2. Configure your domain (if needed)"
print_status "3. Set up monitoring and logging"
print_status "4. Test your deployment"
