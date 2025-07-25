/**
 * Production Supabase Database Testing Script
 * Tests the production database schema, connectivity, and data persistence
 * Requirements: 8.1, 8.2 - Production database setup and testing
 */

import { createClient } from '@supabase/supabase-js';

// Test configuration
const PRODUCTION_TEST_CONFIG = {
    verbose: true,
    timeout: 15000,
    testPlayerID: 'prod_test_' + Date.now(),
    testData: {
        highScore: 2750,
        unlockedCodes: [true, true, true, true, false],
        codeUnlockDates: [
            new Date('2024-01-01').toISOString(),
            new Date('2024-01-02').toISOString(),
            new Date('2024-01-03').toISOString(),
            new Date('2024-01-04').toISOString(),
            null
        ],
        totalGamesPlayed: 25,
        playerName: 'TestPlayer_Prod'
    }
};

// Test results tracking
let productionTestResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions
function logProductionTest(testName, passed, message = '') {
    const result = { name: testName, passed, message };
    productionTestResults.tests.push(result);
    
    if (passed) {
        productionTestResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        productionTestResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
}

// Initialize Supabase client for testing
function initializeSupabaseClient() {
    try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase environment variables not found');
        }
        
        return createClient(supabaseUrl, supabaseKey);
    } catch (error) {
        console.error('Failed to initialize Supabase client:', error);
        return null;
    }
}

// Test 1: Database connectivity
async function testDatabaseConnectivity(supabase) {
    console.log('\n🔌 Testing Database Connectivity...');
    
    try {
        // Test basic connection by querying system information
        const { data, error } = await supabase
            .from('game_states')
            .select('count')
            .limit(1);
        
        const connected = !error;
        logProductionTest('Database Connection', connected,
            connected ? 'Successfully connected to database' : `Connection error: ${error?.message}`);
        
        return connected;
    } catch (error) {
        logProductionTest('Database Connection', false, `Connection failed: ${error.message}`);
        return false;
    }
}

// Test 2: Schema validation
async function testSchemaValidation(supabase) {
    console.log('\n📋 Testing Database Schema...');
    
    try {
        // Test game_states table structure
        const { data: gameStatesData, error: gameStatesError } = await supabase
            .from('game_states')
            .select('*')
            .limit(1);
        
        const gameStatesExists = !gameStatesError;
        logProductionTest('Game States Table', gameStatesExists,
            gameStatesExists ? 'Table exists and accessible' : `Error: ${gameStatesError?.message}`);
        
        // Test leaderboard table structure
        const { data: leaderboardData, error: leaderboardError } = await supabase
            .from('leaderboard')
            .select('*')
            .limit(1);
        
        const leaderboardExists = !leaderboardError;
        logProductionTest('Leaderboard Table', leaderboardExists,
            leaderboardExists ? 'Table exists and accessible' : `Error: ${leaderboardError?.message}`);
        
        // Test public_leaderboard view
        const { data: viewData, error: viewError } = await supabase
            .from('public_leaderboard')
            .select('*')
            .limit(1);
        
        const viewExists = !viewError;
        logProductionTest('Public Leaderboard View', viewExists,
            viewExists ? 'View exists and accessible' : `Error: ${viewError?.message}`);
        
        return gameStatesExists && leaderboardExists && viewExists;
    } catch (error) {
        logProductionTest('Schema Validation', false, `Schema test failed: ${error.message}`);
        return false;
    }
}

