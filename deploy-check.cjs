#!/usr/bin/env node

/**
 * Deployment Check Script
 * Validates that the XRP Crypto Suika game is ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Running deployment checks for XRP Crypto Suika Game...\n');

let errors = [];
let warnings = [];

// Check for required files
const requiredFiles = [
  'index.html',
  'index.js',
  'matter.js',
  'netlify.toml',
  'package.json'
];

const requiredDirectories = [
  'assets',
  'assets/tokens',
  'assets/effects',
  'assets/ui',
  // Level directories
  'level1',
  'level2',
  'level3',
  'level4',
  'level5',
  'level6',
  'level7',
  'level8',
  'level9',
  'level10'
];

// Check required files exist
console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`  ✅ ${file}`);
  }
});

// Check required directories exist
console.log('\n📂 Checking required directories...');
requiredDirectories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    errors.push(`Missing required directory: ${dir}`);
  } else {
    console.log(`  ✅ ${dir}`);
  }
});

// Check for level HTML files
console.log('\n🎮 Checking level files...');
for (let i = 1; i <= 10; i++) {
  const levelFile = path.join(process.cwd(), `level${i}`, 'index.html');
  if (!fs.existsSync(levelFile)) {
    errors.push(`Missing level ${i} index.html`);
  } else {
    console.log(`  ✅ Level ${i} index.html`);
  }
}

// Check for required token images
console.log('\n🖼️ Checking token images...');
const requiredTokens = [
  'token_01_xrp.png',
  'token_03_rocket.png',
  'token_04_diamond.png',
  'token_05_shield.png',
  'token_06_whale.png',
  'token_09_galaxy.png',
  'token_10_hodl.png',
  'token_11_crown.png'
];

requiredTokens.forEach(token => {
  const tokenPath = path.join(process.cwd(), 'assets', 'tokens', token);
  if (!fs.existsSync(tokenPath)) {
    warnings.push(`Missing token image: ${token}`);
  } else {
    console.log(`  ✅ ${token}`);
  }
});

// Validate package.json
console.log('\n📦 Validating package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.name) {
    errors.push('package.json missing name field');
  }
  
  if (!packageJson.scripts) {
    warnings.push('package.json missing scripts section');
  } else {
    console.log('  ✅ package.json is valid');
  }
} catch (e) {
  errors.push(`Invalid package.json: ${e.message}`);
}

// Check index.js for level system
console.log('\n🔧 Checking level system implementation...');
try {
  const indexJs = fs.readFileSync('index.js', 'utf8');
  
  if (!indexJs.includes('levelConfigs')) {
    warnings.push('Level configuration system not found in index.js');
  } else {
    console.log('  ✅ Level configuration found');
  }
  
  if (!indexJs.includes('detectLevelFromURL')) {
    warnings.push('URL level detection not found in index.js');
  } else {
    console.log('  ✅ URL level detection found');
  }
  
  if (!indexJs.includes('initializeLevel')) {
    warnings.push('Level initialization not found in index.js');
  } else {
    console.log('  ✅ Level initialization found');
  }
} catch (e) {
  errors.push(`Could not read index.js: ${e.message}`);
}

// Check netlify.toml
console.log('\n🌐 Checking Netlify configuration...');
try {
  const netlifyToml = fs.readFileSync('netlify.toml', 'utf8');
  
  if (!netlifyToml.includes('[build]')) {
    warnings.push('netlify.toml missing [build] section');
  } else {
    console.log('  ✅ Build configuration found');
  }
  
  if (!netlifyToml.includes('[[headers]]')) {
    warnings.push('netlify.toml missing headers configuration');
  } else {
    console.log('  ✅ Headers configuration found');
  }
} catch (e) {
  warnings.push(`Could not read netlify.toml: ${e.message}`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DEPLOYMENT CHECK SUMMARY');
console.log('='.repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log('\n✅ All checks passed! Ready for deployment.');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS (must fix before deployment):');
    errors.forEach(error => console.log(`  • ${error}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS (should review):');
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ Deployment checks failed. Please fix errors before deploying.');
    process.exit(1);
  } else {
    console.log('\n⚠️ Deployment checks passed with warnings.');
    process.exit(0);
  }
}