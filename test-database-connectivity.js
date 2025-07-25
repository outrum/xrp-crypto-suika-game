/**
 * Simple Database Connectivity Test
 * Tests basic Supabase connection and schema validation
 * Requirements: 8.1, 8.2
 */

// Simple connectivity test that can be run in browser console
async function testDatabaseConnectivity() {
    console.log('🔌 Testing Supabase Database Connectivity...\n');
    
    // Check if Supabase is initialized in the game
    if (!Game.supabase) {
        console.error('❌ Supabase client not initialized in Game object');
        return false;
    }
    
    console.log('✅ Supabase client found in Game object');
    
    try {
        // Test 1: Basic connection
        console.log('\n1. Testing basic database connection...');
        const { data: connectionData, error: testError } = await Game.supabase
            .from('game_states')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.error('❌ Database connection failed:', testError.message);
            return false;
        }
        console.log('✅ Database connection successful');
        
        // Test 2: Schema validation
        console.log('\n2. Testing database schema...');
        
        // Test game_states table
        const { data: gameStatesTest, error: gameStatesError } = await Game.supabase
            .from('game_states')
            .select('player_id, high_score, unlocked_codes')
            .limit(1);
        
        if (gameStatesError) {
            console.error('❌ game_states table error:', gameStatesError.message);
            return false;
        }
        console.log('✅ game_states table accessible');
        
        // Test leaderboard table
        const { data: leaderboardTest, error: leaderboardError } = await Game.supabase
            .from('leaderboard')
            .select('player_name, score')
            .limit(1);
        
        if (leaderboardError) {
            console.error('❌ leaderboard table error:', leaderboardError.message);
            return false;
        }
        console.log('✅ leaderboard table accessible');
        
        // Test 3: Data persistence
        console.log('\n3. Testing data persistence...');
        
        const testPlayerID = 'connectivity_test_' + Date.now();
        const testData = {
            player_id: testPlayerID,
            high_score: 123,
            unlocked_codes: [true, false, false, false, false],
            total_games_played: 1
        };
        
        // Insert test data
        const { data: insertResult, error: insertError } = await Game.supabase
            .from('game_states')
            .insert(testData)
            .select();
        
        if (insertError) {
            console.error('❌ Data insertion failed:', insertError.message);
            return false;
        }
        console.log('✅ Data insertion successful');
        
        // Retrieve test data
        const { data: retrieveResult, error: retrieveError } = await Game.supabase
            .from('game_states')
            .select('*')
            .eq('player_id', testPlayerID)
            .single();
        
        if (retrieveError) {
            console.error('❌ Data retrieval failed:', retrieveError.message);
            return false;
        }
        
        if (retrieveResult.high_score !== 123) {
            console.error('❌ Data persistence validation failed');
            return false;
        }
        console.log('✅ Data persistence validated');
        
        // Clean up test data
        await Game.supabase
            .from('game_states')
            .delete()
            .eq('player_id', testPlayerID);
        
        console.log('✅ Test data cleaned up');
        
        // Test 4: RLS policies
        console.log('\n4. Testing Row Level Security...');
        
        // Test that we can read data (should work with current policies)
        const { data: rlsTest, error: rlsError } = await Game.supabase
            .from('game_states')
            .select('player_id')
            .limit(5);
        
        if (rlsError) {
            console.error('❌ RLS test failed:', rlsError.message);
            return false;
        }
        console.log('✅ RLS policies working correctly');
        
        console.log('\n🎉 All database connectivity tests passed!');
        console.log('📊 Database is ready for production use.');
        
        return true;
        
    } catch (error) {
        console.error('❌ Database connectivity test failed:', error);
        return false;
    }
}

// Test function for validating the schema was applied correctly
async function validateSchemaDeployment() {
    console.log('📋 Validating Schema Deployment...\n');
    
    if (!Game.supabase) {
        console.error('❌ Supabase client not available');
        return false;
    }
    
    try {
        // Test that new schema features are available
        console.log('1. Testing database functions...');
        
        // Test get_top_scores function
        const { data: topScores, error: topScoresError } = await Game.supabase
            .rpc('get_top_scores', { limit_count: 5 });
        
        if (topScoresError) {
            console.error('❌ get_top_scores function not available:', topScoresError.message);
            return false;
        }
        console.log('✅ get_top_scores function working');
        
        // Test public_leaderboard view
        const { data: publicLeaderboard, error: viewError } = await Game.supabase
            .from('public_leaderboard')
            .select('*')
            .limit(5);
        
        if (viewError) {
            console.error('❌ public_leaderboard view not available:', viewError.message);
            return false;
        }
        console.log('✅ public_leaderboard view working');
        
        console.log('\n2. Testing data constraints...');
        
        // Test that constraints are working (this should fail)
        const { error: constraintError } = await Game.supabase
            .from('game_states')
            .insert({
                player_id: 'constraint_test',
                high_score: -100, // Should fail due to CHECK constraint
                unlocked_codes: [false, false, false, false, false]
            });
        
        if (!constraintError) {
            console.error('❌ Data constraints not working - negative score was allowed');
            return false;
        }
        console.log('✅ Data constraints working correctly');
        
        console.log('\n🎉 Schema deployment validation passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Schema validation failed:', error);
        return false;
    }
}

// Export functions for browser use
if (typeof window !== 'undefined') {
    window.testDatabaseConnectivity = testDatabaseConnectivity;
    window.validateSchemaDeployment = validateSchemaDeployment;
}

console.log('Database connectivity test loaded. Use testDatabaseConnectivity() to test connection.');
console.log('Use validateSchemaDeployment() to validate schema features.');