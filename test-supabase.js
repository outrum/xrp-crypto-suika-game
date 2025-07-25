/**
 * Supabase Integration Testing Script for XRP Crypto Meme Suika Game
 * Tests data synchronization, offline functionality, and reconnection
 * Requirements: 8.3, 8.4, 8.5, 8.6
 */

// Test configuration
const SUPABASE_TEST_CONFIG = {
    verbose: true,
    timeout: 10000,
    testPlayerID: 'test_player_' + Date.now(),
    mockData: {
        highScore: 1337,
        unlockedCodes: [true, true, false, false, false],
        totalGamesPlayed: 5
    }
};

// Test results tracking
let supabaseTestResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions for testing
function logSupabaseTest(testName, passed, message = '') {
    const result = { name: testName, passed, message };
    supabaseTestResults.tests.push(result);
    
    if (passed) {
        supabaseTestResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        supabaseTestResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
}

function mockNetworkStatus(online) {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: online
    });
    
    // Update Game's online status
    Game.isOnline = online;
}

function createMockSupabaseClient() {
    let mockData = {};
    let shouldFail = false;
    
    return {
        from: (table) => ({
            select: (columns) => ({
                eq: (column, value) => ({
                    single: () => {
                        if (shouldFail) {
                            return Promise.resolve({ data: null, error: { message: 'Mock error' } });
                        }
                        const data = mockData[table] && mockData[table][value];
                        return Promise.resolve({ 
                            data: data || null, 
                            error: data ? null : { code: 'PGRST116' } 
                        });
                    }
                })
            }),
            insert: (data) => ({
                then: (callback) => {
                    if (shouldFail) {
                        callback({ error: { message: 'Mock insert error' } });
                    } else {
                        if (!mockData[table]) mockData[table] = {};
                        mockData[table][data.player_id] = data;
                        callback({ error: null });
                    }
                    return { catch: () => {} };
                }
            }),
            upsert: (data) => {
                if (shouldFail) {
                    return Promise.resolve({ error: { message: 'Mock upsert error' } });
                }
                if (!mockData[table]) mockData[table] = {};
                mockData[table][data.player_id] = data;
                return Promise.resolve({ error: null });
            }
        }),
        
        // Test utilities
        _setMockData: (table, key, data) => {
            if (!mockData[table]) mockData[table] = {};
            mockData[table][key] = data;
        },
        _getMockData: (table, key) => {
            return mockData[table] && mockData[table][key];
        },
        _setShouldFail: (fail) => {
            shouldFail = fail;
        },
        _clearMockData: () => {
            mockData = {};
        }
    };
}

// Test 1: Test Supabase initialization
function testSupabaseInitialization() {
    console.log('\n🧪 Testing Supabase Initialization...');
    
    // Check if Supabase client exists
    const supabaseExists = Game.supabase !== null && Game.supabase !== undefined;
    logSupabaseTest('Supabase Client Exists', supabaseExists,
        supabaseExists ? 'Supabase client initialized' : 'Supabase client not found');
    
    // Check if player ID is generated
    const playerIDExists = typeof Game.playerID === 'string' && Game.playerID.length > 0;
    logSupabaseTest('Player ID Generated', playerIDExists,
        playerIDExists ? `Player ID: ${Game.playerID}` : 'Player ID not generated');
    
    // Check connection status
    const connectionStatus = Game.supabaseConnected;
    logSupabaseTest('Supabase Connection Status', typeof connectionStatus === 'boolean',
        `Connection status: ${connectionStatus}`);
    
    // Check if network monitoring is set up
    const networkMonitoring = Game.isOnline !== undefined;
    logSupabaseTest('Network Monitoring Setup', networkMonitoring,
        `Online status: ${Game.isOnline}`);
}

