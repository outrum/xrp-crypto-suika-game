#!/usr/bin/env node

/**
 * Pre-deployment check script for XRP Crypto Meme Suika Game
 * Verifies that all required files and configurations are in place
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Running pre-deployment checks...\n');

const checks = [
  {
    name: 'netlify.toml exists',
    check: () => fs.existsSync('netlify.toml'),
    fix: 'Create netlify.toml file with proper configuration'
  },
  {
    name: 'index.html exists',
    check: () => fs.existsSync('index.html'),
    fix: 'Ensure index.html is in the root directory'
  },
  {
    name: 'index.js exists',
    check: () => fs.existsSync('index.js'),
    fix: 'Ensure index.js is in the root directory'
  },
  {
    name: 'assets directory exists',
    check: () => fs.existsSync('assets') && fs.statSync('assets').isDirectory(),
    fix: 'Ensure assets directory exists with game assets'
  },
  {
    name: 'package.json exists',
    check: () => fs.existsSync('package.json'),
    fix: 'Ensure package.json is not ignored in .gitignore'
  },
  {
    name: 'Supabase dependency in package.json',
    check: () => {
      if (!fs.existsSync('package.json')) return false;
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return pkg.dependencies && pkg.dependencies['@supabase/supabase-js'];
    },
    fix: 'Install Supabase client: npm install @supabase/supabase-js'
  },
  {
    name: 'Environment variable usage in code',
    check: () => {
      if (!fs.existsSync('index.js')) return false;
      const code = fs.readFileSync('index.js', 'utf8');
      return code.includes('VITE_SUPABASE_URL') && code.includes('VITE_SUPABASE_ANON_KEY');
    },
    fix: 'Ensure index.js uses environment variables for Supabase config'
  },
  {
    name: 'Token images exist',
    check: () => {
      const tokenDir = path.join('assets', 'img');
      if (!fs.existsSync(tokenDir)) return false;
      
      // Check for at least some token images
      const files = fs.readdirSync(tokenDir);
      const tokenImages = files.filter(f => f.startsWith('circle') && f.endsWith('.png'));
      return tokenImages.length >= 10;
    },
    fix: 'Ensure token images are generated and placed in assets/img/'
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const passed = check.check();
  const status = passed ? '✅' : '❌';
  console.log(`${index + 1}. ${status} ${check.name}`);
  
  if (!passed) {
    console.log(`   💡 Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 All checks passed! Ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect your repository to Netlify');
  console.log('3. Set environment variables in Netlify dashboard');
  console.log('4. Deploy and test!');
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above before deploying.');
  process.exit(1);
}

console.log('\n📖 See DEPLOYMENT.md for detailed deployment instructions.');