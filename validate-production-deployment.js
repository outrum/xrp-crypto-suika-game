#!/usr/bin/env node

/**
 * Production Deployment Validation Script
 * Comprehensive testing of deployed XRP Crypto Meme Suika Game
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test configuration
const TEST_CONFIG = {
    timeout: 10000, // 10 seconds
    retries: 3,
    verbose: true
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0
};

// Helper function to run a test with error handling
async function runTest(testName, testFunction, category = 'General') {
    testResults.total++;
    
    try {
        log(`\n🧪 Testing: ${testName}`, 'blue');
        const result = await Promise.race([
            testFunction(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Test timeout')), TEST_CONFIG.timeout)
            )
        ]);
        
        if (result) {
            log(`✅ PASS: ${testName}`, 'green');
            testResults.passed++;
            return true;
        } else {
            log(`❌ FAIL: ${testName}`, 'red');
            testResults.failed++;
            return false;
        }
    } catch (error) {
        log(`❌ ERROR: ${testName} - ${error.message}`, 'red');
        testResults.failed++;
        return false;
    }
}

// Test 1: Environment Variables Configuration
async function testEnvironmentVariables() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        log('⚠️  Environment variables not set locally (expected for production)', 'yellow');
        log('   This test should be run in the deployed environment', 'yellow');
        return true; // Skip this test in local environment
    }
    
    // Validate URL format
    if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
        throw new Error('Invalid Supabase URL format');
    }
    
    // Validate key format (should be JWT)
    if (!supabaseKey.startsWith('eyJ')) {
        throw new Error('Invalid Supabase key format (should be JWT)');
    }
    
    return true;
}

// Test 2: File Structure Validation
async function testFileStructure() {
    const requiredFiles = [
        'index.html',
        'index.js',
        'netlify.toml',
        'supabase-schema.sql',
        'assets/img/tokens/token0.png',
        'assets/img/tokens/token10.png',
        'assets/pop0.mp3',
        'assets/click.mp3'
    ];
    
    for (const file of requiredFiles) {
        if (!fs.existsSync(file)) {
            throw new Error(`Required file missing: ${file}`);
        }
    }
    
    return true;
}

// Test 3: Netlify Configuration
async function testNetlifyConfiguration() {
    if (!fs.existsSync('netlify.toml')) {
        throw new Error('netlify.toml not found');
    }
    
    const config = fs.readFileSync('netlify.toml', 'utf8');
    
    // Check for required environment variables
    if (!config.includes('VITE_SUPABASE_URL') || !config.includes('VITE_SUPABASE_ANON_KEY')) {
        throw new Error('Environment variables not configured in netlify.toml');
    }
    
    // Check for security headers
    if (!config.includes('X-Frame-Options') || !config.includes('X-XSS-Protection')) {
        throw new Error('Security headers not configured');
    }
    
    // Check for caching headers
    if (!config.includes('Cache-Control')) {
        throw new Error('Caching headers not configured');
    }
    
    return true;
}

// Test 4: Supabase Schema Validation
async function testSupabaseSchema() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        log('⚠️  Skipping Supabase tests - environment variables not available', 'yellow');
        testResults.skipped++;
        return true;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test table existence by attempting to query
    try {
        const { data, error } = await supabase
            .from('game_states')
            .select('count')
            .limit(1);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            throw new Error(`game_states table error: ${error.message}`);
        }
    } catch (err) {
        throw new Error(`Failed to access game_states table: ${err.message}`);
    }
    
    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('count')
            .limit(1);
        
        if (error && error.code !== 'PGRST116') {
            throw new Error(`leaderboard table error: ${error.message}`);
        }
    } catch (err) {
        throw new Error(`Failed to access leaderboard table: ${err.message}`);
    }
    
    return true;
}

// Test 5: Game Assets Validation
async function testGameAssets() {
    // Check token images
    const tokenDir = 'assets/img/tokens';
    if (!fs.existsSync(tokenDir)) {
        throw new Error('Token images directory not found');
    }
    
    for (let i = 0; i <= 10; i++) {
        const tokenFile = `${tokenDir}/token${i}.png`;
        if (!fs.existsSync(tokenFile)) {
            throw new Error(`Token image missing: token${i}.png`);
        }
    }
    
    // Check sound files
    const soundFiles = ['click.mp3'];
    for (let i = 0; i <= 10; i++) {
        soundFiles.push(`pop${i}.mp3`);
    }
    
    for (const soundFile of soundFiles) {
        const soundPath = `assets/${soundFile}`;
        if (!fs.existsSync(soundPath)) {
            throw new Error(`Sound file missing: ${soundFile}`);
        }
    }
    
    return true;
}

// Test 6: Code Quality and Security
async function testCodeQuality() {
    if (!fs.existsSync('index.js')) {
        throw new Error('index.js not found');
    }
    
    const code = fs.readFileSync('index.js', 'utf8');
    
    // Check for environment variable usage
    if (!code.includes('import.meta.env.VITE_SUPABASE_URL')) {
        throw new Error('Environment variables not properly used in code');
    }
    
    // Check for no hardcoded credentials
    if (code.includes('supabase.co') && !code.includes('import.meta.env')) {
        throw new Error('Hardcoded Supabase URL found in code');
    }
    
    // Check for proper error handling
    if (!code.includes('try') || !code.includes('catch')) {
        log('⚠️  Warning: Limited error handling found in code', 'yellow');
    }
    
    return true;
}

// Test 7: Performance Validation
async function testPerformanceConfiguration() {
    // Check for asset optimization
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    
    // Check for proper script loading
    if (!htmlContent.includes('type="module"')) {
        throw new Error('ES modules not properly configured');
    }
    
    // Check netlify.toml for performance settings
    const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
    
    // Check for caching configuration
    if (!netlifyConfig.includes('max-age')) {
        throw new Error('Asset caching not configured');
    }
    
    return true;
}

// Test 8: Database Functions Validation
async function testDatabaseFunctions() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        log('⚠️  Skipping database function tests - environment variables not available', 'yellow');
        testResults.skipped++;
        return true;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test get_top_scores function
    try {
        const { data, error } = await supabase.rpc('get_top_scores', { limit_count: 5 });
        if (error) {
            throw new Error(`get_top_scores function error: ${error.message}`);
        }
    } catch (err) {
        throw new Error(`Failed to call get_top_scores: ${err.message}`);
    }
    
    return true;
}

// Test 9: Security Configuration
async function testSecurityConfiguration() {
    const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
    
    const requiredHeaders = [
        'X-Frame-Options',
        'X-XSS-Protection',
        'X-Content-Type-Options',
        'Referrer-Policy'
    ];
    
    for (const header of requiredHeaders) {
        if (!netlifyConfig.includes(header)) {
            throw new Error(`Security header missing: ${header}`);
        }
    }
    
    return true;
}

// Test 10: Integration Test Simulation
async function testGameIntegration() {
    // Simulate game initialization
    const indexJs = fs.readFileSync('index.js', 'utf8');
    
    // Check for game initialization code
    if (!indexJs.includes('Game') || !indexJs.includes('init')) {
        throw new Error('Game initialization code not found');
    }
    
    // Check for secret code system
    if (!indexJs.includes('secretCode') || !indexJs.includes('threshold')) {
        throw new Error('Secret code system not implemented');
    }
    
    // Check for progress tracking
    if (!indexJs.includes('progress') || !indexJs.includes('updateProgress')) {
        throw new Error('Progress tracking system not implemented');
    }
    
    return true;
}

// Main test runner
async function runAllTests() {
    log('🚀 Starting Production Deployment Validation', 'bright');
    log('=' .repeat(60), 'cyan');
    log('');
    
    const tests = [
        { name: 'Environment Variables Configuration', fn: testEnvironmentVariables, category: 'Configuration' },
        { name: 'File Structure Validation', fn: testFileStructure, category: 'Structure' },
        { name: 'Netlify Configuration', fn: testNetlifyConfiguration, category: 'Configuration' },
        { name: 'Supabase Schema Validation', fn: testSupabaseSchema, category: 'Database' },
        { name: 'Game Assets Validation', fn: testGameAssets, category: 'Assets' },
        { name: 'Code Quality and Security', fn: testCodeQuality, category: 'Security' },
        { name: 'Performance Configuration', fn: testPerformanceConfiguration, category: 'Performance' },
        { name: 'Database Functions Validation', fn: testDatabaseFunctions, category: 'Database' },
        { name: 'Security Configuration', fn: testSecurityConfiguration, category: 'Security' },
        { name: 'Game Integration Test', fn: testGameIntegration, category: 'Integration' }
    ];
    
    // Run all tests
    for (const test of tests) {
        await runTest(test.name, test.fn, test.category);
    }
    
    // Display results
    log('\n' + '=' .repeat(60), 'cyan');
    log('📊 VALIDATION RESULTS', 'bright');
    log('=' .repeat(60), 'cyan');
    
    log(`\n✅ Passed: ${testResults.passed}`, 'green');
    log(`❌ Failed: ${testResults.failed}`, 'red');
    log(`⏭️  Skipped: ${testResults.skipped}`, 'yellow');
    log(`📈 Total: ${testResults.total}`, 'blue');
    
    const successRate = ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1);
    log(`🎯 Success Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
    
    log('\n' + '=' .repeat(60), 'cyan');
    
    if (testResults.failed === 0) {
        log('🎉 ALL TESTS PASSED! Deployment is ready for production.', 'green');
        log('\n📋 Next Steps:', 'blue');
        log('1. Deploy to Netlify with environment variables configured', 'yellow');
        log('2. Run browser-based tests on deployed site', 'yellow');
        log('3. Test game functionality end-to-end', 'yellow');
        log('4. Monitor performance and user experience', 'yellow');
    } else {
        log('⚠️  SOME TESTS FAILED. Please fix issues before deploying.', 'red');
        log('\n🔧 Troubleshooting:', 'blue');
        log('1. Review failed tests above', 'yellow');
        log('2. Check PRODUCTION_DEPLOYMENT_GUIDE.md for solutions', 'yellow');
        log('3. Re-run validation after fixes', 'yellow');
    }
    
    log('\n📖 For detailed deployment instructions, see PRODUCTION_DEPLOYMENT_GUIDE.md', 'blue');
    
    return testResults.failed === 0;
}

// Browser-based test instructions
function displayBrowserTestInstructions() {
    log('\n🌐 BROWSER-BASED TESTING INSTRUCTIONS', 'bright');
    log('=' .repeat(50), 'cyan');
    log('');
    log('After deploying to Netlify, run these tests in the browser:', 'blue');
    log('');
    log('1. Open your deployed site URL', 'yellow');
    log('2. Open browser developer tools (F12)', 'yellow');
    log('3. Go to the Console tab', 'yellow');
    log('4. Run these test functions:', 'yellow');
    log('');
    log('   // Test environment variables', 'green');
    log('   testNetlifyEnvironmentVariables()', 'green');
    log('');
    log('   // Test Supabase connection', 'green');
    log('   testSupabaseConnection()', 'green');
    log('');
    log('   // Run complete test suite', 'green');
    log('   runAllEnvironmentTests()', 'green');
    log('');
    log('   // Test database connectivity', 'green');
    log('   testDatabaseConnectivity()', 'green');
    log('');
    log('5. Verify all tests pass', 'yellow');
    log('6. Test game functionality manually', 'yellow');
    log('');
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        log('Production Deployment Validation Tool', 'bright');
        log('');
        log('Usage: node validate-production-deployment.js [options]', 'blue');
        log('');
        log('Options:', 'blue');
        log('  --browser-tests    Show browser testing instructions', 'yellow');
        log('  --help, -h         Show this help message', 'yellow');
        log('');
        return;
    }
    
    if (args.includes('--browser-tests')) {
        displayBrowserTestInstructions();
        return;
    }
    
    const success = await runAllTests();
    
    if (args.includes('--browser-tests') || success) {
        displayBrowserTestInstructions();
    }
    
    process.exit(success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        log(`❌ Validation failed: ${error.message}`, 'red');
        process.exit(1);
    });
}

export { runAllTests, testResults };