// Test 2: Test data saving to Supabase
async function testDataSaving() {
    console.log('\n🧪 Testing Data Saving to Supabase...');
    
    // Create mock Supabase client
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    const originalPlayerID = Game.playerID;
    
    // Set up test environment
    Game.supabase = mockClient;
    Game.playerID = SUPABASE_TEST_CONFIG.testPlayerID;
    Game.isOnline = true;
    
    // Set test data
    Game.cache.highscore = SUPABASE_TEST_CONFIG.mockData.highScore;
    Game.cache.unlockedCodes = [...SUPABASE_TEST_CONFIG.mockData.unlockedCodes];
    Game.cache.totalGamesPlayed = SUPABASE_TEST_CONFIG.mockData.totalGamesPlayed;
    
    try {
        // Test saving
        await Game.saveToSupabase();
        
        // Check if data was saved
        const savedData = mockClient._getMockData('game_states', SUPABASE_TEST_CONFIG.testPlayerID);
        const dataSaved = savedData !== null && savedData !== undefined;
        
        logSupabaseTest('Data Save to Supabase', dataSaved,
            dataSaved ? 'Data successfully saved' : 'Data save failed');
        
        if (dataSaved) {
            // Verify saved data structure
            const hasPlayerID = savedData.player_id === SUPABASE_TEST_CONFIG.testPlayerID;
            const hasHighScore = savedData.high_score === SUPABASE_TEST_CONFIG.mockData.highScore;
            const hasUnlockedCodes = Array.isArray(savedData.unlocked_codes);
            const hasTotalGames = savedData.total_games_played === SUPABASE_TEST_CONFIG.mockData.totalGamesPlayed;
            
            logSupabaseTest('Saved Data Structure', hasPlayerID && hasHighScore && hasUnlockedCodes && hasTotalGames,
                `PlayerID: ${hasPlayerID}, HighScore: ${hasHighScore}, Codes: ${hasUnlockedCodes}, Games: ${hasTotalGames}`);
        }
        
    } catch (error) {
        logSupabaseTest('Data Save to Supabase', false, `Error: ${error.message}`);
    } finally {
        // Restore original client
        Game.supabase = originalClient;
        Game.playerID = originalPlayerID;
    }
}

// Test 3: Test data loading from Supabase
async function testDataLoading() {
    console.log('\n🧪 Testing Data Loading from Supabase...');
    
    // Create mock Supabase client with test data
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    const originalPlayerID = Game.playerID;
    const originalCache = { ...Game.cache };
    
    // Set up test environment
    Game.supabase = mockClient;
    Game.playerID = SUPABASE_TEST_CONFIG.testPlayerID;
    Game.isOnline = true;
    
    // Set mock data in Supabase
    const mockSupabaseData = {
        player_id: SUPABASE_TEST_CONFIG.testPlayerID,
        high_score: SUPABASE_TEST_CONFIG.mockData.highScore,
        unlocked_codes: SUPABASE_TEST_CONFIG.mockData.unlockedCodes,
        total_games_played: SUPABASE_TEST_CONFIG.mockData.totalGamesPlayed,
        last_played: new Date().toISOString()
    };
    
    mockClient._setMockData('game_states', SUPABASE_TEST_CONFIG.testPlayerID, mockSupabaseData);
    
    // Reset local cache to lower values
    Game.cache.highscore = 100;
    Game.cache.unlockedCodes = [false, false, false, false, false];
    Game.cache.totalGamesPlayed = 1;
    
    try {
        // Test loading
        await Game.loadFromSupabase();
        
        // Check if data was loaded and merged
        const highScoreUpdated = Game.cache.highscore === SUPABASE_TEST_CONFIG.mockData.highScore;
        const codesUpdated = JSON.stringify(Game.cache.unlockedCodes) === JSON.stringify(SUPABASE_TEST_CONFIG.mockData.unlockedCodes);
        const gamesUpdated = Game.cache.totalGamesPlayed === SUPABASE_TEST_CONFIG.mockData.totalGamesPlayed;
        
        logSupabaseTest('Data Load from Supabase', highScoreUpdated && codesUpdated && gamesUpdated,
            `HighScore: ${highScoreUpdated}, Codes: ${codesUpdated}, Games: ${gamesUpdated}`);
        
        // Check if secret codes revealed status was updated
        const secretCodesUpdated = Game.secretCodes[0].revealed === true && Game.secretCodes[1].revealed === true;
        logSupabaseTest('Secret Codes Status Updated', secretCodesUpdated,
            `First two codes revealed: ${secretCodesUpdated}`);
        
    } catch (error) {
        logSupabaseTest('Data Load from Supabase', false, `Error: ${error.message}`);
    } finally {
        // Restore original state
        Game.supabase = originalClient;
        Game.playerID = originalPlayerID;
        Game.cache = originalCache;
    }
}

