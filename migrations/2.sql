
-- Knowledge sources table to store different types of content
CREATE TABLE knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'url', 'pdf', 'doc', 'pptx', 'youtube', 'text'
  source_url TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  metadata TEXT, -- JSON metadata about the source
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document chunks table for RAG
CREATE TABLE document_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  knowledge_source_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- Vector embedding as blob
  chunk_index INTEGER NOT NULL,
  metadata TEXT, -- JSON metadata about the chunk
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent knowledge base settings
CREATE TABLE agent_knowledge_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id INTEGER NOT NULL UNIQUE,
  enable_rag BOOLEAN DEFAULT 0,
  max_chunks_per_query INTEGER DEFAULT 3,
  similarity_threshold REAL DEFAULT 0.7,
  chunk_size INTEGER DEFAULT 1000,
  chunk_overlap INTEGER DEFAULT 200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
