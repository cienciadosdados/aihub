#!/usr/bin/env node

/**
 * Database Migration Script
 * Executes all pending migrations in order
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const DATABASE_NAME = 'ai-agent-hub-db'; // Change this to match your D1 database name
const MIGRATIONS_DIR = join(__dirname, '../migrations');

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

function executeCommand(command, description) {
  try {
    log(`\n📋 ${description}...`, 'blue');
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} completed successfully`, 'green');
    
    if (output.trim()) {
      log(`Output: ${output.trim()}`, 'cyan');
    }
    
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} failed:`, 'red');
    log(`Error: ${error.message}`, 'red');
    
    if (error.stdout) {
      log(`stdout: ${error.stdout}`, 'yellow');
    }
    
    if (error.stderr) {
      log(`stderr: ${error.stderr}`, 'yellow');
    }
    
    return { success: false, error };
  }
}

function getMigrationFiles() {
  try {
    const files = readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    return files.map(file => ({
      name: file,
      path: join(MIGRATIONS_DIR, file),
      number: parseInt(file.split('_')[0]) || 0
    }));
  } catch (error) {
    log(`❌ Error reading migrations directory: ${error.message}`, 'red');
    return [];
  }
}

function checkPrerequisites() {
  log('🔍 Checking prerequisites...', 'blue');
  
  // Check if wrangler is available
  const wranglerCheck = executeCommand('npx wrangler --version', 'Checking Wrangler CLI');
  if (!wranglerCheck.success) {
    log('❌ Wrangler CLI not found. Please install with: npm install -g wrangler', 'red');
    return false;
  }
  
  // Check if database exists
  const dbCheck = executeCommand(`npx wrangler d1 list`, 'Checking D1 databases');
  if (!dbCheck.success) {
    log('❌ Unable to list D1 databases. Please check your Cloudflare authentication.', 'red');
    return false;
  }
  
  if (!dbCheck.output.includes(DATABASE_NAME)) {
    log(`❌ Database '${DATABASE_NAME}' not found.`, 'red');
    log(`Please create it with: npx wrangler d1 create ${DATABASE_NAME}`, 'yellow');
    return false;
  }
  
  log('✅ Prerequisites check passed', 'green');
  return true;
}

function executeMigration(migration) {
  const sqlContent = readFileSync(migration.path, 'utf8');
  
  // Split SQL content into individual statements
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  log(`\n📝 Executing migration: ${migration.name}`, 'magenta');
  log(`Found ${statements.length} SQL statements`, 'cyan');
  
  let successCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip empty statements
    if (statement.trim() === ';') continue;
    
    log(`  Executing statement ${i + 1}/${statements.length}...`, 'blue');
    
    const result = executeCommand(
      `npx wrangler d1 execute ${DATABASE_NAME} --command="${statement.replace(/"/g, '\\"')}"`,
      `Statement ${i + 1}`
    );
    
    if (result.success) {
      successCount++;
    } else {
      log(`❌ Migration ${migration.name} failed at statement ${i + 1}`, 'red');
      return false;
    }
  }
  
  log(`✅ Migration ${migration.name} completed successfully (${successCount}/${statements.length} statements)`, 'green');
  return true;
}

function verifyMigration() {
  log('\n🔍 Verifying migration results...', 'blue');
  
  const result = executeCommand(
    `npx wrangler d1 execute ${DATABASE_NAME} --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"`,
    'Listing tables'
  );
  
  if (result.success) {
    log('📊 Database tables created:', 'green');
    if (result.output.includes('workspaces')) log('  ✅ workspaces', 'green');
    if (result.output.includes('agents')) log('  ✅ agents', 'green');
    if (result.output.includes('knowledge_sources')) log('  ✅ knowledge_sources', 'green');
    if (result.output.includes('document_chunks')) log('  ✅ document_chunks', 'green');
    if (result.output.includes('agent_knowledge_settings')) log('  ✅ agent_knowledge_settings', 'green');
    
    // Check for indexes
    const indexResult = executeCommand(
      `npx wrangler d1 execute ${DATABASE_NAME} --command="SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"`,
      'Listing indexes'
    );
    
    if (indexResult.success) {
      const indexCount = (indexResult.output.match(/idx_/g) || []).length;
      log(`  ✅ ${indexCount} performance indexes created`, 'green');
    }
  }
  
  return result.success;
}

async function main() {
  log('🚀 AI Agent Hub - Database Migration Tool', 'magenta');
  log('========================================\n', 'magenta');
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  // Get migration files
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    log('❌ No migration files found in migrations directory', 'red');
    process.exit(1);
  }
  
  log(`\n📦 Found ${migrations.length} migration files:`, 'blue');
  migrations.forEach(migration => {
    log(`  📄 ${migration.name}`, 'cyan');
  });
  
  // Execute migrations
  log('\n🔄 Starting migration process...', 'blue');
  
  let successCount = 0;
  
  for (const migration of migrations) {
    if (executeMigration(migration)) {
      successCount++;
    } else {
      log(`\n❌ Migration failed at: ${migration.name}`, 'red');
      log('Migration process aborted.', 'red');
      process.exit(1);
    }
  }
  
  // Verify results
  if (verifyMigration()) {
    log('\n🎉 All migrations completed successfully!', 'green');
    log(`✅ ${successCount}/${migrations.length} migrations executed`, 'green');
    log('\n📋 Next steps:', 'blue');
    log('  1. Configure your environment secrets with: npm run setup-secrets', 'cyan');
    log('  2. Start development server with: npm run dev', 'cyan');
    log('  3. Deploy to production with: npm run deploy', 'cyan');
  } else {
    log('\n⚠️  Migrations completed but verification failed', 'yellow');
    log('Please check your database manually.', 'yellow');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('AI Agent Hub - Database Migration Tool', 'magenta');
  log('\nUsage:', 'blue');
  log('  node scripts/migrate.js              Run all migrations', 'cyan');
  log('  node scripts/migrate.js --help       Show this help', 'cyan');
  log('  node scripts/migrate.js --verify     Only verify database', 'cyan');
  log('\nOptions:', 'blue');
  log('  --help, -h          Show help', 'cyan');
  log('  --verify            Only verify existing database', 'cyan');
  process.exit(0);
}

if (args.includes('--verify')) {
  log('🔍 Database Verification Only', 'magenta');
  if (checkPrerequisites() && verifyMigration()) {
    log('\n✅ Database verification successful', 'green');
  } else {
    log('\n❌ Database verification failed', 'red');
    process.exit(1);
  }
  process.exit(0);
}

// Run main migration process
main().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
