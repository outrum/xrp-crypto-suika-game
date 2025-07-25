/**
 * Comprehensive Test Runner for XRP Crypto Meme Suika Game
 * Runs all test suites and provides a complete validation report
 */

// Test suite configuration
const TEST_SUITE_CONFIG = {
    verbose: true,
    generateReport: true,
    runOptimizations: true
};

// Combined test results
let allTestResults = {
    suites: [],
    totalPassed: 0,
    totalFailed: 0,
    overallSuccess: false,
    startTime: null,
    endTime: null,
    duration: 0
};

// Utility function to run a test suite and capture results
async function runTestSuite(suiteName, testFunction, testResultsObject) {
    console.log(`\n🚀 Running ${suiteName}...`);
    const startTime = performance.now();
    
    try {
        const success = await testFunction();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        const suiteResult = {
            name: suiteName,
            success,
            passed: testResultsObject.passed,
            failed: testResultsObject.failed,
            duration: Math.round(duration),
            tests: [...testResultsObject.tests]
        };
        
        allTestResults.suites.push(suiteResult);
        allTestResults.totalPassed += testResultsObject.passed;
        allTestResults.totalFailed += testResultsObject.failed;
        
        console.log(`✅ ${suiteName} completed in ${Math.round(duration)}ms`);
        return success;
        
    } catch (error) {
        console.error(`❌ ${suiteName} failed with error:`, error);
        
        const suiteResult = {
            name: suiteName,
            success: false,
            passed: 0,
            failed: 1,
            duration: 0,
            error: error.message,
            tests: [{ name: 'Suite Execution', passed: false, message: error.message }]
        };
        
        allTestResults.suites.push(suiteResult);
        allTestResults.totalFailed += 1;
        
        return false;
    }
}

