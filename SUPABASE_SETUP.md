# Supabase Production Database Setup

This document provides instructions for setting up the production Supabase database for the XRP Crypto Meme Suika game.

## Requirements

- Supabase project with database access
- Environment variables configured in Netlify
- Database administration privileges

## Files Overview

- `supabase-schema.sql` - Production database schema with security policies
- `deploy-supabase-schema.js` - Deployment helper script
- `test-database-connectivity.js` - Browser-based connectivity tests
- `test-supabase-production.js` - Comprehensive production tests

## Setup Instructions

### 1. Environment Variables

Configure these environment variables in your Netlify deployment:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key
```

### 2. Schema Deployment

#### Option A: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase-schema.sql`
4. Paste and execute the SQL commands
5. Verify successful execution

#### Option B: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply the schema (if using migrations)
supabase db push
```

### 3. Schema Validation

Run the deployment helper to validate your environment:

```bash
node deploy-supabase-schema.js --validate
```

### 4. Testing

#### Browser Testing (Recommended)

1. Open your deployed game in a browser
2. Open browser console (F12)
3. Run the connectivity test:
   ```javascript
   testDatabaseConnectivity()
   ```
4. Validate schema deployment:
   ```javascript
   validateSchemaDeployment()
   ```

#### Node.js Testing

```bash
# Run comprehensive production tests
node test-supabase-production.js
```

## Database Schema Features

### Tables

#### `game_states`
- Stores player game states with enhanced security
- Includes constraints for data validation
- Tracks unlock dates and session information
- Optimized indexes for performance

#### `leaderboard`
- Global high scores with player information
- Prevents duplicate entries
- Immutable scores (no updates/deletes allowed)
- Performance indexes for ranking queries

### Security Features

#### Row Level Security (RLS)
- Enabled on all tables
- Anonymous users can manage their own data
- Leaderboard entries are read-only after creation
- Prevents unauthorized data access

#### Data Constraints
- Positive score validation
- Array length validation for unlock codes
- Player name length limits
- Referential integrity enforcement

### Performance Features

#### Indexes
- High score queries optimized
- Leaderboard ranking optimized
- Composite indexes for complex queries
- Analytics queries optimized

#### Functions
- `get_top_scores(limit)` - Efficient leaderboard queries
- `get_player_stats(player_id)` - Player statistics with ranking
- `validate_secret_code_unlock()` - Code validation logic
- `cleanup_inactive_players()` - Data maintenance

#### Views
- `public_leaderboard` - Public leaderboard without sensitive data
- `game_analytics` - Materialized view for analytics

## Monitoring and Maintenance

### Analytics

The schema includes a materialized view for game analytics:

```sql
SELECT * FROM game_analytics;
```

Refresh analytics periodically:

```sql
SELECT refresh_game_analytics();
```

### Data Cleanup

Remove inactive players (optional):

```sql
SELECT cleanup_inactive_players(365); -- Remove players inactive for 1 year
```

### Performance Monitoring

Monitor query performance using Supabase dashboard:
- Check slow queries
- Monitor index usage
- Review RLS policy performance

## Troubleshooting

### Common Issues

#### Environment Variables Not Found
- Verify variables are set in Netlify
- Check variable names match exactly
- Ensure variables are available at build time

#### Schema Deployment Fails
- Check database permissions
- Verify SQL syntax
- Review error messages in Supabase logs

#### RLS Policies Too Restrictive
- Test with anonymous authentication
- Verify policy conditions
- Check user context in policies

#### Performance Issues
- Review query execution plans
- Check index usage
- Monitor connection pool usage

### Testing Failures

#### Connection Test Fails
```javascript
// Check if Supabase is initialized
console.log(Game.supabase);

// Verify environment variables
console.log(import.meta.env.VITE_SUPABASE_URL);
```

#### Schema Validation Fails
- Ensure schema was deployed completely
- Check for missing functions or views
- Verify RLS policies are active

#### Data Persistence Issues
- Check network connectivity
- Verify RLS policies allow operations
- Review browser console for errors

## Security Considerations

### Production Checklist

- [ ] RLS enabled on all tables
- [ ] Anonymous access properly restricted
- [ ] Data constraints enforced
- [ ] Sensitive data excluded from public views
- [ ] Environment variables secured
- [ ] Database backups configured
- [ ] Monitoring alerts set up

### Best Practices

1. **Never expose service role key** in client-side code
2. **Use anonymous authentication** for public games
3. **Implement rate limiting** for API calls
4. **Monitor for suspicious activity** in logs
5. **Regular security audits** of RLS policies
6. **Keep dependencies updated** for security patches

## Support

For issues with this setup:

1. Check the troubleshooting section above
2. Review Supabase documentation
3. Test with the provided test scripts
4. Check browser console for detailed errors
5. Review Supabase project logs

## Version History

- v1.0 - Initial production schema with RLS and constraints
- v1.1 - Added analytics views and performance functions
- v1.2 - Enhanced security policies and data validation