#!/usr/bin/env node

/**
 * Setup Secrets Script
 * Interactive script to configure all required environment secrets
 */

import { execSync } from 'child_process';
import { createInterface } from 'readline';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
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

function createReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function askQuestion(question) {
  const rl = createReadline();
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function executeCommand(command, description) {
  try {
    log(`📋 ${description}...`, 'blue');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} completed`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return { success: false, error };
  }
}

function setSecret(name, value) {
  if (!value) {
    log(`⚠️  Skipping empty value for ${name}`, 'yellow');
    return false;
  }
  
  const command = `echo "${value}" | npx wrangler secret put ${name}`;
  const result = executeCommand(command, `Setting secret ${name}`);
  
  if (result.success) {
    log(`🔒 Secret ${name} configured successfully`, 'green');
    return true;
  } else {
    log(`❌ Failed to set secret ${name}`, 'red');
    return false;
  }
}

async function main() {
  log('🔐 AI Agent Hub - Secrets Setup Tool', 'magenta');
  log('===================================\n', 'magenta');
  
  log('This tool will help you configure all required environment secrets.', 'blue');
  log('You can skip any secret by pressing Enter (leave empty).\n', 'cyan');
  
  const secrets = [
    {
      name: 'OPENAI_API_KEY',
      description: 'OpenAI API Key (get from platform.openai.com)',
      placeholder: 'sk-...',
      required: true
    },
    {
      name: 'PINECONE_API_KEY', 
      description: 'Pinecone API Key (get from pinecone.io)',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      required: true
    },
    {
      name: 'PINECONE_ENVIRONMENT',
      description: 'Pinecone Environment (e.g., us-east-1-aws)',
      placeholder: 'us-east-1-aws',
      required: true
    },
    {
      name: 'PINECONE_INDEX_NAME',
      description: 'Pinecone Index Name (your vector index name)',
      placeholder: 'mocha-rag',
      required: true
    },
    {
      name: 'MOCHA_USERS_SERVICE_API_URL',
      description: 'Mocha Users Service API URL (provided by platform)',
      placeholder: 'https://users.mocha.ai',
      required: false
    },
    {
      name: 'MOCHA_USERS_SERVICE_API_KEY',
      description: 'Mocha Users Service API Key (provided by platform)', 
      placeholder: 'mocha_...',
      required: false
    }
  ];
  
  // Check existing secrets
  log('🔍 Checking existing secrets...', 'blue');
  const listResult = executeCommand('npx wrangler secret list', 'Listing current secrets');
  
  const existingSecrets = new Set();
  if (listResult.success) {
    const lines = listResult.output.split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*(\w+)/);
      if (match) {
        existingSecrets.add(match[1]);
      }
    });
  }
  
  log(`Found ${existingSecrets.size} existing secrets\n`, 'cyan');
  
  let configuredCount = 0;
  let skippedCount = 0;
  
  for (const secret of secrets) {
    const exists = existingSecrets.has(secret.name);
    const status = exists ? '✅ EXISTS' : '❌ MISSING';
    const statusColor = exists ? 'green' : 'red';
    
    log(`\n🔑 ${secret.name} ${status}`, statusColor);
    log(`   ${secret.description}`, 'cyan');
    
    if (exists) {
      const overwrite = await askQuestion(`   Already exists. Overwrite? (y/N): `);
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        log(`   ⏭️  Keeping existing value`, 'yellow');
        skippedCount++;
        continue;
      }
    }
    
    if (secret.required) {
      log(`   ⚠️  This secret is REQUIRED for the app to work`, 'yellow');
    }
    
    const value = await askQuestion(`   Enter value (${secret.placeholder}): `);
    
    if (!value) {
      if (secret.required) {
        log(`   ❌ This secret is required. Please provide a value.`, 'red');
        const retry = await askQuestion(`   Try again? (Y/n): `);
        if (retry.toLowerCase() !== 'n' && retry.toLowerCase() !== 'no') {
          const retryValue = await askQuestion(`   Enter value (${secret.placeholder}): `);
          if (retryValue) {
            if (setSecret(secret.name, retryValue)) {
              configuredCount++;
            }
          } else {
            log(`   ⏭️  Skipping ${secret.name}`, 'yellow');
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } else {
        log(`   ⏭️  Skipping optional secret`, 'yellow');
        skippedCount++;
      }
    } else {
      if (setSecret(secret.name, value)) {
        configuredCount++;
      }
    }
  }
  
  // Summary
  log('\n📊 Setup Summary:', 'magenta');
  log(`   ✅ Configured: ${configuredCount} secrets`, 'green');
  log(`   ⏭️  Skipped: ${skippedCount} secrets`, 'yellow');
  
  const totalRequired = secrets.filter(s => s.required).length;
  if (configuredCount >= totalRequired) {
    log('\n🎉 All required secrets configured!', 'green');
    log('\n📋 Next steps:', 'blue');
    log('   1. Run migrations: npm run migrate', 'cyan');
    log('   2. Start development: npm run dev', 'cyan');
    log('   3. Deploy to production: npm run deploy', 'cyan');
  } else {
    log('\n⚠️  Some required secrets are missing.', 'yellow');
    log('   The app may not work properly until all required secrets are set.', 'yellow');
    log('   Run this script again with: npm run setup-secrets', 'cyan');
  }
  
  log('\n🔒 All secrets are stored securely in Cloudflare Workers.', 'green');
}

main().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
