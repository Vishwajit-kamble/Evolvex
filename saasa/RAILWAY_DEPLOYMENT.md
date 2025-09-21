# Railway Deployment Guide

This guide will help you deploy your Flask RAG application to Railway and make it production-ready.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **API Keys**: You'll need either Together AI or Google Gemini API keys

## Step 1: Prepare Your Application

### 1.1 Use Production App
Replace your current `app.py` with the production version:
```bash
cp app_production.py app.py
```

### 1.2 Verify Dependencies
Ensure your `requirements.txt` includes all necessary dependencies (already updated).

### 1.3 Environment Variables
Copy the environment template and configure:
```bash
cp railway.env.example .env
```

## Step 2: Deploy to Railway

### 2.1 Connect to Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select the `saasa` folder as the root directory

### 2.2 Configure Environment Variables
In the Railway dashboard, go to your project → Variables tab and add:

**Required Variables:**
```
SECRET_KEY=your-super-secret-key-here
FLASK_ENV=production
```

**API Keys (choose one or both):**
```
TOGETHER_API_KEY=your-together-api-key
GEMINI_API_KEY=your-gemini-api-key
```

**Optional Variables:**
```
MAX_FILE_SIZE=10485760
LOG_LEVEL=INFO
```

### 2.3 Deploy
Railway will automatically:
- Detect it's a Python application
- Install dependencies from `requirements.txt`
- Start the application using the command in `railway.json`

## Step 3: Production Optimizations

### 3.1 Database (Optional)
For production, consider adding a database for:
- User sessions
- File metadata
- Query history

### 3.2 File Storage
Current setup uses local file storage. For production, consider:
- AWS S3
- Google Cloud Storage
- Railway's persistent volumes

### 3.3 Caching
Add Redis for caching:
- Vector store embeddings
- API responses
- User sessions

### 3.4 Monitoring
Railway provides built-in monitoring, but you can add:
- Sentry for error tracking
- DataDog for performance monitoring
- Custom logging to external services

## Step 4: Security Considerations

### 4.1 Environment Variables
- Never commit API keys to version control
- Use Railway's environment variable system
- Rotate keys regularly

### 4.2 File Upload Security
- File size limits (already implemented)
- File type validation (already implemented)
- Virus scanning (consider adding)

### 4.3 API Rate Limiting
Consider adding rate limiting for:
- File uploads
- Query requests
- API endpoints

## Step 5: Monitoring and Maintenance

### 5.1 Health Checks
Your app includes a health check endpoint at `/health` that returns:
- Application status
- System resources (CPU, memory)
- AI dependencies status
- RAG chain status
- Uptime information

### 5.2 Logs
- Application logs are written to `app.log`
- Railway provides log streaming in the dashboard
- Monitor for errors and performance issues

### 5.3 Scaling
Railway automatically handles:
- Load balancing
- Auto-scaling based on traffic
- Zero-downtime deployments

## Step 6: Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check `requirements.txt` for version conflicts
   - Ensure all dependencies are listed
   - Check Railway build logs

2. **Runtime Errors**
   - Verify environment variables are set
   - Check application logs
   - Ensure API keys are valid

3. **Memory Issues**
   - Monitor memory usage in Railway dashboard
   - Consider upgrading to a higher tier plan
   - Optimize model loading

4. **File Upload Issues**
   - Check file size limits
   - Verify file permissions
   - Ensure upload directory exists

### Debug Commands:
```bash
# Check application status
curl https://your-app.railway.app/health

# View logs
railway logs

# Connect to service
railway shell
```

## Step 7: Custom Domain (Optional)

1. In Railway dashboard, go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificates are automatically provisioned

## Production Checklist

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

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Your app's health endpoint: `https://your-app.railway.app/health`

## Cost Optimization

- Use Railway's free tier for development
- Monitor resource usage
- Optimize model loading
- Implement caching strategies
- Consider serverless alternatives for low-traffic apps
