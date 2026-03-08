# Vercel Deployment Guide for ScreenCast Backend

## Pre-deployment Checklist

### 1. MongoDB Atlas Setup (Required)
Your app is using a local MongoDB connection which won't work on Vercel. You need to:

1. **Create a MongoDB Atlas account** at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create a cluster** (free tier is fine for testing)
3. **Create a database user** with read/write permissions
4. **Get your connection string** - it should look like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/screencast-app
   ```

### 2. Environment Variables Setup in Vercel

After connecting your repository to Vercel, add these environment variables in your Vercel dashboard:

**Go to:** Project Settings → Environment Variables

**Add these variables:**

| Variable Name | Value | Notes |
|--------------|-------|--------|
| `MONGODB_URI` | `mongodb+srv://username:password@cluster.mongodb.net/screencast-app` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | `generate-a-secure-random-string-here` | Use a secure random string (32+ characters) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `FRONTEND_URL` | `https://your-frontend-domain.vercel.app` | Your frontend Vercel URL |
| `NODE_ENV` | `production` | Set to production for deployed environment |

**Generate a secure JWT_SECRET:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

### 3. File Upload Considerations

**Important:** Vercel serverless functions have limitations:
- **File size limit:** 50MB per request
- **Execution timeout:** 10 seconds (Hobby plan) / 60 seconds (Pro plan)
- **No persistent file storage:** Files uploaded to `/tmp` are deleted after function execution

**Recommendations for production:**
1. **Use a cloud storage service** like AWS S3, Cloudinary, or Google Cloud Storage
2. **Stream large uploads** directly to cloud storage
3. **Implement chunked uploads** for large video files

### 4. Deployment Commands

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy (from backend directory)
vercel

# 4. Set environment variables (if not done via dashboard)
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add FRONTEND_URL
vercel env add NODE_ENV

# 5. Redeploy after setting env vars
vercel --prod
```

## Common Issues and Solutions

### Issue 1: "FUNCTION_INVOCATION_FAILED"
**Cause:** Usually environment variables or MongoDB connection issues
**Solution:**
- Verify all environment variables are set in Vercel dashboard
- Test MongoDB URI locally first
- Check Vercel function logs for specific error messages

### Issue 2: File Upload Failures
**Cause:** Serverless function limitations
**Solution:**
- Reduce file size limits in your frontend
- Implement cloud storage (AWS S3, Cloudinary)
- Consider using Vercel Blob for file storage

### Issue 3: CORS Errors
**Cause:** Frontend URL not matching CORS configuration
**Solution:**
- Update `FRONTEND_URL` environment variable with your actual Vercel frontend URL
- Ensure both domains (with and without www) are included if needed

### Issue 4: Cold Start Timeouts
**Cause:** MongoDB connection taking too long on cold starts
**Solution:**
- Use MongoDB connection pooling
- Implement connection caching
- Consider upgrading to Vercel Pro for better performance

## Testing Your Deployment

1. **Health Check Endpoint:**
   ```
   GET https://your-backend.vercel.app/api/health
   ```
   Should return: `{"status":"OK","message":"ScreenCast API is running"}`

2. **Test Registration:**
   ```bash
   curl -X POST https://your-backend.vercel.app/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{
     "email": "test@example.com",
     "password": "password123",
     "fullName": "Test User"
   }'
   ```

## Production Optimizations

1. **Enable Function Regions:** Set your functions to run in regions closest to your users
2. **Upgrade to Pro Plan:** For better performance and longer timeout limits
3. **Implement Caching:** Use Redis or similar for session caching
4. **Monitor Performance:** Use Vercel Analytics to track function performance
5. **Error Tracking:** Implement Sentry or similar error tracking service

## Rollback Strategy

If deployment fails:
```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

Remember to update your frontend's API base URL to point to your Vercel backend URL!