# Deployment Guide - Kukan Prototype

This guide covers deploying the Kukan Prototype to various platforms, with a focus on Vercel deployment.

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- GitHub repository with your code
- Vercel account (free tier available)
- OpenAI API key

### Step-by-Step Deployment

#### 1. Prepare Your Repository
```bash
# Ensure all files are committed
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository and click "Deploy"

#### 3. Configure Environment Variables
In the Vercel project settings:
1. Go to "Settings" → "Environment Variables"
2. Add the following variables:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key
   NODE_ENV=production
   ```
3. Click "Save"

#### 4. Deploy
1. Vercel will automatically detect Next.js
2. Click "Deploy" to start the build process
3. Wait for build completion (usually 2-3 minutes)

#### 5. Access Your App
- Production URL: `https://your-project.vercel.app`
- Custom domain can be configured in settings

### Vercel Configuration

#### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### Environment Variables
```bash
# Required
OPENAI_API_KEY=sk-...

# Optional
NODE_ENV=production
```

## 🌐 Alternative Deployment Options

### Netlify Deployment

#### 1. Build Locally
```bash
npm run build
npm run export
```

#### 2. Deploy to Netlify
1. Drag and drop the `out` folder to Netlify
2. Configure environment variables in Netlify dashboard
3. Set up custom domain if needed

### Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

#### 2. Build and Run
```bash
docker build -t kukan-prototype .
docker run -p 3000:3000 -e OPENAI_API_KEY=your_key kukan-prototype
```

### Self-Hosted VPS

#### 1. Server Requirements
- Node.js 18+
- PM2 or similar process manager
- Nginx for reverse proxy
- SSL certificate (Let's Encrypt)

#### 2. Deployment Script
```bash
#!/bin/bash
cd /var/www/kukan-prototype
git pull origin main
npm install
npm run build
pm2 restart kukan-prototype
```

## 🔧 Post-Deployment Configuration

### 1. Custom Domain Setup
1. Add custom domain in Vercel dashboard
2. Update DNS records with your domain provider
3. Wait for DNS propagation (up to 48 hours)

### 2. SSL Certificate
- Vercel provides automatic SSL
- For self-hosted: Use Let's Encrypt with Certbot

### 3. Environment Variables
Ensure these are set in production:
```bash
OPENAI_API_KEY=your_key_here
NODE_ENV=production
```

## 📊 Monitoring and Analytics

### Vercel Analytics
- Built-in performance monitoring
- Real-time metrics
- Error tracking

### Custom Monitoring
```javascript
// Add to your app for custom metrics
export function reportWebVitals(metric) {
  // Send to your analytics service
  console.log(metric);
}
```

## 🚨 Troubleshooting Deployment

### Common Issues

#### 1. Build Failures
```bash
# Check build logs
npm run build

# Common fixes
npm install
rm -rf .next node_modules
npm install
```

#### 2. Environment Variables
- Ensure all required variables are set
- Check variable names match exactly
- Restart deployment after adding variables

#### 3. API Errors
- Verify OpenAI API key is correct
- Check API rate limits
- Ensure proper CORS configuration

#### 4. 3D Model Loading
- Check file paths in production
- Verify OBJ files are accessible
- Check browser console for errors

### Debug Commands
```bash
# Local testing
npm run dev

# Production build test
npm run build
npm run start

# Check environment
echo $OPENAI_API_KEY
```

## 🔒 Security Considerations

### Production Security
1. **API Key Protection**: Never expose in client-side code
2. **Rate Limiting**: Implement API rate limiting
3. **CORS**: Configure proper CORS policies
4. **HTTPS**: Always use HTTPS in production

### Environment Security
```bash
# Secure environment file
chmod 600 .env.local

# Use secrets management
# Vercel: Built-in secrets
# Self-hosted: Use tools like HashiCorp Vault
```

## 📈 Performance Optimization

### Build Optimization
```bash
# Analyze bundle size
npm run build
# Check .next/analyze for bundle analysis

# Optimize images
# Use next/image for automatic optimization
```

### Runtime Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement proper caching headers

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 📞 Support

### Deployment Issues
1. Check Vercel build logs
2. Verify environment variables
3. Test locally with `npm run build`
4. Check GitHub issues for similar problems

### Performance Issues
1. Monitor Vercel analytics
2. Check bundle size
3. Optimize 3D models
4. Implement lazy loading

---

**Ready to deploy? Follow the Vercel steps above for the fastest deployment experience!**
