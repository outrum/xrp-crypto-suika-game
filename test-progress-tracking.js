/**
 * Progress Tracking System Testing Script for XRP Crypto Meme Suika Game
 * Tests progress bar updates, visual feedback, and transitions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

// Test configuration
const PROGRESS_TEST_CONFIG = {
    verbose: true,
    timeout: 5000,
    expectedThresholds: [100, 500, 1000, 2500, 5000],
    testScores: [0, 50, 99, 100, 250, 500, 750, 1000, 1500, 2500, 3000, 5000, 6000]
};

// Test results tracking
let progressTestResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions for testing
function logProgressTest(testName, passed, message = '') {
    const result = { name: testName, passed, message };
    progressTestResults.tests.push(result);
    
    if (passed) {
        progressTestResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        progressTestResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
}

function simulateProgressScore(targetScore) {
    // Backup original score
    const originalScore = Game.score;
    const originalFruitsMerged = [...Game.fruitsMerged];
    
    // Set score directly for testing
    Game.score = targetScore;
    
    // Simulate some fruit merges to make it realistic
    const tokensToMerge = Math.min(Math.floor(targetScore / 10), Game.fruitSizes.length - 1);
    for (let i = 0; i < tokensToMerge; i++) {
        Game.fruitsMerged[i] = Math.floor(targetScore / (Game.fruitSizes[i].scoreValue * 10));
    }
    
    return {
        restore: () => {
            Game.score = originalScore;
            Game.fruitsMerged = originalFruitsMerged;
        }
    };
}

function getProgressElements() {
    return {
        container: document.getElementById('progress-container'),
        label: document.getElementById('progress-label'),
        bar: document.getElementById('progress-bar'),
        fill: document.getElementById('progress-fill'),
        text: document.getElementById('progress-text')
    };
}

// Test 1: Verify progress bar UI elements exist
function testProgressBarElements() {
    console.log('\n🧪 Testing Progress Bar UI Elements...');
    
    const elements = getProgressElements();
    
    // Check if all elements exist
    const containerExists = elements.container !== null;
    const labelExists = elements.label !== null;
    const barExists = elements.bar !== null;
    const fillExists = elements.fill !== null;
    const textExists = elements.text !== null;
    
    logProgressTest('Progress Container Exists', containerExists,
        containerExists ? 'Found progress-container' : 'progress-container not found');
    
    logProgressTest('Progress Label Exists', labelExists,
        labelExists ? 'Found progress-label' : 'progress-label not found');
    
    logProgressTest('Progress Bar Exists', barExists,
        barExists ? 'Found progress-bar' : 'progress-bar not found');
    
    logProgressTest('Progress Fill Exists', fillExists,
        fillExists ? 'Found progress-fill' : 'progress-fill not found');
    
    logProgressTest('Progress Text Exists', textExists,
        textExists ? 'Found progress-text' : 'progress-text not found');
    
    // Check initial styling
    if (elements.container) {
        const containerVisible = elements.container.style.display !== 'none';
        logProgressTest('Progress Container Initially Visible', containerVisible,
            `Display: ${elements.container.style.display || 'default'}`);
    }
    
    if (elements.fill) {
        const initialWidth = elements.fill.style.width;
        logProgressTest('Progress Fill Initial Width', initialWidth !== undefined,
            `Initial width: ${initialWidth || '0%'}`);
    }
}

// Test 2: Test progress calculation logic
function testProgressCalculation() {
    console.log('\n🧪 Testing Progress Calculation Logic...');
    
    // Reset codes for consistent testing
    Game.resetSecretCodes();
    
    // Test progress calculation for different scores
    const testCases = [
        { score: 0, expectedProgress: 0, description: 'Zero score' },
        { score: 50, expectedProgress: 50, description: 'Half way to first threshold' },
        { score: 100, expectedProgress: 100, description: 'At first threshold' },
        { score: 300, expectedProgress: 50, description: 'Half way between 100-500' }, // (300-100)/(500-100) = 50%
        { score: 500, expectedProgress: 100, description: 'At second threshold' },
        { score: 750, expectedProgress: 50, description: 'Half way between 500-1000' } // (750-500)/(1000-500) = 50%
    ];
    
    testCases.forEach(testCase => {
        const scoreRestore = simulateProgressScore(testCase.score);
        
        // Update progress bar
        Game.updateProgressBar();
        
        // Get progress elements
        const elements = getProgressElements();
        
        if (elements.fill && elements.text) {
            const actualWidthStr = elements.fill.style.width;
            const actualWidth = parseFloat(actualWidthStr.replace('%', ''));
            const actualTextStr = elements.text.innerText;
            const actualText = parseFloat(actualTextStr.replace('%', ''));
            
            // Allow some tolerance for floating point calculations
            const tolerance = 2;
            const widthCorrect = Math.abs(actualWidth - testCase.expectedProgress) <= tolerance;
            const textCorrect = Math.abs(actualText - testCase.expectedProgress) <= tolerance;
            
            logProgressTest(`Progress Calculation - ${testCase.description}`, 
                widthCorrect && textCorrect,
                `Score: ${testCase.score}, Expected: ${testCase.expectedProgress}%, Width: ${actualWidth}%, Text: ${actualText}%`);
        }
        
        scoreRestore.restore();
    });
}

// Test 3: Test progress bar updates in real-time
async function testRealTimeUpdates() {
    console.log('\n🧪 Testing Real-Time Progress Updates...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    if (!elements.fill || !elements.text) {
        logProgressTest('Real-Time Updates', false, 'Progress elements not found');
        return;
    }
    
    // Test incremental score updates
    const scoreUpdates = [10, 25, 50, 75, 90, 100];
    let allUpdatesWorked = true;
    let previousWidth = 0;
    
    for (const score of scoreUpdates) {
        const scoreRestore = simulateProgressScore(score);
        
        // Update progress
        Game.updateProgressBar();
        
        // Check if progress increased
        const currentWidthStr = elements.fill.style.width;
        const currentWidth = parseFloat(currentWidthStr.replace('%', ''));
        
        if (score > 0 && currentWidth <= previousWidth) {
            allUpdatesWorked = false;
            logProgressTest(`Progress Update at Score ${score}`, false,
                `Width didn't increase: ${previousWidth}% -> ${currentWidth}%`);
        } else {
            logProgressTest(`Progress Update at Score ${score}`, true,
                `Width: ${previousWidth}% -> ${currentWidth}%`);
        }
        
        previousWidth = currentWidth;
        scoreRestore.restore();
    }
    
    logProgressTest('Real-Time Updates Overall', allUpdatesWorked,
        'All incremental updates worked correctly');
}

// Test 4: Test visual feedback for approaching thresholds
function testVisualFeedback() {
    console.log('\n🧪 Testing Visual Feedback for Approaching Thresholds...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    if (!elements.container) {
        logProgressTest('Visual Feedback', false, 'Progress container not found');
        return;
    }
    
    // Test approaching threshold (85% progress)
    const scoreRestore1 = simulateProgressScore(85); // 85% of first threshold
    Game.updateProgressBar();
    
    const hasApproachingClass = elements.container.classList.contains('approaching-threshold');
    logProgressTest('Approaching Threshold Visual Effect', hasApproachingClass,
        `Container classes: ${elements.container.className}`);
    
    scoreRestore1.restore();
    
    // Test threshold reached (100% progress)
    const scoreRestore2 = simulateProgressScore(100);
    Game.updateProgressBar();
    
    // Simulate the threshold reached effect
    Game.updateProgressVisualFeedback(100);
    
    const hasThresholdReachedClass = elements.container.classList.contains('threshold-reached');
    logProgressTest('Threshold Reached Visual Effect', hasThresholdReachedClass,
        `Container classes: ${elements.container.className}`);
    
    scoreRestore2.restore();
    
    // Test normal progress (no special effects)
    const scoreRestore3 = simulateProgressScore(50);
    Game.updateProgressBar();
    
    const hasNoSpecialClasses = !elements.container.classList.contains('approaching-threshold') &&
                               !elements.container.classList.contains('threshold-reached');
    logProgressTest('Normal Progress (No Special Effects)', hasNoSpecialClasses,
        `Container classes: ${elements.container.className}`);
    
    scoreRestore3.restore();
}

// Test 5: Test progress reset after code unlock
async function testProgressReset() {
    console.log('\n🧪 Testing Progress Reset After Code Unlock...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    
    // Set score to first threshold
    const scoreRestore = simulateProgressScore(100);
    
    // Trigger code unlock
    Game.checkSecretCodeUnlock();
    
    // The resetProgressAfterUnlock should be called automatically
    // Wait a bit for the reset animation
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for timeout in resetProgressAfterUnlock
    
    // Check if progress bar was reset for next threshold
    if (elements.label) {
        const labelText = elements.label.innerText;
        const showsNextThreshold = labelText.includes('500') || labelText.includes('DIAMONDHANDS');
        
        logProgressTest('Progress Label Reset', showsNextThreshold,
            `Label text: "${labelText}"`);
    }
    
    // Check if progress calculation is now for next threshold (100-500 range)
    if (elements.fill) {
        const currentWidth = parseFloat(elements.fill.style.width.replace('%', ''));
        // At score 100, we should be at 0% progress toward next threshold (500)
        const progressResetCorrect = currentWidth === 0;
        
        logProgressTest('Progress Bar Reset', progressResetCorrect,
            `Progress width after reset: ${currentWidth}%`);
    }
    
    scoreRestore.restore();
}

// Test 6: Test validator status display
function testValidatorStatus() {
    console.log('\n🧪 Testing Validator Status Display...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    
    // Unlock all codes to trigger validator status
    Game.secretCodes.forEach((code, index) => {
        code.revealed = true;
        Game.cache.unlockedCodes[index] = true;
    });
    
    // Update progress bar (should hide it and show validator achievement)
    Game.updateProgressBar();
    
    // Check if progress container is hidden
    const progressHidden = elements.container && elements.container.style.display === 'none';
    logProgressTest('Progress Hidden for Validator', progressHidden,
        `Progress container display: ${elements.container ? elements.container.style.display : 'not found'}`);
    
    // Check if validator achievement is shown
    const validatorAchievement = document.getElementById('validator-achievement');
    const validatorShown = validatorAchievement && validatorAchievement.style.display === 'block';
    logProgressTest('Validator Achievement Shown', validatorShown,
        `Validator achievement display: ${validatorAchievement ? validatorAchievement.style.display : 'not found'}`);
    
    // Check validator status text
    const validatorStatus = document.getElementById('validator-status');
    const validatorText = validatorStatus ? validatorStatus.innerText : '';
    const hasValidatorText = validatorText.includes('Validator') || validatorText.includes('⚡');
    logProgressTest('Validator Status Text', hasValidatorText,
        `Validator status: "${validatorText}"`);
}

// Test 7: Test progress label updates
function testProgressLabelUpdates() {
    console.log('\n🧪 Testing Progress Label Updates...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    if (!elements.label) {
        logProgressTest('Progress Label Updates', false, 'Progress label not found');
        return;
    }
    
    // Test different score ranges and their labels
    const testCases = [
        { score: 50, expectedCode: 'TOTHEMOON', description: 'First threshold' },
        { score: 300, expectedCode: 'DIAMONDHANDS', description: 'Second threshold' },
        { score: 750, expectedCode: 'HODLGANG', description: 'Third threshold' },
        { score: 1500, expectedCode: 'XRPWHALE', description: 'Fourth threshold' },
        { score: 3000, expectedCode: 'CRYPTOGOD', description: 'Fifth threshold' }
    ];
    
    testCases.forEach(testCase => {
        const scoreRestore = simulateProgressScore(testCase.score);
        
        Game.updateProgressBar();
        
        const labelText = elements.label.innerText;
        const containsExpectedCode = labelText.includes(testCase.expectedCode);
        const showsPointsNeeded = labelText.includes('points to unlock') || labelText.includes('Ready to unlock');
        
        logProgressTest(`Label Update - ${testCase.description}`, 
            containsExpectedCode && showsPointsNeeded,
            `Score: ${testCase.score}, Label: "${labelText}"`);
        
        scoreRestore.restore();
    });
}

// Test 8: Test progress transitions and animations
async function testProgressTransitions() {
    console.log('\n🧪 Testing Progress Transitions and Animations...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    if (!elements.container || !elements.fill) {
        logProgressTest('Progress Transitions', false, 'Progress elements not found');
        return;
    }
    
    // Test smooth transition by making rapid score changes
    const scoreRestore1 = simulateProgressScore(10);
    Game.updateProgressBar();
    const width1 = parseFloat(elements.fill.style.width.replace('%', ''));
    
    const scoreRestore2 = simulateProgressScore(80);
    Game.updateProgressBar();
    const width2 = parseFloat(elements.fill.style.width.replace('%', ''));
    
    const transitionWorked = width2 > width1;
    logProgressTest('Progress Transition', transitionWorked,
        `Width changed from ${width1}% to ${width2}%`);
    
    // Test animation duration changes based on progress
    Game.updateProgressVisualFeedback(95); // Very close to threshold
    const animationDuration = elements.container.style.animationDuration;
    const fastAnimation = animationDuration === '0.5s';
    
    logProgressTest('Animation Speed Adjustment', fastAnimation,
        `Animation duration at 95%: ${animationDuration}`);
    
    scoreRestore2.restore();
    scoreRestore1.restore();
}

// Test 9: Test edge cases
function testProgressEdgeCases() {
    console.log('\n🧪 Testing Progress Edge Cases...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    const elements = getProgressElements();
    
    // Test score of 0
    const scoreRestore1 = simulateProgressScore(0);
    Game.updateProgressBar();
    
    if (elements.fill && elements.text) {
        const zeroWidth = parseFloat(elements.fill.style.width.replace('%', ''));
        const zeroText = parseFloat(elements.text.innerText.replace('%', ''));
        
        logProgressTest('Zero Score Progress', zeroWidth === 0 && zeroText === 0,
            `Width: ${zeroWidth}%, Text: ${zeroText}%`);
    }
    
    scoreRestore1.restore();
    
    // Test score exactly at threshold
    const scoreRestore2 = simulateProgressScore(100);
    Game.updateProgressBar();
    
    if (elements.fill && elements.text) {
        const exactWidth = parseFloat(elements.fill.style.width.replace('%', ''));
        const exactText = parseFloat(elements.text.innerText.replace('%', ''));
        
        logProgressTest('Exact Threshold Progress', exactWidth === 100 && exactText === 100,
            `Width: ${exactWidth}%, Text: ${exactText}%`);
    }
    
    scoreRestore2.restore();
    
    // Test score way above all thresholds
    const scoreRestore3 = simulateProgressScore(10000);
    Game.updateProgressBar();
    
    // Should show validator status or hide progress
    const progressHiddenForHighScore = elements.container.style.display === 'none';
    logProgressTest('High Score Progress Handling', progressHiddenForHighScore,
        `Progress display for score 10000: ${elements.container.style.display}`);
    
    scoreRestore3.restore();
}

// Main test runner for progress tracking
async function runProgressTrackingTests() {
    console.log('📊 Starting Progress Tracking Tests for XRP Crypto Meme Suika Game\n');
    console.log('Testing Requirements: 4.1-4.5 (Progress bar, real-time updates, visual feedback, reset, validator status)\n');
    
    try {
        // Run all tests
        testProgressBarElements();
        testProgressCalculation();
        await testRealTimeUpdates();
        testVisualFeedback();
        await testProgressReset();
        testValidatorStatus();
        testProgressLabelUpdates();
        await testProgressTransitions();
        testProgressEdgeCases();
        
        // Print summary
        console.log('\n📊 Progress Tracking Test Summary:');
        console.log(`✅ Passed: ${progressTestResults.passed}`);
        console.log(`❌ Failed: ${progressTestResults.failed}`);
        console.log(`📈 Success Rate: ${((progressTestResults.passed / (progressTestResults.passed + progressTestResults.failed)) * 100).toFixed(1)}%`);
        
        if (progressTestResults.failed === 0) {
            console.log('\n🎉 All progress tracking tests passed! System working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
            console.log('\nFailed tests:');
            progressTestResults.tests.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return progressTestResults.failed === 0;
        
    } catch (error) {
        console.error('❌ Progress tracking test runner error:', error);
        return false;
    }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.runProgressTrackingTests = runProgressTrackingTests;
    window.progressTestResults = progressTestResults;
}

// Auto-run if in browser and game is loaded
if (typeof window !== 'undefined' && window.Game) {
    console.log('Progress tracking test script loaded. Run runProgressTrackingTests() to start testing.');
}