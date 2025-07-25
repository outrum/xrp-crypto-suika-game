/**
 * Test script to verify Netlify environment variables are properly configured
 * This script can be run in the browser console on the deployed site
 */

// Function to test environment variables in production
function testNetlifyEnvironmentVariables() {
    console.log('🔍 Testing Netlify Environment Variables...\n');
    
    // Test environment variable access
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const ideogramKey = import.meta.env.IDEOGRAM_API_KEY;
    
    console.log('Environment Variables Status:');
    console.log('─'.repeat(40));
    
    // Check Supabase URL
    if (supabaseUrl) {
        console.log('✅ VITE_SUPABASE_URL:', supabaseUrl);
        
        // Validate URL format
        if (supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')) {
            console.log('   ✅ URL format is valid');
        } else {
            console.log('   ❌ URL format may be invalid');
        }
    } else {
        console.log('❌ VITE_SUPABASE_URL: Not set or undefined');
    }
    
    // Check Supabase Key
    if (supabaseKey) {
        console.log('✅ VITE_SUPABASE_ANON_KEY: Set (length:', supabaseKey.length, 'characters)');
        
        // Validate key format (should start with 'eyJ' for JWT)
        if (supabaseKey.startsWith('eyJ')) {
            console.log('   ✅ Key format appears to be valid JWT');
        } else {
            console.log('   ⚠️  Key format may be invalid (should start with "eyJ")');
        }
    } else {
        console.log('❌ VITE_SUPABASE_ANON_KEY: Not set or undefined');
    }
    
    // Check Ideogram Key (optional)
    if (ideogramKey) {
        console.log('✅ IDEOGRAM_API_KEY: Set (length:', ideogramKey.length, 'characters)');
    } else {
        console.log('⚠️  IDEOGRAM_API_KEY: Not set (optional for runtime)');
    }
    
    console.log('\n' + '─'.repeat(40));
    
    // Overall status
    const allRequired = supabaseUrl && supabaseKey;
    if (allRequired) {
        console.log('✅ All required environment variables are configured!');
        return true;
    } else {
        console.log('❌ Some required environment variables are missing.');
        console.log('\nTo fix this:');
        console.log('1. Go to Netlify dashboard > Site settings > Environment variables');
        console.log('2. Add the missing variables');
        console.log('3. Redeploy the site');
        return false;
    }
}

// Function to test Supabase connection with environment variables
async function testSupabaseConnection() {
    console.log('\n🔗 Testing Supabase Connection...\n');
    
    try {
        // Check if environment variables are available
        const envVarsOk = testNetlifyEnvironmentVariables();
        if (!envVarsOk) {
            console.log('❌ Cannot test Supabase connection - environment variables missing');
            return false;
        }
        
        // Check if Supabase client is initialized
        if (typeof Game !== 'undefined' && Game.supabase) {
            console.log('✅ Supabase client is initialized');
            
            // Test a simple query
            try {
                const { data, error } = await Game.supabase
                    .from('game_states')
                    .select('count')
                    .limit(1);
                
                if (error) {
                    console.log('⚠️  Supabase query error:', error.message);
                    console.log('   This might be expected if tables don\'t exist yet');
                } else {
                    console.log('✅ Supabase connection successful!');
                    return true;
                }
            } catch (queryError) {
                console.log('❌ Supabase query failed:', queryError.message);
            }
        } else {
            console.log('❌ Supabase client not initialized');
            console.log('   Check if the game has loaded properly');
        }
        
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
    }
    
    return false;
}

// Function to run all tests
async function runAllEnvironmentTests() {
    console.log('🚀 Running Complete Environment Test Suite\n');
    console.log('='.repeat(50));
    
    const envTest = testNetlifyEnvironmentVariables();
    const connectionTest = await testSupabaseConnection();
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Results Summary:');
    console.log('─'.repeat(25));
    console.log('Environment Variables:', envTest ? '✅ PASS' : '❌ FAIL');
    console.log('Supabase Connection:', connectionTest ? '✅ PASS' : '❌ FAIL');
    
    if (envTest && connectionTest) {
        console.log('\n🎉 All tests passed! Your environment is properly configured.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }
    
    return envTest && connectionTest;
}

// Make functions available globally for browser console use
if (typeof window !== 'undefined') {
    window.testNetlifyEnvironmentVariables = testNetlifyEnvironmentVariables;
    window.testSupabaseConnection = testSupabaseConnection;
    window.runAllEnvironmentTests = runAllEnvironmentTests;
    
    console.log('🔧 Environment test functions loaded!');
    console.log('Available functions:');
    console.log('  • testNetlifyEnvironmentVariables()');
    console.log('  • testSupabaseConnection()');
    console.log('  • runAllEnvironmentTests()');
}

// Export for Node.js use
export {
    testNetlifyEnvironmentVariables,
    testSupabaseConnection,
    runAllEnvironmentTests
};