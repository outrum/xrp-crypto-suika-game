/**
 * Physics Testing Script for XRP Crypto Meme Suika Game
 * Tests physics behavior with new token assets and merging functionality
 */

// Test configuration
const TEST_CONFIG = {
    verbose: true,
    timeout: 5000,
    expectedFPS: 60,
    toleranceFPS: 5
};

// Test results tracking
let testResults = {
    passed: 0,
    failed: 0,
    tests: []
};

// Utility functions for testing
function logTest(testName, passed, message = '') {
    const result = { name: testName, passed, message };
    testResults.tests.push(result);
    
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}: PASSED ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}: FAILED ${message}`);
    }
}

function waitForCondition(condition, timeout = 3000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkCondition = () => {
            if (condition()) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for condition'));
            } else {
                setTimeout(checkCondition, 16); // Check every frame (~60fps)
            }
        };
        checkCondition();
    });
}

// Test 1: Verify token asset loading
function testTokenAssetLoading() {
    console.log('\n🧪 Testing Token Asset Loading...');
    
    // Check if all token sizes are properly defined
    const expectedTokenCount = 11;
    const actualTokenCount = Game.fruitSizes.length;
    
    logTest('Token Count', actualTokenCount === expectedTokenCount, 
        `Expected ${expectedTokenCount}, got ${actualTokenCount}`);
    
    // Check if all tokens have required properties
    let allTokensValid = true;
    let invalidTokens = [];
    
    Game.fruitSizes.forEach((token, index) => {
        const hasRadius = typeof token.radius === 'number' && token.radius > 0;
        const hasScoreValue = typeof token.scoreValue === 'number' && token.scoreValue > 0;
        const hasImg = typeof token.img === 'string' && token.img.length > 0;
        const hasName = typeof token.name === 'string' && token.name.length > 0;
        
        if (!hasRadius || !hasScoreValue || !hasImg || !hasName) {
            allTokensValid = false;
            invalidTokens.push(`Token ${index}: ${token.name || 'unnamed'}`);
        }
    });
    
    logTest('Token Properties', allTokensValid, 
        invalidTokens.length > 0 ? `Invalid tokens: ${invalidTokens.join(', ')}` : 'All tokens have valid properties');
    
    // Check token progression (radius should increase)
    let radiusProgression = true;
    for (let i = 1; i < Game.fruitSizes.length; i++) {
        if (Game.fruitSizes[i].radius <= Game.fruitSizes[i-1].radius) {
            radiusProgression = false;
            break;
        }
    }
    
    logTest('Token Radius Progression', radiusProgression, 
        'Token radii should increase with each level');
    
    // Check score value progression
    let scoreProgression = true;
    for (let i = 1; i < Game.fruitSizes.length; i++) {
        if (Game.fruitSizes[i].scoreValue <= Game.fruitSizes[i-1].scoreValue) {
            scoreProgression = false;
            break;
        }
    }
    
    logTest('Token Score Progression', scoreProgression, 
        'Token score values should increase with each level');
}

// Test 2: Verify physics body generation
function testPhysicsBodyGeneration() {
    console.log('\n🧪 Testing Physics Body Generation...');
    
    // Test body generation for each token size
    let allBodiesValid = true;
    let invalidBodies = [];
    
    Game.fruitSizes.forEach((token, index) => {
        try {
            const body = Game.generateFruitBody(100, 100, index);
            
            // Check if body has required properties
            const hasRadius = body.circleRadius === token.radius;
            const hasSizeIndex = body.sizeIndex === index;
            const hasRender = body.render && body.render.sprite && body.render.sprite.texture === token.img;
            const hasPhysics = body.mass > 0 && body.inertia > 0;
            
            if (!hasRadius || !hasSizeIndex || !hasRender || !hasPhysics) {
                allBodiesValid = false;
                invalidBodies.push(`Token ${index}: ${token.name}`);
            }
        } catch (error) {
            allBodiesValid = false;
            invalidBodies.push(`Token ${index}: ${token.name} - Error: ${error.message}`);
        }
    });
    
    logTest('Physics Body Generation', allBodiesValid, 
        invalidBodies.length > 0 ? `Invalid bodies: ${invalidBodies.join(', ')}` : 'All bodies generated correctly');
}

// Test 3: Test merging behavior
async function testMergingBehavior() {
    console.log('\n🧪 Testing Merging Behavior...');
    
    // Start a new game to test merging
    if (Game.stateIndex === GameStates.MENU) {
        Game.startGame();
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for game to start
    }
    
    // Test merging logic by simulating collision
    const initialScore = Game.score;
    const initialMergedCount = [...Game.fruitsMerged];
    
    // Create two identical tokens for merging test
    const testSizeIndex = 0; // Use smallest token for testing
    const body1 = Game.generateFruitBody(200, 200, testSizeIndex);
    const body2 = Game.generateFruitBody(205, 200, testSizeIndex); // Close enough to merge
    
    // Add bodies to world
    Matter.Composite.add(engine.world, [body1, body2]);
    
    // Wait a bit for physics to settle and potential merge
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if merge occurred (bodies should be removed and new one created)
    const body1Exists = engine.world.bodies.includes(body1);
    const body2Exists = engine.world.bodies.includes(body2);
    
    logTest('Token Merging', !body1Exists && !body2Exists, 
        'Original tokens should be removed after merging');
    
    // Clean up test bodies
    try {
        Matter.Composite.remove(engine.world, [body1, body2]);
    } catch (e) {
        // Bodies might already be removed by merge
    }
}

// Test 4: Test physics performance
async function testPhysicsPerformance() {
    console.log('\n🧪 Testing Physics Performance...');
    
    let frameCount = 0;
    let startTime = Date.now();
    const testDuration = 2000; // 2 seconds
    
    // Add multiple tokens to stress test
    const testBodies = [];
    for (let i = 0; i < 20; i++) {
        const sizeIndex = Math.floor(Math.random() * 5); // Use smaller tokens
        const x = 100 + Math.random() * 400;
        const y = 100 + Math.random() * 200;
        const body = Game.generateFruitBody(x, y, sizeIndex);
        testBodies.push(body);
    }
    
    Matter.Composite.add(engine.world, testBodies);
    
    // Monitor frame rate
    const frameCounter = () => {
        frameCount++;
        if (Date.now() - startTime < testDuration) {
            requestAnimationFrame(frameCounter);
        }
    };
    
    requestAnimationFrame(frameCounter);
    
    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));
    
    const actualFPS = (frameCount / testDuration) * 1000;
    const fpsAcceptable = actualFPS >= (TEST_CONFIG.expectedFPS - TEST_CONFIG.toleranceFPS);
    
    logTest('Physics Performance', fpsAcceptable, 
        `FPS: ${actualFPS.toFixed(1)} (expected: ${TEST_CONFIG.expectedFPS}±${TEST_CONFIG.toleranceFPS})`);
    
    // Clean up test bodies
    Matter.Composite.remove(engine.world, testBodies);
}

// Test 5: Test collision detection
async function testCollisionDetection() {
    console.log('\n🧪 Testing Collision Detection...');
    
    // Test collision with walls
    const testBody = Game.generateFruitBody(50, 300, 0); // Near left wall
    Matter.Composite.add(engine.world, testBody);
    
    // Give it velocity toward the wall
    Matter.Body.setVelocity(testBody, { x: -10, y: 0 });
    
    // Wait for collision
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if body bounced (velocity should have changed direction)
    const velocityAfterCollision = testBody.velocity.x;
    const collisionDetected = velocityAfterCollision > -5; // Should have bounced
    
    logTest('Wall Collision Detection', collisionDetected, 
        `Velocity after collision: ${velocityAfterCollision.toFixed(2)}`);
    
    // Clean up
    Matter.Composite.remove(engine.world, testBody);
}

// Test 6: Test lose condition
async function testLoseCondition() {
    console.log('\n🧪 Testing Lose Condition...');
    
    // Create a token at the lose height
    const testBody = Game.generateFruitBody(Game.width / 2, loseHeight - 10, 2);
    Matter.Composite.add(engine.world, testBody);
    
    // Wait a bit to see if lose condition triggers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if game state changed to lose
    const loseConditionTriggered = Game.stateIndex === GameStates.LOSE;
    
    logTest('Lose Condition Detection', loseConditionTriggered, 
        `Game state: ${Game.stateIndex} (expected: ${GameStates.LOSE})`);
    
    // Clean up
    Matter.Composite.remove(engine.world, testBody);
}

// Main test runner
async function runPhysicsTests() {
    console.log('🚀 Starting Physics Tests for XRP Crypto Meme Suika Game\n');
    console.log('Testing Requirements: 6.1 (Physics interactions) and 6.2 (Merging behavior)\n');
    
    try {
        // Run all tests
        testTokenAssetLoading();
        testPhysicsBodyGeneration();
        await testMergingBehavior();
        await testPhysicsPerformance();
        await testCollisionDetection();
        await testLoseCondition();
        
        // Print summary
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 All physics tests passed! Token assets work correctly with physics system.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the issues above.');
            console.log('\nFailed tests:');
            testResults.tests.filter(test => !test.passed).forEach(test => {
                console.log(`  - ${test.name}: ${test.message}`);
            });
        }
        
        return testResults.failed === 0;
        
    } catch (error) {
        console.error('❌ Test runner error:', error);
        return false;
    }
}

// Export for use in browser console or testing framework
if (typeof window !== 'undefined') {
    window.runPhysicsTests = runPhysicsTests;
    window.testResults = testResults;
}

// Auto-run if in browser and game is loaded
if (typeof window !== 'undefined' && window.Game) {
    console.log('Physics test script loaded. Run runPhysicsTests() to start testing.');
}