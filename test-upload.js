const API_BASE = 'http://127.0.0.1:8787/api';

async function testTextUpload() {
  try {
    console.log('🔍 Testando upload de texto...');
    
    // 1. Login (usuário já existe)
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });
    
    const userData = await loginResponse.json();
    console.log('✅ Login realizado:', userData.user?.email);
    
    if (!userData.user || !userData.user.id) {
      throw new Error('Falha na autenticação: ' + JSON.stringify(userData));
    }
    
    const authToken = btoa(JSON.stringify(userData.user));

    // 2. Criar workspace
    const workspaceResponse = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Test Workspace',
        description: 'Workspace para teste'
      })
    });
    const workspace = await workspaceResponse.json();

    // 3. Criar agente
    const agentResponse = await fetch(`${API_BASE}/workspaces/${workspace.id}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        workspace_id: workspace.id,
        name: 'Test Agent',
        description: 'Agente para teste',
        system_prompt: 'Você é um assistente.',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1000,
        enable_rag: true
      })
    });
    const agent = await agentResponse.json();

    // 4. Upload de texto simples
    console.log('📝 Fazendo upload de texto...');
    const uploadResponse = await fetch(`${API_BASE}/agents/${agent.id}/knowledge-sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Texto de Teste',
        type: 'text',
        content: 'Este é um texto de teste para verificar se o sistema RAG está funcionando corretamente. O sistema deve processar este texto e criar embeddings no Pinecone.'
      })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Erro no upload:', errorText);
      return;
    }

    const knowledge = await uploadResponse.json();
    console.log('✅ Upload iniciado:', knowledge.name);

    // 5. Monitorar status
    console.log('⏳ Monitorando processamento...');
    for (let i = 0; i < 30; i++) {
      const statusResponse = await fetch(`${API_BASE}/knowledge-sources/${knowledge.id}/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      const status = await statusResponse.json();
      console.log(`Status: ${status.status} - ${status.progress_percentage}% - ${status.progress_message}`);
      
      if (status.status === 'completed' || status.status === 'failed') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testTextUpload();
