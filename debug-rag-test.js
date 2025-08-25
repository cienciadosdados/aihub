#!/usr/bin/env node

/**
 * Script de diagnóstico para testar o pipeline RAG
 * Execute: node debug-rag-test.js
 */

const API_BASE = 'http://127.0.0.1:8787/api';

async function testRAGPipeline() {
  console.log('🔍 Testando Pipeline RAG...\n');

  // 1. Testar autenticação
  console.log('1️⃣ Testando autenticação...');
  const loginResponse = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@example.com',
      password: 'test123'
    })
  });

  if (!loginResponse.ok) {
    console.log('❌ Login falhou. Criando usuário de teste...');
    
    const signupResponse = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
        password: 'test123'
      })
    });

    if (!signupResponse.ok) {
      console.error('❌ Falha ao criar usuário:', await signupResponse.text());
      return;
    }
    console.log('✅ Usuário criado com sucesso');
  } else {
    console.log('✅ Login bem-sucedido');
  }

  const userData = await (loginResponse.ok ? loginResponse : signupResponse).json();
  const authToken = btoa(JSON.stringify(userData.user));

  // 2. Criar workspace de teste
  console.log('\n2️⃣ Criando workspace de teste...');
  const workspaceResponse = await fetch(`${API_BASE}/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'RAG Test Workspace',
      description: 'Workspace para testar RAG'
    })
  });

  if (!workspaceResponse.ok) {
    console.error('❌ Falha ao criar workspace:', await workspaceResponse.text());
    return;
  }

  const workspace = await workspaceResponse.json();
  console.log('✅ Workspace criado:', workspace.name);

  // 3. Criar agente de teste
  console.log('\n3️⃣ Criando agente de teste...');
  const agentResponse = await fetch(`${API_BASE}/workspaces/${workspace.id}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      workspace_id: workspace.id,
      name: 'RAG Test Agent',
      description: 'Agente para testar RAG',
      system_prompt: 'Você é um assistente que usa conhecimento fornecido para responder perguntas.',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1000,
      enable_rag: true,
      max_chunks_per_query: 3,
      similarity_threshold: 0.7
    })
  });

  if (!agentResponse.ok) {
    console.error('❌ Falha ao criar agente:', await agentResponse.text());
    return;
  }

  const agent = await agentResponse.json();
  console.log('✅ Agente criado:', agent.name);

  // 4. Configurar RAG settings
  console.log('\n4️⃣ Configurando RAG settings...');
  const ragSettingsResponse = await fetch(`${API_BASE}/agents/${agent.id}/knowledge-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      enable_rag: true,
      max_chunks_per_query: 3,
      similarity_threshold: 0.7,
      chunk_size: 1000,
      chunk_overlap: 200,
      chunking_strategy: 'semantic',
      search_strategy: 'hybrid',
      enable_contextual_search: true,
      context_window: 2
    })
  });

  if (!ragSettingsResponse.ok) {
    console.error('❌ Falha ao configurar RAG:', await ragSettingsResponse.text());
    return;
  }
  console.log('✅ RAG configurado');

  // 5. Adicionar conhecimento de teste
  console.log('\n5️⃣ Adicionando conhecimento de teste...');
  const knowledgeResponse = await fetch(`${API_BASE}/agents/${agent.id}/knowledge-sources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      name: 'Conhecimento de Teste',
      type: 'text',
      content: `
        A empresa XYZ foi fundada em 2020 e se especializa em desenvolvimento de software.
        Nossa missão é criar soluções inovadoras para empresas de todos os tamanhos.
        Oferecemos serviços de desenvolvimento web, mobile e consultoria em tecnologia.
        Nossa equipe é composta por 50 desenvolvedores experientes.
        Estamos localizados em São Paulo, Brasil.
        Nossos principais clientes incluem bancos, startups e empresas de e-commerce.
      `
    })
  });

  if (!knowledgeResponse.ok) {
    console.error('❌ Falha ao adicionar conhecimento:', await knowledgeResponse.text());
    return;
  }

  const knowledge = await knowledgeResponse.json();
  console.log('✅ Conhecimento adicionado:', knowledge.name);

  // 6. Aguardar processamento
  console.log('\n6️⃣ Aguardando processamento...');
  let processed = false;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutos

  while (!processed && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 segundos
    attempts++;

    const statusResponse = await fetch(`${API_BASE}/knowledge-sources/${knowledge.id}/status`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log(`⏳ Status: ${status.status} - ${status.progress?.percentage || 0}% - ${status.progress?.message || ''}`);
      
      if (status.status === 'completed') {
        processed = true;
        console.log('✅ Processamento concluído!');
      } else if (status.status === 'failed') {
        console.error('❌ Processamento falhou:', status.progress?.message);
        return;
      }
    }
  }

  if (!processed) {
    console.error('❌ Timeout no processamento');
    return;
  }

  // 7. Testar chat com RAG
  console.log('\n7️⃣ Testando chat com RAG...');
  const chatResponse = await fetch(`${API_BASE}/agents/${agent.id}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      message: 'Onde a empresa XYZ está localizada?'
    })
  });

  if (!chatResponse.ok) {
    console.error('❌ Falha no chat:', await chatResponse.text());
    return;
  }

  const chatResult = await chatResponse.json();
  console.log('✅ Resposta do agente:', chatResult.output);
  console.log(`📊 Tokens usados: ${chatResult.tokens_used}`);
  console.log(`⏱️ Tempo de execução: ${chatResult.execution_time_ms}ms`);

  console.log('\n🎉 Teste RAG concluído com sucesso!');
}

// Executar teste
testRAGPipeline().catch(console.error);
