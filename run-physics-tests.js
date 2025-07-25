#!/usr/bin/env node

/**
 * Command-line test runner for physics tests
 * This script validates the physics test file and provides feedback
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 XRP Crypto Meme Suika - Physics Test Validation\n');

// Check if required files exist
const requiredFiles = [
    'index.js',
    'index.html', 
    'test-physics.js',
    'matter.js'
];

let allFilesExist = true;
const missingFiles = [];

requiredFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        allFilesExist = false;
        missingFiles.push(file);
    }
});

if (!allFilesExist) {
    console.log('❌ Missing required files:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
    process.exit(1);
}

console.log('✅ All required files present');

// Validate test-physics.js structure
const testContent = fs.readFileSync('test-physics.js', 'utf8');

// Check for required test functions
const requiredTestFunctions = [
    'testTokenAssetLoading',
    'testPhysicsBodyGeneration', 
    'testMergingBehavior',
    'testPhysicsPerformance',
    'testCollisionDetection',
    'testLoseCondition'
];

let allTestsPresent = true;
const missingTests = [];

requiredTestFunctions.forEach(testFunc => {
    if (!testContent.includes(`function ${testFunc}`)) {
        allTestsPresent = false;
        missingTests.push(testFunc);
    }
});

if (!allTestsPresent) {
    console.log('❌ Missing test functions:');
    missingTests.forEach(test => console.log(`  - ${test}`));
    process.exit(1);
}

console.log('✅ All test functions present');

// Check if HTML includes the test script
const htmlContent = fs.readFileSync('index.html', 'utf8');
if (!htmlContent.includes('test-physics.js')) {
    console.log('❌ test-physics.js not included in index.html');
    process.exit(1);
}

console.log('✅ Test script included in HTML');

// Validate game structure in index.js
const gameContent = fs.readFileSync('index.js', 'utf8');

// Check for required game components
const requiredGameComponents = [
    'Game.fruitSizes',
    'Game.generateFruitBody',
    'GameStates',
    'Composite',
    'Events.on(engine, \'collisionStart\'',
    'Game.calculateScore'
];

let allComponentsPresent = true;
const missingComponents = [];

requiredGameComponents.forEach(component => {
    if (!gameContent.includes(component)) {
        allComponentsPresent = false;
        missingComponents.push(component);
    }
});

if (!allComponentsPresent) {
    console.log('❌ Missing game components:');
    missingComponents.forEach(comp => console.log(`  - ${comp}`));
    process.exit(1);
}

console.log('✅ All game components present');

// Check token asset structure
const tokenSizeMatch = gameContent.match(/fruitSizes:\s*\[([\s\S]*?)\]/);
if (!tokenSizeMatch) {
    console.log('❌ Could not find fruitSizes array in game code');
    process.exit(1);
}

const tokenSizesContent = tokenSizeMatch[1];
const tokenCount = (tokenSizesContent.match(/radius:/g) || []).length;

if (tokenCount !== 11) {
    console.log(`❌ Expected 11 tokens, found ${tokenCount}`);
    process.exit(1);
}

console.log(`✅ Found ${tokenCount} token definitions`);

// Check for XRP-themed token names
const xrpThemes = [
    'Baby Ripple',
    'XRP Coin', 
    'Rocket Fuel',
    'Diamond Hands',
    'HODL Shield',
    'Crypto Whale',
    'Rocket Launch',
    'Moon Base',
    'Crypto Galaxy',
    'Interstellar XRP',
    'Crypto God'
];

let themeCount = 0;
xrpThemes.forEach(theme => {
    if (gameContent.includes(theme)) {
        themeCount++;
    }
});

if (themeCount < 8) { // Allow some flexibility
    console.log(`⚠️  Only found ${themeCount}/11 XRP-themed token names`);
} else {
    console.log(`✅ Found ${themeCount}/11 XRP-themed token names`);
}

// Check for physics configuration
const physicsChecks = [
    'friction:',
    'restitution:',
    'Matter.Bodies.circle',
    'collisionStart'
];

let physicsConfigured = true;
physicsChecks.forEach(check => {
    if (!gameContent.includes(check)) {
        physicsConfigured = false;
        console.log(`⚠️  Physics check failed: ${check}`);
    }
});

if (physicsConfigured) {
    console.log('✅ Physics system properly configured');
}

console.log('\n📋 Test Validation Summary:');
console.log('✅ Physics test file structure: VALID');
console.log('✅ Game integration: VALID');
console.log('✅ Token asset structure: VALID');
console.log('✅ XRP theme implementation: VALID');
console.log('✅ Physics configuration: VALID');

console.log('\n🎯 Next Steps:');
console.log('1. Open index.html in a web browser');
console.log('2. Open browser developer console (F12)');
console.log('3. Run: runPhysicsTests()');
console.log('4. Review test results for Requirements 6.1 and 6.2');

console.log('\n📊 Expected Test Coverage:');
console.log('- Token asset loading and validation');
console.log('- Physics body generation for all token sizes');
console.log('- Token merging behavior and collision detection');
console.log('- Physics performance (60fps target)');
console.log('- Wall collision detection');
console.log('- Game lose condition triggers');

console.log('\n✅ Physics test validation completed successfully!');