// Generate comprehensive test report
function generateTestReport() {
    console.log('\n📋 COMPREHENSIVE TEST REPORT');
    console.log('=' .repeat(60));
    
    // Overall summary
    const totalTests = allTestResults.totalPassed + allTestResults.totalFailed;
    const successRate = totalTests > 0 ? ((allTestResults.totalPassed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n📊 Overall Results:`);
    console.log(`✅ Total Passed: ${allTestResults.totalPassed}`);
    console.log(`❌ Total Failed: ${allTestResults.totalFailed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Total Duration: ${allTestResults.duration}ms`);
    
    // Suite-by-suite breakdown
    console.log(`\n📋 Test Suite Breakdown:`);
    allTestResults.suites.forEach(suite => {
        const suiteSuccessRate = suite.passed + suite.failed > 0 ? 
            ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1) : 0;
        
        console.log(`\n${suite.success ? '✅' : '❌'} ${suite.name}:`);
        console.log(`   Passed: ${suite.passed}, Failed: ${suite.failed}`);
        console.log(`   Success Rate: ${suiteSuccessRate}%`);
        console.log(`   Duration: ${suite.duration}ms`);
        
        if (suite.error) {
            console.log(`   Error: ${suite.error}`);
        }
    });
    
    // Failed tests details
    const failedTests = [];
    allTestResults.suites.forEach(suite => {
        suite.tests.filter(test => !test.passed).forEach(test => {
            failedTests.push({
                suite: suite.name,
                test: test.name,
                message: test.message
            });
        });
    });
    
    if (failedTests.length > 0) {
        console.log(`\n❌ Failed Tests Details:`);
        failedTests.forEach(failure => {
            console.log(`   ${failure.suite} > ${failure.test}: ${failure.message}`);
        });
    }
    
    // Requirements coverage
    console.log(`\n📋 Requirements Coverage:`);
    console.log(`   6.1 Physics interactions: ${allTestResults.suites.find(s => s.name === 'Physics Tests')?.success ? '✅' : '❌'}`);
    console.log(`   6.2 Merging behavior: ${allTestResults.suites.find(s => s.name === 'Physics Tests')?.success ? '✅' : '❌'}`);
    console.log(`   3.1-3.8 Secret code system: ${allTestResults.suites.find(s => s.name === 'Secret Code Tests')?.success ? '✅' : '❌'}`);
    console.log(`   4.1-4.5 Progress tracking: ${allTestResults.suites.find(s => s.name === 'Progress Tracking Tests')?.success ? '✅' : '❌'}`);
    console.log(`   8.3-8.6 Supabase integration: ${allTestResults.suites.find(s => s.name === 'Supabase Tests')?.success ? '✅' : '❌'}`);
    console.log(`   6.5 Performance optimization: ${allTestResults.suites.find(s => s.name === 'Performance Optimization')?.success ? '✅' : '❌'}`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (allTestResults.overallSuccess) {
        console.log(`   🎉 All tests passed! The game is ready for deployment.`);
        console.log(`   🚀 Consider running these tests regularly during development.`);
        console.log(`   📊 Monitor performance metrics in production.`);
    } else {
        console.log(`   ⚠️  Address failed tests before deployment.`);
        console.log(`   🔍 Review failed test details above.`);
        console.log(`   🛠️  Consider additional debugging and fixes.`);
        
        if (failedTests.some(f => f.suite === 'Performance Optimization')) {
            console.log(`   ⚡ Performance issues detected - optimize before release.`);
        }
        
        if (failedTests.some(f => f.suite === 'Supabase Tests')) {
            console.log(`   🗄️  Database integration issues - check Supabase configuration.`);
        }
    }
    
    console.log('\n' + '=' .repeat(60));
}

// Main test runner function
async function runAllTests() {
    console.log('🧪 COMPREHENSIVE TEST SUITE FOR XRP CRYPTO MEME SUIKA GAME');
    console.log('Testing all implemented features and optimizations\n');
    
    allTestResults.startTime = performance.now();
    
    // Check if all test functions are available
    const requiredFunctions = [
        'runPhysicsTests',
        'runSecretCodeTests', 
        'runProgressTrackingTests',
        'runSupabaseTests',
        'runPerformanceOptimization'
    ];
    
    const missingFunctions = requiredFunctions.filter(func => typeof window[func] !== 'function');
    
    if (missingFunctions.length > 0) {
        console.error('❌ Missing test functions:', missingFunctions);
        console.log('Make sure all test scripts are loaded in the HTML file.');
        return false;
    }
    
    console.log('✅ All test functions available\n');
    
    // Run all test suites
    const results = [];
    
    // 1. Physics Tests
    results.push(await runTestSuite('Physics Tests', runPhysicsTests, testResults));
    
    // 2. Secret Code Tests  
    results.push(await runTestSuite('Secret Code Tests', runSecretCodeTests, secretCodeTestResults));
    
    // 3. Progress Tracking Tests
    results.push(await runTestSuite('Progress Tracking Tests', runProgressTrackingTests, progressTestResults));
    
    // 4. Supabase Integration Tests
    results.push(await runTestSuite('Supabase Tests', runSupabaseTests, supabaseTestResults));
    
    // 5. Performance Optimization
    results.push(await runTestSuite('Performance Optimization', runPerformanceOptimization, performanceResults));
    
    // Calculate overall results
    allTestResults.endTime = performance.now();
    allTestResults.duration = Math.round(allTestResults.endTime - allTestResults.startTime);
    allTestResults.overallSuccess = results.every(result => result === true);
    
    // Generate comprehensive report
    if (TEST_SUITE_CONFIG.generateReport) {
        generateTestReport();
    }
    
    // Final summary
    console.log(`\n🎯 FINAL RESULT: ${allTestResults.overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allTestResults.overallSuccess) {
        console.log('🎉 The XRP Crypto Meme Suika Game is fully tested and optimized!');
        console.log('🚀 Ready for deployment to Netlify!');
    } else {
        console.log('⚠️  Please address the failed tests before deployment.');
    }
    
    return allTestResults.overallSuccess;
}

// Quick test function for individual components
function runQuickTest(component) {
    const testMap = {
        'physics': runPhysicsTests,
        'secrets': runSecretCodeTests,
        'progress': runProgressTrackingTests,
        'supabase': runSupabaseTests,
        'performance': runPerformanceOptimization
    };
    
    const testFunction = testMap[component.toLowerCase()];
    if (testFunction) {
        console.log(`🧪 Running quick test for: ${component}`);
        return testFunction();
    } else {
        console.error(`❌ Unknown test component: ${component}`);
        console.log('Available components:', Object.keys(testMap).join(', '));
        return false;
    }
}

// Export functions for browser console use
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
    window.runQuickTest = runQuickTest;
    window.allTestResults = allTestResults;
}

// Auto-run message
if (typeof window !== 'undefined' && window.Game) {
    console.log('🧪 Comprehensive test suite loaded!');
    console.log('📋 Available commands:');
    console.log('   runAllTests() - Run complete test suite');
    console.log('   runQuickTest("physics") - Run specific component test');
    console.log('   runQuickTest("secrets") - Test secret code system');
    console.log('   runQuickTest("progress") - Test progress tracking');
    console.log('   runQuickTest("supabase") - Test database integration');
    console.log('   runQuickTest("performance") - Test and optimize performance');
}