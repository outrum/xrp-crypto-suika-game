/**
 * Secret Code System Testing Script for XRP Crypto Meme Suika Game
 * Tests all secret code thresholds, popup display, and functionality
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 */

// Test configuration
const SECRET_CODE_TEST_CONFIG = {
    verbose: true,
    timeout: 5000,
    expectedCodes: [
        { threshold: 100, code: "TOTHEMOON" },
        { threshold: 500, code: "DIAMONDHANDS" },
        { threshold: 1000, code: "HODLGANG" },
        { threshold: 2500, code: "XRPWHALE" },
        { threshold: 5000, code: "CRYPTOGOD" }
    ]
};

// Test results tracking
let secretCodeTestResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions for testing
function logSecretCodeTest(testName, passed, message = '') {
    const result = { name: testName, passed, message };
    secretCodeTestResults.tests.push(result);
    
    if (passed) {
        secretCodeTestResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        secretCodeTestResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
}

function waitForElement(selector, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Element ${selector} not found within timeout`));
            } else {
                setTimeout(checkElement, 100);
            }
        };
        checkElement();
    });
}

function simulateScore(targetScore) {
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
    
    // Update UI
    Game.calculateScore();
    
    return {
        restore: () => {
            Game.score = originalScore;
            Game.fruitsMerged = originalFruitsMerged;
            Game.calculateScore();
        }
    };
}

// Test 1: Verify secret code data structure
function testSecretCodeStructure() {
    console.log('\n🧪 Testing Secret Code Data Structure...');
    
    // Check if secret codes array exists
    const hasSecretCodes = Array.isArray(Game.secretCodes);
    logSecretCodeTest('Secret Codes Array Exists', hasSecretCodes, 
        hasSecretCodes ? `Found ${Game.secretCodes.length} codes` : 'secretCodes not found or not array');
    
    if (!hasSecretCodes) return;
    
    // Check expected number of codes
    const expectedCount = SECRET_CODE_TEST_CONFIG.expectedCodes.length;
    const actualCount = Game.secretCodes.length;
    logSecretCodeTest('Secret Code Count', actualCount === expectedCount,
        `Expected ${expectedCount}, got ${actualCount}`);
    
    // Validate each secret code structure
    let allCodesValid = true;
    let invalidCodes = [];
    
    Game.secretCodes.forEach((code, index) => {
        const hasThreshold = typeof code.threshold === 'number' && code.threshold > 0;
        const hasCode = typeof code.code === 'string' && code.code.length > 0;
        const hasMessage = typeof code.message === 'string' && code.message.length > 0;
        const hasRevealed = typeof code.revealed === 'boolean';
        
        if (!hasThreshold || !hasCode || !hasMessage || !hasRevealed) {
            allCodesValid = false;
            invalidCodes.push(`Code ${index}: ${code.code || 'unnamed'}`);
        }
    });
    
    logSecretCodeTest('Secret Code Properties', allCodesValid,
        invalidCodes.length > 0 ? `Invalid codes: ${invalidCodes.join(', ')}` : 'All codes have valid properties');
    
    // Check threshold progression
    let thresholdProgression = true;
    for (let i = 1; i < Game.secretCodes.length; i++) {
        if (Game.secretCodes[i].threshold <= Game.secretCodes[i-1].threshold) {
            thresholdProgression = false;
            break;
        }
    }
    
    logSecretCodeTest('Threshold Progression', thresholdProgression,
        'Thresholds should increase with each code');
    
    // Verify expected codes and thresholds
    let expectedCodesMatch = true;
    SECRET_CODE_TEST_CONFIG.expectedCodes.forEach((expected, index) => {
        if (index < Game.secretCodes.length) {
            const actual = Game.secretCodes[index];
            if (actual.threshold !== expected.threshold || actual.code !== expected.code) {
                expectedCodesMatch = false;
            }
        } else {
            expectedCodesMatch = false;
        }
    });
    
    logSecretCodeTest('Expected Codes Match', expectedCodesMatch,
        'All codes match expected thresholds and values');
}

// Test 2: Test code unlock detection
async function testCodeUnlockDetection() {
    console.log('\n🧪 Testing Code Unlock Detection...');
    
    // Reset all codes first
    Game.resetSecretCodes();
    
    // Test each threshold
    for (let i = 0; i < SECRET_CODE_TEST_CONFIG.expectedCodes.length; i++) {
        const expectedCode = SECRET_CODE_TEST_CONFIG.expectedCodes[i];
        
        // Set score just below threshold
        const scoreRestore = simulateScore(expectedCode.threshold - 1);
        
        // Check that code is not revealed yet
        const notRevealedBefore = !Game.secretCodes[i].revealed;
        logSecretCodeTest(`Code ${i+1} Not Revealed Before Threshold`, notRevealedBefore,
            `Score: ${expectedCode.threshold - 1}, Code: ${expectedCode.code}`);
        
        // Set score to threshold
        scoreRestore.restore();
        const scoreRestore2 = simulateScore(expectedCode.threshold);
        
        // Trigger check
        Game.checkSecretCodeUnlock();
        
        // Check that code is now revealed
        const revealedAfter = Game.secretCodes[i].revealed;
        logSecretCodeTest(`Code ${i+1} Revealed At Threshold`, revealedAfter,
            `Score: ${expectedCode.threshold}, Code: ${expectedCode.code}`);
        
        // Check that cache is updated
        const cacheUpdated = Game.cache.unlockedCodes[i] === true;
        logSecretCodeTest(`Code ${i+1} Cache Updated`, cacheUpdated,
            `Cache status: ${Game.cache.unlockedCodes[i]}`);
        
        scoreRestore2.restore();
    }
}

// Test 3: Test popup display functionality
async function testPopupDisplay() {
    console.log('\n🧪 Testing Popup Display Functionality...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    // Test popup for first code
    const testCodeIndex = 0;
    const testCode = Game.secretCodes[testCodeIndex];
    
    // Show popup
    Game.showSecretCodePopup(testCodeIndex);
    
    // Check if popup is visible
    const popup = document.getElementById('secret-code-popup');
    const popupVisible = popup && popup.style.display === 'flex';
    logSecretCodeTest('Popup Visibility', popupVisible,
        `Popup display: ${popup ? popup.style.display : 'element not found'}`);
    
    // Check popup content
    const messageElement = document.getElementById('secret-code-message');
    const valueElement = document.getElementById('secret-code-value');
    
    const messageCorrect = messageElement && messageElement.innerText === testCode.message;
    const valueCorrect = valueElement && valueElement.innerText === testCode.code;
    
    logSecretCodeTest('Popup Message Content', messageCorrect,
        `Expected: "${testCode.message}", Got: "${messageElement ? messageElement.innerText : 'not found'}"`);
    
    logSecretCodeTest('Popup Code Value', valueCorrect,
        `Expected: "${testCode.code}", Got: "${valueElement ? valueElement.innerText : 'not found'}"`);
    
    // Check if game is paused
    const gamePaused = !runner.enabled;
    logSecretCodeTest('Game Paused During Popup', gamePaused,
        `Runner enabled: ${runner.enabled}`);
    
    // Test popup close
    Game.hideSecretCodePopup();
    
    const popupHidden = popup.style.display === 'none';
    logSecretCodeTest('Popup Hide Functionality', popupHidden,
        `Popup display after hide: ${popup.style.display}`);
    
    // Check if game is resumed (only if not in lose state)
    const gameResumed = runner.enabled || Game.stateIndex === GameStates.LOSE;
    logSecretCodeTest('Game Resumed After Popup', gameResumed,
        `Runner enabled: ${runner.enabled}, Game state: ${Game.stateIndex}`);
}

// Test 4: Test copy to clipboard functionality
async function testCopyToClipboard() {
    console.log('\n🧪 Testing Copy to Clipboard Functionality...');
    
    // Show popup with test code
    Game.showSecretCodePopup(0);
    
    // Mock clipboard API for testing
    const originalClipboard = navigator.clipboard;
    let clipboardText = '';
    
    navigator.clipboard = {
        writeText: (text) => {
            clipboardText = text;
            return Promise.resolve();
        }
    };
    
    // Test copy functionality
    try {
        Game.copyCodeToClipboard();
        
        // Wait a bit for async operation
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const expectedText = Game.secretCodes[0].code;
        const copySuccessful = clipboardText === expectedText;
        
        logSecretCodeTest('Copy to Clipboard', copySuccessful,
            `Expected: "${expectedText}", Copied: "${clipboardText}"`);
        
        // Check button feedback
        const copyButton = document.getElementById('copy-code-btn');
        const buttonFeedback = copyButton && copyButton.innerText.includes('Copied');
        
        logSecretCodeTest('Copy Button Feedback', buttonFeedback,
            `Button text: "${copyButton ? copyButton.innerText : 'not found'}"`);
        
    } catch (error) {
        logSecretCodeTest('Copy to Clipboard', false, `Error: ${error.message}`);
    } finally {
        // Restore original clipboard
        navigator.clipboard = originalClipboard;
        Game.hideSecretCodePopup();
    }
}

// Test 5: Test social sharing functionality
async function testSocialSharing() {
    console.log('\n🧪 Testing Social Sharing Functionality...');
    
    // Mock window.open for Twitter sharing
    const originalOpen = window.open;
    let openedUrl = '';
    
    window.open = (url, target, features) => {
        openedUrl = url;
        return { close: () => {} };
    };
    
    // Show popup and test Twitter sharing
    Game.showSecretCodePopup(0);
    
    try {
        Game.shareOnTwitter();
        
        const twitterShareWorking = openedUrl.includes('twitter.com/intent/tweet');
        const containsCode = openedUrl.includes(Game.secretCodes[0].code);
        const containsScore = openedUrl.includes(Game.score.toString());
        
        logSecretCodeTest('Twitter Share URL', twitterShareWorking,
            `URL contains twitter intent: ${twitterShareWorking}`);
        
        logSecretCodeTest('Twitter Share Content', containsCode && containsScore,
            `Contains code: ${containsCode}, Contains score: ${containsScore}`);
        
    } catch (error) {
        logSecretCodeTest('Twitter Sharing', false, `Error: ${error.message}`);
    } finally {
        window.open = originalOpen;
        Game.hideSecretCodePopup();
    }
    
    // Test generic sharing (Web Share API mock)
    const originalShare = navigator.share;
    let sharedData = null;
    
    navigator.share = (data) => {
        sharedData = data;
        return Promise.resolve();
    };
    
    Game.showSecretCodePopup(1);
    
    try {
        Game.shareGeneric();
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const shareDataValid = sharedData && 
            sharedData.title && 
            sharedData.text && 
            sharedData.url;
        
        logSecretCodeTest('Generic Share Data', shareDataValid,
            `Share data structure valid: ${shareDataValid}`);
        
    } catch (error) {
        logSecretCodeTest('Generic Sharing', false, `Error: ${error.message}`);
    } finally {
        navigator.share = originalShare;
        Game.hideSecretCodePopup();
    }
}

// Test 6: Test storage persistence
function testStoragePersistence() {
    console.log('\n🧪 Testing Storage Persistence...');
    
    // Reset codes
    Game.resetSecretCodes();
    
    // Unlock a few codes
    Game.secretCodes[0].revealed = true;
    Game.secretCodes[1].revealed = true;
    Game.cache.unlockedCodes[0] = true;
    Game.cache.unlockedCodes[1] = true;
    
    // Save state
    Game.saveGameState();
    
    // Check localStorage
    const savedData = localStorage.getItem('xrp-suika-game-cache');
    const storageExists = savedData !== null;
    
    logSecretCodeTest('Local Storage Save', storageExists,
        `Storage data exists: ${storageExists}`);
    
    if (storageExists) {
        try {
            const parsedData = JSON.parse(savedData);
            const hasUnlockedCodes = Array.isArray(parsedData.unlockedCodes);
            const codesMatch = hasUnlockedCodes && 
                parsedData.unlockedCodes[0] === true && 
                parsedData.unlockedCodes[1] === true;
            
            logSecretCodeTest('Storage Data Structure', hasUnlockedCodes,
                `Has unlockedCodes array: ${hasUnlockedCodes}`);
            
            logSecretCodeTest('Storage Code Status', codesMatch,
                `Codes 0,1 unlocked in storage: ${codesMatch}`);
            
        } catch (error) {
            logSecretCodeTest('Storage Data Parse', false, `Parse error: ${error.message}`);
        }
    }
    
    // Test loading
    Game.resetSecretCodes(); // Reset to test loading
    Game.loadHighscore(); // This should restore the codes
    
    const codesRestored = Game.secretCodes[0].revealed && Game.secretCodes[1].revealed;
    logSecretCodeTest('Storage Code Restoration', codesRestored,
        `Codes restored from storage: ${codesRestored}`);
}

// Test 7: Test all thresholds systematically
async function testAllThresholds() {
    console.log('\n🧪 Testing All Code Thresholds Systematically...');
    
    // Reset everything
    Game.resetSecretCodes();
    
    let allThresholdsWork = true;
    const thresholdResults = [];
    
    for (let i = 0; i < SECRET_CODE_TEST_CONFIG.expectedCodes.length; i++) {
        const expected = SECRET_CODE_TEST_CONFIG.expectedCodes[i];
        
        // Set score to exact threshold
        const scoreRestore = simulateScore(expected.threshold);
        
        // Check unlock
        Game.checkSecretCodeUnlock();
        
        // Verify unlock
        const unlocked = Game.secretCodes[i].revealed;
        const cacheUpdated = Game.cache.unlockedCodes[i];
        
        thresholdResults.push({
            threshold: expected.threshold,
            code: expected.code,
            unlocked,
            cacheUpdated
        });
        
        if (!unlocked || !cacheUpdated) {
            allThresholdsWork = false;
        }
        
        scoreRestore.restore();
    }
    
    logSecretCodeTest('All Thresholds Function', allThresholdsWork,
        `${thresholdResults.filter(r => r.unlocked && r.cacheUpdated).length}/${thresholdResults.length} thresholds working`);
    
    // Log individual results
    thresholdResults.forEach((result, index) => {
        logSecretCodeTest(`Threshold ${result.threshold} (${result.code})`, 
            result.unlocked && result.cacheUpdated,
            `Unlocked: ${result.unlocked}, Cache: ${result.cacheUpdated}`);
    });
}

// Test 8: Test edge cases
async function testEdgeCases() {
    console.log('\n🧪 Testing Edge Cases...');
    
    // Test score exactly at threshold
    Game.resetSecretCodes();
    const scoreRestore1 = simulateScore(100); // Exact threshold
    Game.checkSecretCodeUnlock();
    const exactThresholdWorks = Game.secretCodes[0].revealed;
    logSecretCodeTest('Exact Threshold Score', exactThresholdWorks,
        'Score exactly at threshold should unlock code');
    scoreRestore1.restore();
    
    // Test score above threshold
    Game.resetSecretCodes();
    const scoreRestore2 = simulateScore(150); // Above threshold
    Game.checkSecretCodeUnlock();
    const aboveThresholdWorks = Game.secretCodes[0].revealed;
    logSecretCodeTest('Above Threshold Score', aboveThresholdWorks,
        'Score above threshold should unlock code');
    scoreRestore2.restore();
    
    // Test multiple codes at once
    Game.resetSecretCodes();
    const scoreRestore3 = simulateScore(1500); // Should unlock first 3 codes
    Game.checkSecretCodeUnlock();
    const multipleUnlocks = Game.secretCodes[0].revealed && 
                           Game.secretCodes[1].revealed && 
                           Game.secretCodes[2].revealed;
    logSecretCodeTest('Multiple Code Unlock', multipleUnlocks,
        'High score should unlock multiple codes at once');
    scoreRestore3.restore();
    
    // Test already revealed code
    Game.resetSecretCodes();
    Game.secretCodes[0].revealed = true;
    const scoreRestore4 = simulateScore(100);
    const originalCacheState = [...Game.cache.unlockedCodes];
    Game.checkSecretCodeUnlock();
    const noDoubleUnlock = JSON.stringify(Game.cache.unlockedCodes) === JSON.stringify(originalCacheState);
    logSecretCodeTest('No Double Unlock', noDoubleUnlock,
        'Already revealed codes should not trigger again');
    scoreRestore4.restore();
}

// Main test runner for secret codes
async function runSecretCodeTests() {
    console.log('🔐 Starting Secret Code System Tests for XRP Crypto Meme Suika Game\n');
    console.log('Testing Requirements: 3.1-3.8 (Secret code thresholds, popup display, functionality)\n');
    
    try {
        // Run all tests
        testSecretCodeStructure();
        await testCodeUnlockDetection();
        await testPopupDisplay();
        await testCopyToClipboard();
        await testSocialSharing();
        testStoragePersistence();
        await testAllThresholds();
        await testEdgeCases();
        
        // Print summary
        console.log('\n📊 Secret Code Test Summary:');
        console.log(`✅ Passed: ${secretCodeTestResults.passed}`);
        console.log(`❌ Failed: ${secretCodeTestResults.failed}`);
        console.log(`📈 Success Rate: ${((secretCodeTestResults.passed / (secretCodeTestResults.passed + secretCodeTestResults.failed)) * 100).toFixed(1)}%`);
        
        if (secretCodeTestResults.failed === 0) {
            console.log('\n🎉 All secret code tests passed! System working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
            console.log('\nFailed tests:');
            secretCodeTestResults.tests.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return secretCodeTestResults.failed === 0;
        
    } catch (error) {
        console.error('❌ Secret code test runner error:', error);
        return false;
    }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.runSecretCodeTests = runSecretCodeTests;
    window.secretCodeTestResults = secretCodeTestResults;
}

// Auto-run if in browser and game is loaded
if (typeof window !== 'undefined' && window.Game) {
    console.log('Secret code test script loaded. Run runSecretCodeTests() to start testing.');
}