// Test 3: Data insertion and validation
async function testDataInsertion(supabase) {
    console.log('\n💾 Testing Data Insertion...');
    
    try {
        // Insert test game state
        const gameStateData = {
            player_id: PRODUCTION_TEST_CONFIG.testPlayerID,
            high_score: PRODUCTION_TEST_CONFIG.testData.highScore,
            high_score_date: new Date().toISOString(),
            unlocked_codes: PRODUCTION_TEST_CONFIG.testData.unlockedCodes,
            code_unlock_dates: PRODUCTION_TEST_CONFIG.testData.codeUnlockDates,
            total_games_played: PRODUCTION_TEST_CONFIG.testData.totalGamesPlayed,
            user_agent: 'Test Agent',
            session_count: 1
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('game_states')
            .upsert(gameStateData)
            .select();
        
        const insertSuccess = !insertError && insertData && insertData.length > 0;
        logProductionTest('Game State Insertion', insertSuccess,
            insertSuccess ? 'Game state inserted successfully' : `Insert error: ${insertError?.message}`);
        
        if (insertSuccess) {
            // Validate inserted data structure
            const inserted = insertData[0];
            const validStructure = 
                inserted.player_id === PRODUCTION_TEST_CONFIG.testPlayerID &&
                inserted.high_score === PRODUCTION_TEST_CONFIG.testData.highScore &&
                Array.isArray(inserted.unlocked_codes) &&
                inserted.unlocked_codes.length === 5 &&
                inserted.total_games_played === PRODUCTION_TEST_CONFIG.testData.totalGamesPlayed;
            
            logProductionTest('Data Structure Validation', validStructure,
                validStructure ? 'Inserted data structure is correct' : 'Data structure validation failed');
        }
        
        // Test leaderboard insertion
        const leaderboardData = {
            player_id: PRODUCTION_TEST_CONFIG.testPlayerID,
            player_name: PRODUCTION_TEST_CONFIG.testData.playerName,
            score: PRODUCTION_TEST_CONFIG.testData.highScore
        };
        
        const { data: leaderboardInsert, error: leaderboardError } = await supabase
            .from('leaderboard')
            .insert(leaderboardData)
            .select();
        
        const leaderboardSuccess = !leaderboardError && leaderboardInsert && leaderboardInsert.length > 0;
        logProductionTest('Leaderboard Insertion', leaderboardSuccess,
            leaderboardSuccess ? 'Leaderboard entry inserted successfully' : `Leaderboard error: ${leaderboardError?.message}`);
        
        return insertSuccess && leaderboardSuccess;
    } catch (error) {
        logProductionTest('Data Insertion', false, `Insertion test failed: ${error.message}`);
        return false;
    }
}

// Test 4: Data retrieval and queries
async function testDataRetrieval(supabase) {
    console.log('\n🔍 Testing Data Retrieval...');
    
    try {
        // Test retrieving game state
        const { data: gameState, error: gameStateError } = await supabase
            .from('game_states')
            .select('*')
            .eq('player_id', PRODUCTION_TEST_CONFIG.testPlayerID)
            .single();
        
        const retrievalSuccess = !gameStateError && gameState;
        logProductionTest('Game State Retrieval', retrievalSuccess,
            retrievalSuccess ? 'Game state retrieved successfully' : `Retrieval error: ${gameStateError?.message}`);
        
        if (retrievalSuccess) {
            // Validate retrieved data
            const dataValid = 
                gameState.high_score === PRODUCTION_TEST_CONFIG.testData.highScore &&
                JSON.stringify(gameState.unlocked_codes) === JSON.stringify(PRODUCTION_TEST_CONFIG.testData.unlockedCodes);
            
            logProductionTest('Retrieved Data Validation', dataValid,
                dataValid ? 'Retrieved data matches inserted data' : 'Data validation failed');
        }
        
        // Test leaderboard query
        const { data: leaderboard, error: leaderboardError } = await supabase
            .from('public_leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(10);
        
        const leaderboardSuccess = !leaderboardError && Array.isArray(leaderboard);
        logProductionTest('Leaderboard Query', leaderboardSuccess,
            leaderboardSuccess ? `Retrieved ${leaderboard.length} leaderboard entries` : `Leaderboard error: ${leaderboardError?.message}`);
        
        return retrievalSuccess && leaderboardSuccess;
    } catch (error) {
        logProductionTest('Data Retrieval', false, `Retrieval test failed: ${error.message}`);
        return false;
    }
}

// Test 5: Database functions
async function testDatabaseFunctions(supabase) {
    console.log('\n⚙️ Testing Database Functions...');
    
    try {
        // Test get_top_scores function
        const { data: topScores, error: topScoresError } = await supabase
            .rpc('get_top_scores', { limit_count: 5 });
        
        const topScoresSuccess = !topScoresError && Array.isArray(topScores);
        logProductionTest('Get Top Scores Function', topScoresSuccess,
            topScoresSuccess ? `Retrieved ${topScores.length} top scores` : `Function error: ${topScoresError?.message}`);
        
        // Test get_player_stats function
        const { data: playerStats, error: playerStatsError } = await supabase
            .rpc('get_player_stats', { p_player_id: PRODUCTION_TEST_CONFIG.testPlayerID });
        
        const playerStatsSuccess = !playerStatsError && Array.isArray(playerStats) && playerStats.length > 0;
        logProductionTest('Get Player Stats Function', playerStatsSuccess,
            playerStatsSuccess ? 'Player stats retrieved successfully' : `Stats error: ${playerStatsError?.message}`);
        
        if (playerStatsSuccess) {
            const stats = playerStats[0];
            const statsValid = 
                stats.high_score === PRODUCTION_TEST_CONFIG.testData.highScore &&
                stats.total_games === PRODUCTION_TEST_CONFIG.testData.totalGamesPlayed &&
                stats.codes_unlocked === 4; // 4 codes unlocked in test data
            
            logProductionTest('Player Stats Validation', statsValid,
                statsValid ? 'Player stats are correct' : `Stats validation failed: ${JSON.stringify(stats)}`);
        }
        
        return topScoresSuccess && playerStatsSuccess;
    } catch (error) {
        logProductionTest('Database Functions', false, `Function test failed: ${error.message}`);
        return false;
    }
}

// Test 6: RLS policies
async function testRLSPolicies(supabase) {
    console.log('\n🔒 Testing Row Level Security Policies...');
    
    try {
        // Test that we can read our own data
        const { data: ownData, error: ownError } = await supabase
            .from('game_states')
            .select('*')
            .eq('player_id', PRODUCTION_TEST_CONFIG.testPlayerID);
        
        const canReadOwn = !ownError && Array.isArray(ownData);
        logProductionTest('RLS - Read Own Data', canReadOwn,
            canReadOwn ? 'Can read own game state' : `Read error: ${ownError?.message}`);
        
        // Test that we can read leaderboard (public data)
        const { data: publicData, error: publicError } = await supabase
            .from('public_leaderboard')
            .select('*')
            .limit(5);
        
        const canReadPublic = !publicError && Array.isArray(publicData);
        logProductionTest('RLS - Read Public Data', canReadPublic,
            canReadPublic ? 'Can read public leaderboard' : `Public read error: ${publicError?.message}`);
        
        // Test that we cannot update leaderboard entries (should be prevented by RLS)
        const { error: updateError } = await supabase
            .from('leaderboard')
            .update({ score: 9999 })
            .eq('player_id', PRODUCTION_TEST_CONFIG.testPlayerID);
        
        const updatePrevented = updateError !== null;
        logProductionTest('RLS - Prevent Leaderboard Updates', updatePrevented,
            updatePrevented ? 'Leaderboard updates correctly prevented' : 'RLS policy not working - updates allowed');
        
        return canReadOwn && canReadPublic && updatePrevented;
    } catch (error) {
        logProductionTest('RLS Policies', false, `RLS test failed: ${error.message}`);
        return false;
    }
}

// Test 7: Data constraints and validation
async function testDataConstraints(supabase) {
    console.log('\n✅ Testing Data Constraints...');
    
    try {
        // Test negative score constraint
        const { error: negativeScoreError } = await supabase
            .from('game_states')
            .insert({
                player_id: 'test-negative-score',
                high_score: -100,
                unlocked_codes: [false, false, false, false, false]
            });
        
        const negativeScorePrevented = negativeScoreError !== null;
        logProductionTest('Negative Score Constraint', negativeScorePrevented,
            negativeScorePrevented ? 'Negative scores correctly prevented' : 'Negative score constraint not working');
        
        // Test invalid unlocked_codes array length
        const { error: invalidCodesError } = await supabase
            .from('game_states')
            .insert({
                player_id: 'test-invalid-codes',
                high_score: 100,
                unlocked_codes: [true, false, true] // Wrong length
            });
        
        const invalidCodesPrevented = invalidCodesError !== null;
        logProductionTest('Unlocked Codes Array Constraint', invalidCodesPrevented,
            invalidCodesPrevented ? 'Invalid codes array correctly prevented' : 'Codes array constraint not working');
        
        // Test empty player name in leaderboard
        const { error: emptyNameError } = await supabase
            .from('leaderboard')
            .insert({
                player_id: PRODUCTION_TEST_CONFIG.testPlayerID,
                player_name: '',
                score: 100
            });
        
        const emptyNamePrevented = emptyNameError !== null;
        logProductionTest('Empty Player Name Constraint', emptyNamePrevented,
            emptyNamePrevented ? 'Empty player names correctly prevented' : 'Player name constraint not working');
        
        return negativeScorePrevented && invalidCodesPrevented && emptyNamePrevented;
    } catch (error) {
        logProductionTest('Data Constraints', false, `Constraint test failed: ${error.message}`);
        return false;
    }
}

// Test 8: Performance and indexing
async function testPerformanceIndexing(supabase) {
    console.log('\n⚡ Testing Performance and Indexing...');
    
    try {
        const startTime = Date.now();
        
        // Test high score query performance (should use index)
        const { data: highScores, error: highScoreError } = await supabase
            .from('game_states')
            .select('player_id, high_score')
            .order('high_score', { ascending: false })
            .limit(100);
        
        const highScoreTime = Date.now() - startTime;
        const highScoreSuccess = !highScoreError && Array.isArray(highScores);
        
        logProductionTest('High Score Query Performance', highScoreSuccess && highScoreTime < 1000,
            highScoreSuccess ? `Query completed in ${highScoreTime}ms` : `Query error: ${highScoreError?.message}`);
        
        // Test leaderboard query performance
        const leaderboardStartTime = Date.now();
        const { data: leaderboardPerf, error: leaderboardPerfError } = await supabase
            .from('leaderboard')
            .select('*')
            .order('score', { ascending: false })
            .limit(50);
        
        const leaderboardTime = Date.now() - leaderboardStartTime;
        const leaderboardPerfSuccess = !leaderboardPerfError && Array.isArray(leaderboardPerf);
        
        logProductionTest('Leaderboard Query Performance', leaderboardPerfSuccess && leaderboardTime < 1000,
            leaderboardPerfSuccess ? `Leaderboard query completed in ${leaderboardTime}ms` : `Query error: ${leaderboardPerfError?.message}`);
        
        return highScoreSuccess && leaderboardPerfSuccess;
    } catch (error) {
        logProductionTest('Performance Testing', false, `Performance test failed: ${error.message}`);
        return false;
    }
}

// Cleanup test data
async function cleanupTestData(supabase) {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
        // Delete test leaderboard entries
        await supabase
            .from('leaderboard')
            .delete()
            .eq('player_id', PRODUCTION_TEST_CONFIG.testPlayerID);
        
        // Delete test game state
        await supabase
            .from('game_states')
            .delete()
            .eq('player_id', PRODUCTION_TEST_CONFIG.testPlayerID);
        
        // Delete other test entries
        await supabase
            .from('game_states')
            .delete()
            .in('player_id', ['test-negative-score', 'test-invalid-codes']);
        
        console.log('✅ Test data cleaned up successfully');
    } catch (error) {
        console.log('⚠️ Warning: Could not clean up all test data:', error.message);
    }
}

// Main test runner
async function runProductionDatabaseTests() {
    console.log('🗄️ Starting Production Database Tests for XRP Crypto Meme Suika Game\n');
    console.log('Testing Requirements: 8.1, 8.2 - Production database setup and security\n');
    
    const supabase = initializeSupabaseClient();
    if (!supabase) {
        console.error('❌ Cannot run tests: Supabase client initialization failed');
        return false;
    }
    
    try {
        // Run all tests in sequence
        const connectivityResult = await testDatabaseConnectivity(supabase);
        if (!connectivityResult) {
            console.error('❌ Database connectivity failed. Stopping tests.');
            return false;
        }
        
        await testSchemaValidation(supabase);
        await testDataInsertion(supabase);
        await testDataRetrieval(supabase);
        await testDatabaseFunctions(supabase);
        await testRLSPolicies(supabase);
        await testDataConstraints(supabase);
        await testPerformanceIndexing(supabase);
        
        // Cleanup
        await cleanupTestData(supabase);
        
        // Print summary
        console.log('\n📊 Production Database Test Summary:');
        console.log(`✅ Passed: ${productionTestResults.passed}`);
        console.log(`❌ Failed: ${productionTestResults.failed}`);
        console.log(`📈 Success Rate: ${((productionTestResults.passed / (productionTestResults.passed + productionTestResults.failed)) * 100).toFixed(1)}%`);
        
        if (productionTestResults.failed === 0) {
            console.log('\n🎉 All production database tests passed! Database is ready for production.');
        } else {
            console.log('\n⚠️ Some tests failed. Please review the issues above before deploying to production.');
            console.log('\nFailed tests:');
            productionTestResults.tests.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return productionTestResults.failed === 0;
        
    } catch (error) {
        console.error('❌ Production database test runner error:', error);
        return false;
    }
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
    window.runProductionDatabaseTests = runProductionDatabaseTests;
    window.productionTestResults = productionTestResults;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runProductionDatabaseTests, productionTestResults };
}

// Auto-run if in browser and game is loaded
if (typeof window !== 'undefined' && window.Game) {
    console.log('Production database test script loaded. Run runProductionDatabaseTests() to start testing.');
}