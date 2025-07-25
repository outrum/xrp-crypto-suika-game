# Production Deployment Guide
## XRP Crypto Meme Suika Game

This guide walks you through the complete production deployment process for the XRP Crypto Meme Suika game, including Netlify environment configuration and Supabase database setup.

## Prerequisites

- [ ] Netlify account with site connected to GitHub repository
- [ ] Supabase project created and active
- [ ] Admin access to both Netlify and Supabase dashboards

## Phase 1: Configure Netlify Environment Variables

### Step 1: Get Supabase Credentials

1. **Log in to Supabase Dashboard**
   - Go to https://supabase.com and log in
   - Select your project (or create one if needed)

2. **Get Project URL and API Key**
   - Navigate to **Settings > API**
   - Copy the following values:
     - **Project URL** (e.g., `https://your-project.supabase.co`)
     - **anon/public key** (starts with `eyJ...`)

   ⚠️ **IMPORTANT**: Use the "anon" key, NOT the "service_role" key!

### Step 2: Configure Environment Variables in Netlify

1. **Access Netlify Dashboard**
   - Go to https://app.netlify.com
   - Select your XRP Crypto Meme Suika site

2. **Add Environment Variables**
   - Go to **Site settings > Environment variables**
   - Add the following variables:

   ```
   Variable Name: VITE_SUPABASE_URL
   Value: https://your-project.supabase.co
   ```

   ```
   Variable Name: VITE_SUPABASE_ANON_KEY
   Value: eyJ... (your anonymous/public key)
   ```

3. **Save and Deploy**
   - Click "Save" after adding each variable
   - Trigger a new deployment to apply changes

### Step 3: Verify Environment Variables

After deployment, test the environment variables:

1. Open your deployed site in a browser
2. Open browser developer tools (F12)
3. Go to the Console tab
4. Run these commands:

```javascript
console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Missing");
```

You should see your Supabase URL and "Set" for the key.

## Phase 2: Deploy Supabase Database Schema

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Execute Schema**
   - Copy the entire contents of `supabase-schema.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute all commands

3. **Verify Deployment**
   - Check that tables were created: `game_states`, `leaderboard`
   - Verify functions exist: `get_top_scores`, `get_player_stats`
   - Confirm RLS policies are active

### Method 2: Supabase CLI (Alternative)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref YOUR_PROJECT_REF

# Apply the schema
supabase db push
```

### Schema Components

The deployed schema includes:

- **Tables**: `game_states`, `leaderboard`
- **Indexes**: Optimized for high-score queries
- **Functions**: `get_top_scores()`, `get_player_stats()`
- **Views**: `public_leaderboard`, `game_analytics`
- **Security**: Row Level Security (RLS) policies
- **Constraints**: Data validation and integrity checks

## Phase 3: Test Production Deployment

### Step 1: Basic Functionality Test

1. **Open Deployed Game**
   - Visit your Netlify site URL
   - Verify the game loads without errors

2. **Test Game Mechanics**
   - Play a few rounds
   - Verify tokens drop and merge correctly
   - Check that scores are calculated properly

### Step 2: Database Integration Test

Run these tests in the browser console:

```javascript
// Test environment variables
testNetlifyEnvironmentVariables()

// Test Supabase connection
testSupabaseConnection()

// Run complete test suite
runAllEnvironmentTests()
```

### Step 3: Secret Code System Test

1. **Play to Score Thresholds**
   - Reach 100 points to unlock first secret code
   - Verify popup appears with code
   - Test copy-to-clipboard functionality

2. **Test Progress Tracking**
   - Verify progress bar updates in real-time
   - Check visual feedback near thresholds

### Step 4: Data Persistence Test

1. **High Score Persistence**
   - Achieve a high score
   - Refresh the page
   - Verify high score is maintained

2. **Secret Code Persistence**
   - Unlock a secret code
   - Refresh the page
   - Verify code remains unlocked

## Phase 4: Performance and Security Validation

### Performance Checks

- [ ] Game maintains 60fps during play
- [ ] Assets load quickly (< 3 seconds)
- [ ] Database queries respond quickly (< 500ms)
- [ ] No memory leaks during extended play

### Security Checks

- [ ] Environment variables not exposed in client code
- [ ] RLS policies prevent unauthorized data access
- [ ] No sensitive data in browser console
- [ ] HTTPS enforced on all connections

## Troubleshooting

### Environment Variables Not Working

**Symptoms**: `undefined` when checking environment variables

**Solutions**:
- Verify variables are set in Netlify dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables
- Clear browser cache

### Supabase Connection Fails

**Symptoms**: Database errors in console, data not persisting

**Solutions**:
- Verify Supabase URL format
- Ensure using anon key, not service_role key
- Check Supabase project is active
- Verify RLS policies allow anonymous access

### Schema Deployment Issues

**Symptoms**: Tables not found, function errors

**Solutions**:
- Re-run schema deployment
- Check for SQL syntax errors
- Verify all commands executed successfully
- Review Supabase logs for errors

### Game Performance Issues

**Symptoms**: Lag, frame drops, slow loading

**Solutions**:
- Check browser console for errors
- Verify asset optimization
- Test on different devices/browsers
- Monitor network requests

## Deployment Checklist

Before going live:

- [ ] Supabase project created and active
- [ ] Environment variables configured in Netlify
- [ ] Database schema deployed successfully
- [ ] Site connected to GitHub repository
- [ ] Continuous deployment enabled
- [ ] Game functionality tested in production
- [ ] Secret code system tested
- [ ] Data persistence verified
- [ ] Performance validated
- [ ] Security checks completed

## Monitoring and Maintenance

### Regular Checks

- **Weekly**: Monitor game analytics and player activity
- **Monthly**: Review database performance and optimize queries
- **Quarterly**: Update dependencies and security patches

### Analytics

Access game analytics through Supabase:

```sql
-- View game analytics
SELECT * FROM game_analytics;

-- Refresh analytics data
SELECT refresh_game_analytics();

-- Get top players
SELECT * FROM get_top_scores(10);
```

### Backup and Recovery

- Supabase automatically backs up your database
- Export game data regularly for additional safety
- Test recovery procedures periodically

## Support

For deployment issues:

1. Check this troubleshooting guide
2. Review browser console for errors
3. Check Netlify deploy logs
4. Review Supabase project logs
5. Test with provided validation scripts

## Success Criteria

Deployment is successful when:

✅ Game loads without errors on deployed URL  
✅ Environment variables are properly configured  
✅ Database schema is deployed and functional  
✅ Secret codes unlock at correct thresholds  
✅ High scores persist between sessions  
✅ Game maintains smooth performance  
✅ All test functions pass validation  

---

**Next Steps**: After successful deployment, share your game URL with the XRP community and monitor player engagement through the analytics dashboard!