// Test 4: Test offline functionality
async function testOfflineFunctionality() {
    console.log('\n🧪 Testing Offline Functionality...');
    
    // Mock offline state
    mockNetworkStatus(false);
    
    const originalClient = Game.supabase;
    const mockClient = createMockSupabaseClient();
    Game.supabase = mockClient;
    
    // Test saving while offline
    Game.cache.highscore = 999;
    
    try {
        await Game.saveToSupabase();
        
        // Should not save to Supabase when offline
        const dataSaved = mockClient._getMockData('game_states', Game.playerID);
        const offlineSaveHandled = dataSaved === null || dataSaved === undefined;
        
        logSupabaseTest('Offline Save Handling', offlineSaveHandled,
            offlineSaveHandled ? 'Save skipped when offline' : 'Save attempted when offline');
        
    } catch (error) {
        logSupabaseTest('Offline Save Handling', false, `Error: ${error.message}`);
    }
    
    // Test loading while offline
    try {
        await Game.loadFromSupabase();
        
        // Should gracefully handle offline state
        logSupabaseTest('Offline Load Handling', true, 'Load handled gracefully when offline');
        
    } catch (error) {
        logSupabaseTest('Offline Load Handling', false, `Error: ${error.message}`);
    } finally {
        // Restore online state and original client
        mockNetworkStatus(true);
        Game.supabase = originalClient;
    }
}

// Test 5: Test reconnection and data sync
async function testReconnectionSync() {
    console.log('\n🧪 Testing Reconnection and Data Sync...');
    
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    
    // Set up test environment
    Game.supabase = mockClient;
    
    // Simulate going offline
    mockNetworkStatus(false);
    
    // Make changes while offline
    Game.cache.highscore = 2000;
    Game.cache.unlockedCodes[2] = true;
    
    // Simulate coming back online
    mockNetworkStatus(true);
    
    try {
        // Test sync on reconnect
        await Game.syncDataOnReconnect();
        
        // Check if data was synced
        const syncedData = mockClient._getMockData('game_states', Game.playerID);
        const dataSynced = syncedData && syncedData.high_score === 2000;
        
        logSupabaseTest('Reconnection Data Sync', dataSynced,
            dataSynced ? 'Data synced after reconnection' : 'Data sync failed');
        
    } catch (error) {
        logSupabaseTest('Reconnection Data Sync', false, `Error: ${error.message}`);
    } finally {
        // Restore original client
        Game.supabase = originalClient;
    }
}

// Test 6: Test leaderboard functionality
async function testLeaderboardFunctionality() {
    console.log('\n🧪 Testing Leaderboard Functionality...');
    
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    
    // Set up test environment
    Game.supabase = mockClient;
    Game.playerID = SUPABASE_TEST_CONFIG.testPlayerID;
    Game.isOnline = true;
    Game.score = 1500;
    
    try {
        // Test saving to leaderboard
        await Game.saveToLeaderboard('TestPlayer');
        
        // Check if leaderboard entry was saved
        const leaderboardData = mockClient._getMockData('leaderboard', SUPABASE_TEST_CONFIG.testPlayerID);
        const leaderboardSaved = leaderboardData && leaderboardData.score === 1500;
        
        logSupabaseTest('Leaderboard Save', leaderboardSaved,
            leaderboardSaved ? 'Score saved to leaderboard' : 'Leaderboard save failed');
        
        if (leaderboardSaved) {
            // Verify leaderboard data structure
            const hasPlayerName = leaderboardData.player_name === 'TestPlayer';
            const hasScore = leaderboardData.score === 1500;
            const hasTimestamp = leaderboardData.created_at !== undefined;
            
            logSupabaseTest('Leaderboard Data Structure', hasPlayerName && hasScore && hasTimestamp,
                `Name: ${hasPlayerName}, Score: ${hasScore}, Timestamp: ${hasTimestamp}`);
        }
        
    } catch (error) {
        logSupabaseTest('Leaderboard Save', false, `Error: ${error.message}`);
    } finally {
        // Restore original client
        Game.supabase = originalClient;
    }
}

