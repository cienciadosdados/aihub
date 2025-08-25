#!/usr/bin/env node

/**
 * Database Reset Script
 * DANGER: This will delete ALL data in the database
 */

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const DATABASE_NAME = 'ai-agent-hub-db';

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

const TABLES_TO_DROP = [
  'agent_knowledge_settings',
  'document_chunks', 
  'knowledge_sources',
  'agent_executions',
  'agents',
  'workspace_members',
  'workspaces'
];

async function main() {
  log('💥 AI Agent Hub - Database Reset Tool', 'red');
  log('====================================\n', 'red');
  
  log('🚨 DANGER: This will permanently delete ALL data in your database!', 'red');
  log('🚨 This action cannot be undone!', 'red');
  log('🚨 All workspaces, agents, knowledge sources, and executions will be lost!\n', 'red');
  
  // First confirmation
  const confirm1 = await askQuestion('Type "DELETE ALL DATA" to confirm you understand the risks: ');
  
  if (confirm1 !== 'DELETE ALL DATA') {
    log('\n✅ Database reset cancelled. No data was deleted.', 'green');
    process.exit(0);
  }
  
  // Second confirmation
  log('\n⚠️  Last chance to cancel!', 'yellow');
  const confirm2 = await askQuestion('Type "YES" to proceed with database reset: ');
  
  if (confirm2.toUpperCase() !== 'YES') {
    log('\n✅ Database reset cancelled. No data was deleted.', 'green');
    process.exit(0);
  }
  
  log('\n💥 Proceeding with database reset...', 'red');
  
  // Show current table status
  log('\n📊 Current database status:', 'blue');
  const statusResult = executeCommand(
    `npx wrangler d1 execute ${DATABASE_NAME} --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`,
    'Checking current tables'
  );
  
  if (statusResult.success) {
    log('Current tables:', 'cyan');
    const tables = statusResult.output.split('\n').filter(line => line.trim());
    tables.forEach(table => {
      if (table.trim()) log(`  📄 ${table.trim()}`, 'cyan');
    });
  }
  
  // Drop all tables
  log('\n🗑️  Dropping all tables...', 'red');
  
  let droppedCount = 0;
  
  for (const table of TABLES_TO_DROP) {
    const result = executeCommand(
      `npx wrangler d1 execute ${DATABASE_NAME} --command="DROP TABLE IF EXISTS ${table};"`,
      `Dropping table ${table}`
    );
    
    if (result.success) {
      droppedCount++;
      log(`  ✅ Dropped ${table}`, 'green');
    } else {
      log(`  ⚠️  Failed to drop ${table} (may not exist)`, 'yellow');
    }
  }
  
  // Drop all indexes
  log('\n🗑️  Dropping all indexes...', 'red');
  const indexResult = executeCommand(
    `npx wrangler d1 execute ${DATABASE_NAME} --command="SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"`,
    'Finding custom indexes'
  );
  
  if (indexResult.success) {
    const indexes = indexResult.output.split('\n').filter(line => line.trim().startsWith('idx_'));
    
    for (const index of indexes) {
      const indexName = index.trim();
      if (indexName) {
        executeCommand(
          `npx wrangler d1 execute ${DATABASE_NAME} --command="DROP INDEX IF EXISTS ${indexName};"`,
          `Dropping index ${indexName}`
        );
      }
    }
  }
  
  // Verify reset
  log('\n🔍 Verifying reset...', 'blue');
  const verifyResult = executeCommand(
    `npx wrangler d1 execute ${DATABASE_NAME} --command="SELECT name FROM sqlite_master WHERE type='table';"`,
    'Checking remaining tables'
  );
  
  if (verifyResult.success) {
    const remainingTables = verifyResult.output.split('\n').filter(line => 
      line.trim() && !line.includes('sqlite_') && line.trim() !== 'name'
    );
    
    if (remainingTables.length === 0) {
      log('\n🎉 Database reset completed successfully!', 'green');
      log('✅ All application tables and data have been removed', 'green');
    } else {
      log('\n⚠️  Some tables may still exist:', 'yellow');
      remainingTables.forEach(table => log(`  📄 ${table.trim()}`, 'yellow'));
    }
  }
  
  log('\n📋 Next steps:', 'blue');
  log('  1. Run migrations to recreate schema: npm run migrate', 'cyan');
  log('  2. Reconfigure your secrets if needed: npm run setup-secrets', 'cyan');
  log('  3. Start fresh development: npm run dev', 'cyan');
  
  log('\n💡 The database structure is now completely clean.', 'green');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('AI Agent Hub - Database Reset Tool', 'magenta');
  log('\n⚠️  WARNING: This tool permanently deletes ALL database data!', 'red');
  log('\nUsage:', 'blue');
  log('  node scripts/db-reset.js              Interactive reset', 'cyan');
  log('  node scripts/db-reset.js --force      Skip confirmations (DANGEROUS)', 'cyan');
  log('  node scripts/db-reset.js --help       Show this help', 'cyan');
  log('\nOptions:', 'blue');
  log('  --force             Skip confirmation prompts (DANGEROUS)', 'cyan');
  log('  --help, -h          Show help', 'cyan');
  process.exit(0);
}

if (args.includes('--force')) {
  log('💥 FORCE MODE: Skipping confirmations', 'red');
  // TODO: Implement force mode for automated scripts
  log('❌ Force mode not implemented for safety. Use interactive mode.', 'red');
  process.exit(1);
}

main().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
