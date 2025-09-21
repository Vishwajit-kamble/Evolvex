# Production Deployment Guide

This guide covers deploying your Flask RAG application to production with enterprise-level features.

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.11+
- Docker (optional)
- Railway account (for deployment)
- API keys (Together AI or Google Gemini)

### 2. Environment Setup
```bash
# Copy production environment template
cp production.env .env

# Edit environment variables
nano .env
```

### 3. Deploy to Railway
```bash
# Run production deployment script
./deploy-production.sh
```

## 📋 Production Features

### ✅ Security Features
- **File Upload Security**: Size limits, type validation, MIME type checking
- **Rate Limiting**: Request rate limiting to prevent abuse
- **Security Headers**: XSS protection, content type options, frame options
- **Input Validation**: Comprehensive input sanitization
- **CSRF Protection**: Cross-site request forgery protection

### ✅ Monitoring & Logging
- **Health Checks**: `/health` endpoint with system metrics
- **Performance Monitoring**: Request timing, memory usage, CPU metrics
- **Error Tracking**: Comprehensive error logging and tracking
- **Metrics Collection**: Application and system metrics
- **Structured Logging**: JSON-formatted logs for easy parsing

### ✅ Production Optimizations
- **Gunicorn Configuration**: Multi-worker setup with proper timeouts
- **Resource Management**: Memory and CPU monitoring
- **Graceful Shutdowns**: Proper cleanup on application shutdown
- **Error Handling**: Comprehensive error handling with fallbacks
- **API Fallbacks**: Multiple AI provider support

## 🔧 Configuration

### Environment Variables

#### Required Variables
```bash
SECRET_KEY=your-super-secret-key-here
TOGETHER_API_KEY=your-together-api-key
GEMINI_API_KEY=your-gemini-api-key
```

#### Optional Variables
```bash
FLASK_ENV=production
DEBUG=False
MAX_FILE_SIZE=10485760
LOG_LEVEL=INFO
```

### Railway Configuration

#### Railway.json
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 300 --max-requests 1000 --max-requests-jitter 100",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🐳 Docker Deployment

### Build and Run
```bash
# Build Docker image
docker build -t rag-app:latest .

# Run container
docker run -p 5000:5000 \
  -e SECRET_KEY=your-secret-key \
  -e TOGETHER_API_KEY=your-api-key \
  rag-app:latest
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
curl https://your-app.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "uptime_seconds": 3600,
  "system": {
    "cpu_percent": 45.2,
    "memory_percent": 67.8,
    "disk_percent": 23.1
  },
  "application": {
    "request_count": 150,
    "error_count": 2,
    "error_rate": 0.013,
    "avg_response_time": 1.2
  }
}
```

### Metrics Endpoint
```bash
curl https://your-app.railway.app/metrics
```

## 🔒 Security Best Practices

### 1. Environment Variables
- Never commit API keys to version control
- Use strong, unique secret keys
- Rotate keys regularly
- Use environment-specific configurations

### 2. File Upload Security
- File size limits (10MB default)
- File type validation
- MIME type checking
- Secure filename handling

### 3. API Security
- Rate limiting
- Input validation
- Error message sanitization
- CORS configuration

### 4. Infrastructure Security
- HTTPS only
- Security headers
- Regular updates
- Monitoring and alerting

## 🚀 Deployment Options

### Railway (Recommended)
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically
4. Monitor with Railway dashboard

### Docker
1. Build Docker image
2. Push to registry
3. Deploy to container platform
4. Configure load balancer

### Manual Deployment
1. Set up server
2. Install dependencies
3. Configure environment
4. Run with Gunicorn

## 📈 Performance Optimization

### Gunicorn Configuration
```bash
gunicorn app:app \
  --bind 0.0.0.0:5000 \
  --workers 2 \
  --timeout 300 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --preload
```

### Memory Management
- Monitor memory usage
- Set appropriate worker count
- Use memory-efficient models
- Implement caching

### Database Optimization
- Use connection pooling
- Optimize queries
- Implement caching
- Regular maintenance

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Check dependencies
pip install -r requirements.txt

# Check Python version
python --version

# Check build logs
railway logs
```

#### 2. Runtime Errors
```bash
# Check application logs
tail -f app.log

# Check system resources
curl https://your-app.railway.app/health

# Check environment variables
railway variables
```

#### 3. Performance Issues
```bash
# Check metrics
curl https://your-app.railway.app/metrics

# Monitor resources
railway logs --follow
```

### Debug Commands
```bash
# Check application status
curl https://your-app.railway.app/health

# View logs
railway logs

# Connect to service
railway shell

# Check variables
railway variables
```

## 📚 Additional Resources

### Documentation
- [Railway Documentation](https://docs.railway.app)
- [Flask Documentation](https://flask.palletsprojects.com)
- [Gunicorn Documentation](https://docs.gunicorn.org)

### Support
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Flask Community: [flask.palletsprojects.com/community](https://flask.palletsprojects.com/community)

### Monitoring Tools
- Railway Dashboard
- Application logs
- Health check endpoints
- Custom metrics

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] API keys set and tested
- [ ] Health check endpoint working
- [ ] File upload limits configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Security measures in place
- [ ] Monitoring set up
- [ ] Backup strategy planned
- [ ] Documentation updated
- [ ] Performance optimized
- [ ] Security tested
- [ ] Load testing completed
- [ ] Disaster recovery planned

## 🚨 Emergency Procedures

### Application Down
1. Check Railway dashboard
2. Review application logs
3. Check system resources
4. Restart if necessary
5. Investigate root cause

### Performance Issues
1. Check metrics endpoint
2. Review resource usage
3. Scale if necessary
4. Optimize code
5. Monitor improvements

### Security Incidents
1. Review security logs
2. Check for unauthorized access
3. Rotate compromised keys
4. Update security measures
5. Document incident

Your Flask RAG application is now production-ready with enterprise-level features! 🎉
