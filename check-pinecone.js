const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function checkPinecone() {
  try {
    console.log('🔍 Verificando Pinecone...');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    // Listar índices existentes
    const indexes = await pinecone.listIndexes();
    console.log('📋 Índices existentes:', indexes.indexes?.map(i => i.name) || []);

    const indexName = process.env.PINECONE_INDEX_NAME || 'mocha-rag';
    const indexExists = indexes.indexes?.some(i => i.name === indexName);

    if (!indexExists) {
      console.log(`❌ Índice '${indexName}' não existe. Criando...`);
      
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536, // text-embedding-3-small dimension
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log(`✅ Índice '${indexName}' criado com sucesso!`);
      console.log('⏳ Aguardando inicialização (pode levar alguns minutos)...');
    } else {
      console.log(`✅ Índice '${indexName}' já existe`);
      
      // Verificar status do índice
      const indexDescription = await pinecone.describeIndex(indexName);
      console.log('📊 Status do índice:', indexDescription.status?.ready ? 'Pronto' : 'Inicializando');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar Pinecone:', error.message);
  }
}

checkPinecone();
