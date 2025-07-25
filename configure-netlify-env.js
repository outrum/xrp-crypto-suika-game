#!/usr/bin/env node

/**
 * Netlify Environment Configuration Helper
 * 
 * This script helps configure and validate Supabase environment variables
 * for Netlify deployment of the XRP Crypto Meme Suika game.
 */

import fs from 'fs';
import path from 'path';

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

function displayHeader() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  XRP Crypto Meme Suika - Netlify Environment Setup', 'bright');
    log('='.repeat(60), 'cyan');
    log('');
}

function displayNetlifyInstructions() {
    log('📋 NETLIFY ENVIRONMENT VARIABLES SETUP', 'bright');
    log('');
    log('Follow these steps to configure environment variables in Netlify:', 'blue');
    log('');
    log('1. Log in to your Netlify dashboard (https://app.netlify.com)', 'yellow');
    log('2. Select your site (XRP Crypto Meme Suika game)', 'yellow');
    log('3. Go to Site settings > Environment variables', 'yellow');
    log('4. Add the following environment variables:', 'yellow');
    log('');
    
    log('   Required Environment Variables:', 'green');
    log('   ┌─────────────────────────────────────────────────────────┐', 'green');
    log('   │ Variable Name: VITE_SUPABASE_URL                        │', 'green');
    log('   │ Value: https://your-project.supabase.co                 │', 'green');
    log('   │ (Get from Supabase Dashboard > Settings > API)         │', 'green');
    log('   └─────────────────────────────────────────────────────────┘', 'green');
    log('');
    log('   ┌─────────────────────────────────────────────────────────┐', 'green');
    log('   │ Variable Name: VITE_SUPABASE_ANON_KEY                   │', 'green');
    log('   │ Value: eyJ... (your anonymous/public key)               │', 'green');
    log('   │ (Get from Supabase Dashboard > Settings > API)         │', 'green');
    log('   └─────────────────────────────────────────────────────────┘', 'green');
    log('');
    
    log('5. Click "Save" after adding each variable', 'yellow');
    log('6. Trigger a new deployment to apply the changes', 'yellow');
    log('');
}

function displaySupabaseInstructions() {
    log('🔑 HOW TO GET SUPABASE CREDENTIALS', 'bright');
    log('');
    log('To get your Supabase URL and Anonymous Key:', 'blue');
    log('');
    log('1. Go to https://supabase.com and log in', 'yellow');
    log('2. Select your project (or create one if needed)', 'yellow');
    log('3. Go to Settings > API', 'yellow');
    log('4. Copy the following values:', 'yellow');
    log('   • Project URL (VITE_SUPABASE_URL)', 'green');
    log('   • anon/public key (VITE_SUPABASE_ANON_KEY)', 'green');
    log('');
    log('⚠️  IMPORTANT: Use the "anon" key, NOT the "service_role" key!', 'red');
    log('   The service_role key should never be exposed in client-side code.', 'red');
    log('');
}

function validateLocalConfiguration() {
    log('🔍 VALIDATING LOCAL CONFIGURATION', 'bright');
    log('');
    
    const checks = [
        {
            name: 'netlify.toml exists',
            check: () => fs.existsSync('netlify.toml'),
            fix: 'Ensure netlify.toml is in the root directory'
        },
        {
            name: 'netlify.toml has environment variables section',
            check: () => {
                if (!fs.existsSync('netlify.toml')) return false;
                const content = fs.readFileSync('netlify.toml', 'utf8');
                return content.includes('VITE_SUPABASE_URL') && content.includes('VITE_SUPABASE_ANON_KEY');
            },
            fix: 'Add environment variables section to netlify.toml'
        },
        {
            name: 'index.js uses environment variables',
            check: () => {
                if (!fs.existsSync('index.js')) return false;
                const content = fs.readFileSync('index.js', 'utf8');
                return content.includes('import.meta.env.VITE_SUPABASE_URL') && 
                       content.includes('import.meta.env.VITE_SUPABASE_ANON_KEY');
            },
            fix: 'Update index.js to use import.meta.env for environment variables'
        },
        {
            name: 'Supabase schema file exists',
            check: () => fs.existsSync('supabase-schema.sql'),
            fix: 'Ensure supabase-schema.sql is present for database setup'
        }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
        const passed = check.check();
        const status = passed ? '✅' : '❌';
        const color = passed ? 'green' : 'red';
        
        log(`${status} ${check.name}`, color);
        
        if (!passed) {
            log(`   Fix: ${check.fix}`, 'yellow');
            allPassed = false;
        }
    });
    
    log('');
    if (allPassed) {
        log('✅ All local configuration checks passed!', 'green');
    } else {
        log('❌ Some configuration issues found. Please fix them before deployment.', 'red');
    }
    log('');
}