// Test 7: Test pending leaderboard entries (offline sync)
async function testPendingLeaderboardEntries() {
    console.log('\n🧪 Testing Pending Leaderboard Entries...');
    
    // Clear any existing pending entries
    localStorage.removeItem('xrp-game-pending-leaderboard');
    
    // Mock offline state
    mockNetworkStatus(false);
    
    Game.score = 800;
    Game.playerID = SUPABASE_TEST_CONFIG.testPlayerID;
    
    // Save score while offline (should store as pending)
    Game.saveToLeaderboard('OfflinePlayer');
    
    // Check if pending entry was stored
    const pendingEntries = JSON.parse(localStorage.getItem('xrp-game-pending-leaderboard') || '[]');
    const pendingStored = pendingEntries.length > 0 && pendingEntries[0].score === 800;
    
    logSupabaseTest('Pending Entry Storage', pendingStored,
        pendingStored ? `${pendingEntries.length} pending entries stored` : 'No pending entries found');
    
    // Mock coming back online and sync
    mockNetworkStatus(true);
    
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    Game.supabase = mockClient;
    
    try {
        // Test syncing pending entries
        await Game.syncPendingLeaderboardEntries();
        
        // Check if pending entries were synced
        const syncedData = mockClient._getMockData('leaderboard', SUPABASE_TEST_CONFIG.testPlayerID);
        const pendingSynced = syncedData && syncedData.score === 800;
        
        logSupabaseTest('Pending Entry Sync', pendingSynced,
            pendingSynced ? 'Pending entries synced successfully' : 'Pending entry sync failed');
        
        // Check if pending entries were cleared
        const remainingPending = JSON.parse(localStorage.getItem('xrp-game-pending-leaderboard') || '[]');
        const pendingCleared = remainingPending.length === 0;
        
        logSupabaseTest('Pending Entry Cleanup', pendingCleared,
            pendingCleared ? 'Pending entries cleared after sync' : 'Pending entries not cleared');
        
    } catch (error) {
        logSupabaseTest('Pending Entry Sync', false, `Error: ${error.message}`);
    } finally {
        // Restore original client and clean up
        Game.supabase = originalClient;
        localStorage.removeItem('xrp-game-pending-leaderboard');
    }
}

// Test 8: Test error handling
async function testErrorHandling() {
    console.log('\n🧪 Testing Error Handling...');
    
    const mockClient = createMockSupabaseClient();
    const originalClient = Game.supabase;
    
    // Set up test environment
    Game.supabase = mockClient;
    Game.playerID = SUPABASE_TEST_CONFIG.testPlayerID;
    Game.isOnline = true;
    
    // Test save error handling
    mockClient._setShouldFail(true);
    
    try {
        await Game.saveToSupabase();
        
        // Should handle error gracefully
        const connectionStatus = Game.supabaseConnected;
        logSupabaseTest('Save Error Handling', connectionStatus === false,
            `Connection status after error: ${connectionStatus}`);
        
    } catch (error) {
        logSupabaseTest('Save Error Handling', true, 'Error caught and handled');
    }
    
    // Test load error handling
    try {
        await Game.loadFromSupabase();
        
        // Should handle error gracefully without crashing
        logSupabaseTest('Load Error Handling', true, 'Load error handled gracefully');
        
    } catch (error) {
        logSupabaseTest('Load Error Handling', false, `Unhandled error: ${error.message}`);
    } finally {
        // Restore original client
        Game.supabase = originalClient;
    }
}

// Main test runner for Supabase integration
async function runSupabaseTests() {
    console.log('🗄️  Starting Supabase Integration Tests for XRP Crypto Meme Suika Game\n');
    console.log('Testing Requirements: 8.3-8.6 (Data sync, offline functionality, reconnection)\n');
    
    try {
        // Run all tests
        testSupabaseInitialization();
        await testDataSaving();
        await testDataLoading();
        await testOfflineFunctionality();
        await testReconnectionSync();
        await testLeaderboardFunctionality();
        await testPendingLeaderboardEntries();
        await testErrorHandling();
        
        // Print summary
        console.log('\n📊 Supabase Integration Test Summary:');
        console.log(`✅ Passed: ${supabaseTestResults.passed}`);
        console.log(`❌ Failed: ${supabaseTestResults.failed}`);
        console.log(`📈 Success Rate: ${((supabaseTestResults.passed / (supabaseTestResults.passed + supabaseTestResults.failed)) * 100).toFixed(1)}%`);
        
        if (supabaseTestResults.failed === 0) {
            console.log('\n🎉 All Supabase integration tests passed! System working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
            console.log('\nFailed tests:');
            supabaseTestResults.tests.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return supabaseTestResults.failed === 0;
        
    } catch (error) {
        console.error('❌ Supabase test runner error:', error);
        return false;
    }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.runSupabaseTests = runSupabaseTests;
    window.supabaseTestResults = supabaseTestResults;
}

// Auto-run if in browser and game is loaded
if (typeof window !== 'undefined' && window.Game) {
    console.log('Supabase integration test script loaded. Run runSupabaseTests() to start testing.');
}