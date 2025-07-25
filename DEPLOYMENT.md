# Deployment Guide for XRP Crypto Meme Suika Game

## Netlify Deployment Setup

This guide explains how to deploy the XRP Crypto Meme Suika Game to Netlify with continuous deployment.

### Prerequisites

1. A GitHub repository containing this project
2. A Netlify account (free tier is sufficient)
3. A Supabase project set up (for data persistence)

### Step 1: Connect GitHub Repository to Netlify

1. Log in to your Netlify account at https://netlify.com
2. Click "New site from Git"
3. Choose "GitHub" as your Git provider
4. Authorize Netlify to access your GitHub account if prompted
5. Select the repository containing this game
6. Configure the build settings:
   - **Branch to deploy**: `main` (or your default branch)
   - **Build command**: Leave empty (static site, no build needed)
   - **Publish directory**: `.` (root directory)

### Step 2: Configure Environment Variables

In the Netlify dashboard, go to Site settings > Environment variables and add:

#### Required Environment Variables:

1. **VITE_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
   - Get this from your Supabase project dashboard

2. **VITE_SUPABASE_ANON_KEY**
   - Value: Your Supabase anonymous/public key
   - Get this from your Supabase project dashboard > Settings > API

3. **IDEOGRAM_API_KEY** (already configured in netlify.toml)
   - Value: `QIX2yPBqTSSjSVPtjsayIM9o87KaxtPW4c-QvcI_VMCVdKiWM91b-EFjQoMErS7z8QTuQDlEASZ8YnBylL6QZA`
   - This is pre-configured in the netlify.toml file

### Step 3: Deploy Settings

The `netlify.toml` file in the root directory contains all necessary configuration:

- **Build settings**: Static site deployment
- **Headers**: Security and caching headers
- **Redirects**: SPA-style routing
- **Environment contexts**: Production, preview, and branch deploy settings

### Step 4: Trigger Initial Deployment

1. After connecting the repository, Netlify will automatically trigger the first deployment
2. Monitor the deployment in the Netlify dashboard
3. Once complete, you'll receive a unique Netlify URL (e.g., `https://amazing-name-123456.netlify.app`)

### Step 5: Configure Custom Domain (Optional)

1. In Netlify dashboard, go to Site settings > Domain management
2. Add your custom domain
3. Configure DNS settings as instructed by Netlify
4. Enable HTTPS (automatic with Netlify)

### Continuous Deployment

Once set up, continuous deployment will work as follows:

- **Push to main branch**: Triggers production deployment
- **Pull requests**: Creates deploy previews for testing
- **Other branches**: Creates branch deploys if configured

### Build Hooks (Optional)

You can set up build hooks for manual deployments:

1. Go to Site settings > Build & deploy > Build hooks
2. Create a new build hook
3. Use the webhook URL to trigger deployments programmatically

### Monitoring and Logs

- **Deploy logs**: Available in the Netlify dashboard under Deploys
- **Function logs**: If you add Netlify Functions later
- **Analytics**: Available in Netlify dashboard (paid feature)

### Troubleshooting

#### Common Issues:

1. **Environment variables not working**:
   - Ensure variables are set in Netlify dashboard
   - Check variable names match exactly (case-sensitive)
   - Redeploy after adding variables

2. **Assets not loading**:
   - Check file paths are relative to root
   - Verify assets are committed to repository

3. **Supabase connection issues**:
   - Verify Supabase URL and key are correct
   - Check Supabase project is active
   - Ensure RLS policies allow anonymous access if needed

#### Deploy Preview URLs:

- Production: `https://your-site-name.netlify.app`
- Deploy previews: `https://deploy-preview-[PR-number]--your-site-name.netlify.app`
- Branch deploys: `https://[branch-name]--your-site-name.netlify.app`

### Security Considerations

- Environment variables are secure and not exposed to client
- HTTPS is enforced automatically
- Security headers are configured in netlify.toml
- Supabase keys should be the anonymous/public keys only

### Performance Optimization

The netlify.toml includes:
- Asset caching headers (1 year for images/audio)
- JavaScript caching (1 day)
- Compression enabled by default
- CDN distribution worldwide

## Next Steps

After deployment:
1. Test the game functionality
2. Verify Supabase integration works
3. Test secret code system
4. Share the game URL with the XRP community!