function displayTestingInstructions() {
    log('🧪 TESTING ENVIRONMENT VARIABLES', 'bright');
    log('');
    log('After configuring environment variables in Netlify:', 'blue');
    log('');
    log('1. Deploy your site (or trigger a redeploy)', 'yellow');
    log('2. Open your deployed site in a browser', 'yellow');
    log('3. Open browser developer tools (F12)', 'yellow');
    log('4. Go to the Console tab', 'yellow');
    log('5. Run this command to test environment variables:', 'yellow');
    log('');
    log('   console.log("Supabase URL:", import.meta.env.VITE_SUPABASE_URL);', 'green');
    log('   console.log("Supabase Key:", import.meta.env.VITE_SUPABASE_ANON_KEY ? "Set" : "Missing");', 'green');
    log('');
    log('6. You should see your Supabase URL and "Set" for the key', 'yellow');
    log('7. If you see "undefined", the environment variables are not configured correctly', 'yellow');
    log('');
    
    log('Alternative: Use the built-in test function:', 'blue');
    log('   testDatabaseConnectivity()', 'green');
    log('');
}

function displayDeploymentChecklist() {
    log('✅ DEPLOYMENT CHECKLIST', 'bright');
    log('');
    log('Before going live, ensure:', 'blue');
    log('');
    log('□ Supabase project is created and active', 'yellow');
    log('□ Database schema is deployed (run supabase-schema.sql)', 'yellow');
    log('□ Environment variables are set in Netlify', 'yellow');
    log('□ Site is connected to GitHub repository', 'yellow');
    log('□ Continuous deployment is enabled', 'yellow');
    log('□ Game functionality tested in production', 'yellow');
    log('□ Secret code system tested', 'yellow');
    log('□ Data persistence tested', 'yellow');
    log('');
}

function displayTroubleshootingTips() {
    log('🔧 TROUBLESHOOTING TIPS', 'bright');
    log('');
    
    const tips = [
        {
            issue: 'Environment variables not working',
            solutions: [
                'Verify variables are set in Netlify dashboard',
                'Check variable names match exactly (case-sensitive)',
                'Redeploy after adding variables',
                'Clear browser cache and try again'
            ]
        },
        {
            issue: 'Supabase connection fails',
            solutions: [
                'Verify Supabase URL format (https://your-project.supabase.co)',
                'Ensure you\'re using the anon key, not service_role key',
                'Check Supabase project is active and not paused',
                'Verify RLS policies allow anonymous access'
            ]
        },
        {
            issue: 'Game loads but data doesn\'t persist',
            solutions: [
                'Check browser console for Supabase errors',
                'Verify database schema is deployed',
                'Test database connectivity using built-in test functions',
                'Check network tab for failed API requests'
            ]
        }
    ];
    
    tips.forEach(tip => {
        log(`❓ ${tip.issue}:`, 'red');
        tip.solutions.forEach(solution => {
            log(`   • ${solution}`, 'yellow');
        });
        log('');
    });
}

function generateEnvTemplate() {
    log('📄 GENERATING ENVIRONMENT TEMPLATE', 'bright');
    log('');
    
    const template = `# Environment Variables Template for Netlify
# Copy these to your Netlify dashboard under Site settings > Environment variables

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anonymous-key-here

# Ideogram API (already configured in netlify.toml)
IDEOGRAM_API_KEY=QIX2yPBqTSSjSVPtjsayIM9o87KaxtPW4c-QvcI_VMCVdKiWM91b-EFjQoMErS7z8QTuQDlEASZ8YnBylL6QZA

# Instructions:
# 1. Replace 'your-project' with your actual Supabase project reference
# 2. Replace 'your-anonymous-key-here' with your actual Supabase anon key
# 3. Add these to Netlify dashboard, not to a .env file (for security)
`;
    
    fs.writeFileSync('.env.template', template);
    log('✅ Created .env.template file with environment variable template', 'green');
    log('   (This file is for reference only - add variables to Netlify dashboard)', 'yellow');
    log('');
}

function main() {
    displayHeader();
    
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        log('Usage: node configure-netlify-env.js [options]', 'blue');
        log('');
        log('Options:', 'blue');
        log('  --validate    Validate local configuration only', 'yellow');
        log('  --template    Generate environment template file', 'yellow');
        log('  --help, -h    Show this help message', 'yellow');
        log('');
        return;
    }
    
    if (args.includes('--validate')) {
        validateLocalConfiguration();
        return;
    }
    
    if (args.includes('--template')) {
        generateEnvTemplate();
        return;
    }
    
    // Full setup guide
    displayNetlifyInstructions();
    displaySupabaseInstructions();
    validateLocalConfiguration();
    displayTestingInstructions();
    displayDeploymentChecklist();
    displayTroubleshootingTips();
    generateEnvTemplate();
    
    log('🚀 NEXT STEPS', 'bright');
    log('');
    log('1. Configure environment variables in Netlify dashboard', 'green');
    log('2. Deploy your site', 'green');
    log('3. Test the deployment using the instructions above', 'green');
    log('4. Run: node test-supabase-production.js (after deployment)', 'green');
    log('');
    log('Need help? Check the troubleshooting section above or run with --help', 'blue');
    log('');
}

// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}