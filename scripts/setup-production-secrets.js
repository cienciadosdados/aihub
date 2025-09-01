#!/usr/bin/env node

/**
 * Script para configurar automaticamente os secrets de produção no Cloudflare
 * Lê do arquivo .env e aplica via wrangler secret put
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function executeCommand(command, description, hideOutput = false) {
  try {
    log(`🔧 ${description}...`, 'blue');
    
    if (hideOutput) {
      execSync(command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: projectRoot 
      });
    } else {
      const output = execSync(command, { 
        encoding: 'utf8', 
        stdio: 'pipe',
        cwd: projectRoot 
      });
      if (output.trim()) {
        log(output.trim(), 'cyan');
      }
    }
    
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

function parseEnvFile(filePath) {
  const envVars = {};
  
  if (!existsSync(filePath)) {
    log(`❌ Arquivo .env não encontrado em: ${filePath}`, 'red');
    return envVars;
  }
  
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        envVars[key] = value;
      }
    }
  });
  
  return envVars;
}

async function main() {
  log('🚀 AI Agent Hub - Configuração de Secrets de Produção', 'cyan');
  log('================================================\n', 'cyan');
  
  // Ler arquivo .env
  const envPath = join(projectRoot, '.env');
  const envVars = parseEnvFile(envPath);
  
  if (Object.keys(envVars).length === 0) {
    log('❌ Nenhuma variável encontrada no .env', 'red');
    process.exit(1);
  }
  
  log(`✅ Arquivo .env carregado com ${Object.keys(envVars).length} variáveis`, 'green');
  
  // Definir quais secrets configurar
  const secretsToSet = [
    {
      key: 'OPENAI_API_KEY',
      description: 'OpenAI API Key (Obrigatória)',
      required: true
    },
    {
      key: 'PINECONE_API_KEY', 
      description: 'Pinecone API Key (Obrigatória para RAG)',
      required: true
    },
    {
      key: 'PINECONE_INDEX_NAME',
      description: 'Nome do Índice Pinecone',
      required: true
    },
    {
      key: 'PINECONE_ENVIRONMENT',
      description: 'Ambiente Pinecone',
      required: false
    },
    {
      key: 'R2_ENDPOINT',
      description: 'Cloudflare R2 Endpoint',
      required: false
    },
    {
      key: 'R2_ACCESS_KEY',
      description: 'Cloudflare R2 Access Key',
      required: false
    },
    {
      key: 'R2_SECRET_KEY',
      description: 'Cloudflare R2 Secret Key',
      required: false
    },
    {
      key: 'R2_BUCKET_NAME',
      description: 'R2 Bucket Name',
      required: false
    },
    {
      key: 'R2_PUBLIC_URL',
      description: 'R2 Public URL',
      required: false
    },
    {
      key: 'R2_PORT',
      description: 'R2 Port',
      required: false
    },
    {
      key: 'R2_USE_SSL',
      description: 'R2 Use SSL',
      required: false
    }
  ];
  
  log('\n📋 Configurando secrets...', 'blue');
  
  let successCount = 0;
  let requiredMissing = [];
  
  for (const secret of secretsToSet) {
    const value = envVars[secret.key];
    
    if (!value) {
      if (secret.required) {
        log(`❌ ${secret.key} não encontrado no .env (OBRIGATÓRIO)`, 'red');
        requiredMissing.push(secret.key);
      } else {
        log(`⚠️  ${secret.key} não encontrado no .env (opcional)`, 'yellow');
      }
      continue;
    }
    
    // Mascarar valores sensíveis no log
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) : 
      '***';
    
    log(`🔐 Configurando ${secret.key}: ${maskedValue}`, 'cyan');
    
    // Configurar secret usando wrangler
    const command = `echo "${value}" | npx wrangler secret put ${secret.key}`;
    
    if (executeCommand(command, `Configurando ${secret.key}`, true)) {
      successCount++;
    }
  }
  
  // Verificar se secrets obrigatórios foram configurados
  if (requiredMissing.length > 0) {
    log('\n❌ ERRO: Secrets obrigatórios não encontrados:', 'red');
    requiredMissing.forEach(key => log(`  - ${key}`, 'red'));
    log('\nAdicione essas variáveis ao seu arquivo .env e execute novamente.', 'yellow');
    process.exit(1);
  }
  
  log(`\n🎉 Configuração concluída!`, 'green');
  log(`✅ ${successCount} secrets configurados com sucesso`, 'green');
  
  // Verificar secrets configurados
  log('\n🔍 Verificando secrets no Cloudflare...', 'blue');
  executeCommand('npx wrangler secret list', 'Listando secrets configurados');
  
  log('\n📋 Próximos passos:', 'blue');
  log('  1. Execute: npm run deploy', 'cyan');
  log('  2. Teste a aplicação em produção', 'cyan');
  log('  3. Configure seu primeiro agente', 'cyan');
  
  log('\n🚀 Secrets configurados! Sua aplicação está pronta para produção!', 'green');
}

main().catch(error => {
  log(`\n💥 Erro inesperado: ${error.message}`, 'red');
  process.exit(1);
});