import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { Analytics } from './analytics';
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import OpenAI from "openai";
import { PineconeRAGProcessor } from "./pinecone-rag";
// MinIO removed - using simplified processing
import {
  CreateWorkspaceSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  ExecuteAgentSchema,
  UpdateKnowledgeSettingsSchema,
} from "../shared/types";
// PDF processing disabled for Cloudflare Workers compatibility
// Will implement alternative PDF processing solution

// Queue message types
interface QueueMessage {
  type: 'rag_processing';
  sourceId: number;
  agentId: number;
  data: any;
  tenantId?: string;
  priority?: number;
  retryCount?: number;
}

// Simplified Cloudflare types for queue
interface Queue<T = any> {
  send(message: T): Promise<void>;
  sendBatch(messages: T[]): Promise<void>;
}

interface Env {
  DB: any; // D1Database
  R2: any; // R2Bucket
  KV: any; // KVNamespace
  OPENAI_API_KEY: string;
  PINECONE_API_KEY: string;
  PINECONE_INDEX_NAME: string;
  PINECONE_HOST: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  RAG_QUEUE: Queue<QueueMessage>;
}

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Custom Auth Middleware for local development
const customAuthMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (token && token !== 'undefined') {
      try {
        // For local development, decode the simple token (email:password format)
        const userData = JSON.parse(atob(token));
        if (userData && userData.id) {
          c.set("user", userData);
          return next();
        }
      } catch (error) {
        console.error("Custom auth error:", error);
      }
    }
  }
  
  // Fallback to checking localStorage-style data from frontend
  // This is a simple approach for development
  const userDataHeader = c.req.header("X-User-Data");
  if (userDataHeader) {
    try {
      const userData = JSON.parse(userDataHeader);
      c.set("user", userData);
      return next();
    } catch (error) {
      console.error("User data header parse error:", error);
    }
  }
  
  return c.json({ error: "Unauthorized" }, 401);
};

// Use custom auth for development
const authMiddleware = customAuthMiddleware;


// Helper function for password hashing (simple for demo)
const hashPassword = (password: string): string => {
  // In production, use proper bcrypt or scrypt
  return btoa(password + 'salt123');
};

const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

// Auth endpoints
app.post('/api/auth/signup', async (c) => {
  const { name, email, password } = await c.req.json();
  
  if (!name || !email || !password) {
    return c.json({ error: 'Nome, email e senha são obrigatórios' }, 400);
  }
  
  if (password.length < 6) {
    return c.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, 400);
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Email inválido' }, 400);
  }
  
  try {
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email.toLowerCase()).first();
    
    if (existingUser) {
      return c.json({ 
        error: 'Email já está em uso. Tente fazer login ou use outro email.' 
      }, 400);
    }
    
    // Create new user with generated ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = hashPassword(password);
    
    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash)
      VALUES (?, ?, ?, ?)
    `).bind(userId, email.toLowerCase(), name, passwordHash).run();
    
    // Return user data (without password)
    const user = {
      id: userId,
      email: email.toLowerCase(),
      name
    };
    
    console.log('User created successfully:', user.email);
    return c.json({ user }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Erro interno. Tente novamente.' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: 'Email e senha são obrigatórios' }, 400);
  }
  
  try {
    // Find user (case insensitive)
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, password_hash FROM users WHERE email = ?
    `).bind(email.toLowerCase()).first();
    
    if (!user) {
      return c.json({ 
        error: 'Email não encontrado. Verifique o email ou crie uma conta.' 
      }, 401);
    }
    
    if (!verifyPassword(password, user.password_hash as string)) {
      return c.json({ error: 'Senha incorreta. Tente novamente.' }, 401);
    }
    
    // Update last login
    await c.env.DB.prepare(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `).bind(user.id).run();
    
    // Return user data (without password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    console.log('User logged in successfully:', user.email);
    return c.json({ user: userData });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Erro interno. Tente novamente.' }, 500);
  }
});

app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Workspace endpoints
app.get("/api/workspaces", authMiddleware, async (c) => {
  const user = c.get("user")!;
  
  const { results } = await c.env.DB.prepare(`
    SELECT w.* FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE w.owner_user_id = ? OR wm.user_id = ?
    ORDER BY w.created_at DESC
  `).bind(user.id, user.id).all();

  return c.json(results);
});

app.post("/api/workspaces", authMiddleware, zValidator("json", CreateWorkspaceSchema), async (c) => {
  const user = c.get("user")!;
  const data = c.req.valid("json");

  const { meta } = await c.env.DB.prepare(`
    INSERT INTO workspaces (name, description, owner_user_id)
    VALUES (?, ?, ?)
  `).bind(data.name, data.description || null, user.id).run();

  const workspace = await c.env.DB.prepare(`
    SELECT * FROM workspaces WHERE id = ?
  `).bind(meta.last_row_id).first();

  return c.json(workspace, 201);
});

// Agent endpoints
app.get("/api/workspaces/:workspaceId/agents", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const workspaceId = c.req.param("workspaceId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE w.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(workspaceId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM agents WHERE workspace_id = ? ORDER BY created_at DESC
  `).bind(workspaceId).all();

  return c.json(results);
});

app.post("/api/workspaces/:workspaceId/agents", authMiddleware, zValidator("json", CreateAgentSchema), async (c) => {
  const user = c.get("user")!;
  const workspaceId = c.req.param("workspaceId");
  const data = c.req.valid("json");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE w.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(workspaceId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { meta } = await c.env.DB.prepare(`
    INSERT INTO agents (workspace_id, name, description, system_prompt, model, temperature, max_tokens, enable_rag, max_chunks_per_query, similarity_threshold, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    workspaceId,
    data.name,
    data.description || null,
    data.system_prompt || null,
    data.model,
    data.temperature,
    data.max_tokens,
    data.enable_rag ? 1 : 0,
    data.max_chunks_per_query,
    data.similarity_threshold,
    user.id
  ).run();

  const agent = await c.env.DB.prepare(`
    SELECT * FROM agents WHERE id = ?
  `).bind(meta.last_row_id).first();

  return c.json(agent, 201);
});

app.put("/api/agents/:agentId", authMiddleware, zValidator("json", UpdateAgentSchema), async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");
  const data = c.req.valid("json");

  // Check access
  const agent = await c.env.DB.prepare(`
    SELECT a.*, w.owner_user_id FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!agent) {
    return c.json({ error: "Agent not found or access denied" }, 404);
  }

  const updates = [];
  const values = [];
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  if (updates.length === 0) {
    return c.json(agent);
  }

  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(agentId);

  await c.env.DB.prepare(`
    UPDATE agents SET ${updates.join(", ")} WHERE id = ?
  `).bind(...values).run();

  const updatedAgent = await c.env.DB.prepare(`
    SELECT * FROM agents WHERE id = ?
  `).bind(agentId).first();

  return c.json(updatedAgent);
});

app.delete("/api/agents/:agentId", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const agent = await c.env.DB.prepare(`
    SELECT a.*, w.owner_user_id FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!agent) {
    return c.json({ error: "Agent not found or access denied" }, 404);
  }

  await c.env.DB.prepare(`DELETE FROM agents WHERE id = ?`).bind(agentId).run();
  return c.json({ success: true });
});

// Helper function to check if model supports custom temperature
const supportsCustomTemperature = (model: string): boolean => {
  const restrictedModels = ['o1', 'o1-preview', 'o1-mini', 'o3', 'o3-mini'];
  return !restrictedModels.some(restrictedModel => model.includes(restrictedModel));
};

// Agent execution endpoint
app.post("/api/agents/:agentId/execute", authMiddleware, zValidator("json", ExecuteAgentSchema), async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");
  const { message } = c.req.valid("json");

  // Check access and get agent
  const agent = await c.env.DB.prepare(`
    SELECT a.*, w.owner_user_id FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND a.is_active = 1 AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!agent) {
    return c.json({ error: "Agent not found or access denied" }, 404);
  }

  // Create execution record
  const { meta } = await c.env.DB.prepare(`
    INSERT INTO agent_executions (agent_id, user_id, input_message, status)
    VALUES (?, ?, ?, 'running')
  `).bind(agentId, user.id, message).run();

  const executionId = meta.last_row_id;
  const startTime = Date.now();

  try {
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    // Check if RAG is enabled
    const knowledgeSettings = await c.env.DB.prepare(`
      SELECT * FROM agent_knowledge_settings WHERE agent_id = ? AND enable_rag = 1
    `).bind(agentId).first();

    let contextMessage = message;

    // If RAG is enabled, enhance the message with relevant knowledge
    if (knowledgeSettings) {
      try {
        const processor = new PineconeRAGProcessor(
          c.env.OPENAI_API_KEY,
          c.env.PINECONE_API_KEY,
          c.env.PINECONE_INDEX_NAME
        );
        
        // Find relevant chunks using enhanced search
        const relevantChunks = await processor.findRelevantChunks(
          message,
          parseInt(agentId),
          knowledgeSettings.max_chunks_per_query as number,
          knowledgeSettings.similarity_threshold as number,
          knowledgeSettings.search_strategy as any || 'hybrid',
          knowledgeSettings.enable_contextual_search as boolean
        );

        // If we found relevant chunks, enhance the context
        if (relevantChunks.length > 0) {
          const contextParts = relevantChunks.map((chunk, index) => 
            `[Source ${index + 1}${chunk.metadata?.source_name ? ` - ${chunk.metadata.source_name}` : ''}]\n${chunk.content}`
          );
          const context = contextParts.join('\n\n');
          contextMessage = `Context information:\n${context}\n\nUser question: ${message}`;
        }
      } catch (ragError) {
        console.error("RAG processing error:", ragError);
        // Continue without RAG if there's an error
      }
    }

    // Prepare messages
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (agent.system_prompt) {
      messages.push({ role: "system", content: agent.system_prompt as string });
    }
    messages.push({ role: "user", content: contextMessage });

    // Prepare completion parameters
    const completionParams: any = {
      model: agent.model as any,
      messages: messages as any,
      max_completion_tokens: agent.max_tokens as number,
    };

    // Only add temperature if the model supports it
    if (supportsCustomTemperature(agent.model as string)) {
      completionParams.temperature = agent.temperature as number;
    }

    // Execute with OpenAI
    const completion = await openai.chat.completions.create(completionParams);

    const response = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const executionTime = Date.now() - startTime;

    // Update execution record
    await c.env.DB.prepare(`
      UPDATE agent_executions 
      SET output_message = ?, status = 'completed', tokens_used = ?, execution_time_ms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(response, tokensUsed, executionTime, executionId).run();

    return c.json({
      id: executionId,
      output: response,
      tokens_used: tokensUsed,
      execution_time_ms: executionTime,
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await c.env.DB.prepare(`
      UPDATE agent_executions 
      SET status = 'failed', error_message = ?, execution_time_ms = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(errorMessage, executionTime, executionId).run();

    return c.json({ error: errorMessage }, 500);
  }
});

// Get agent executions
app.get("/api/agents/:agentId/executions", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM agent_executions 
    WHERE agent_id = ? 
    ORDER BY created_at DESC 
    LIMIT 50
  `).bind(agentId).all();

  return c.json(results);
});

// Knowledge source endpoints
app.get("/api/agents/:agentId/knowledge-sources", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  const { results } = await c.env.DB.prepare(`
    SELECT * FROM knowledge_sources WHERE agent_id = ? ORDER BY created_at DESC
  `).bind(agentId).all();

  return c.json(results);
});

// Get knowledge source processing status
app.get("/api/knowledge-sources/:sourceId/status", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const sourceId = c.req.param("sourceId");

  // Check access
  const source = await c.env.DB.prepare(`
    SELECT ks.*, w.owner_user_id FROM knowledge_sources ks
    JOIN agents a ON ks.agent_id = a.id
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE ks.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(sourceId, user.id, user.id).first();

  if (!source) {
    return c.json({ error: "Knowledge source not found or access denied" }, 404);
  }

  // Parse metadata if it exists
  let metadata = {};
  try {
    if (source.metadata) {
      metadata = JSON.parse(source.metadata as string);
    }
  } catch (e) {
    console.warn('Failed to parse metadata for source', sourceId, e);
  }

  return c.json({
    id: source.id,
    status: source.status,
    progress_percentage: source.progress_percentage || 0,
    progress_message: source.progress_message || '',
    processing_stage: source.processing_stage || 'pending',
    metadata: metadata,
    created_at: source.created_at,
    updated_at: source.updated_at
  });
});

// Test endpoint without any validation
app.post("/api/agents/:agentId/knowledge-sources-test", authMiddleware, async (c) => {
  console.log('TEST ENDPOINT CALLED');
  const agentId = c.req.param("agentId");
  const contentType = c.req.header('content-type') || '';
  
  let data: any;
  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    console.log('FormData keys:', Array.from(formData.keys()));
    data = {
      name: formData.get('name'),
      type: formData.get('type'),
      file: formData.get('file')
    };
  } else {
    data = await c.req.json();
  }
  
  console.log('Received data:', data);
  
  return c.json({ 
    success: true, 
    message: 'Test endpoint works',
    received: data,
    agentId,
    contentType 
  });
});

app.post("/api/agents/:agentId/knowledge-sources", authMiddleware, async (c) => {
  try {
    console.log('POST /api/agents/:agentId/knowledge-sources - Starting request processing');
    const user = c.get("user")!;
    const agentId = c.req.param("agentId");
    
    let data: any;
    const contentType = c.req.header('content-type') || '';
    console.log('Request content-type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      console.log('Processing multipart/form-data request');
      const formData = await c.req.formData();
      console.log('FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `File: ${v.name}` : v]));
      data = {
        agent_id: parseInt(agentId), // Ensure agent_id is included as number
        name: formData.get('name') as string,
        type: formData.get('type') as string,
        source_url: formData.get('source_url') as string || null,
        content: formData.get('content') as string || null,
        file: formData.get('file') as File || null
      };
    } else {
      // Handle JSON data
      console.log('Processing JSON request');
      const jsonData = await c.req.json();
      data = {
        agent_id: parseInt(agentId), // Ensure agent_id is included as number
        ...jsonData
      };
    }
  
  console.log('Processing knowledge source data:', { 
    name: data.name, 
    type: data.type, 
    hasFile: !!data.file,
    contentType: contentType
  });
  
  // Basic validation
  if (!data.name || !data.type) {
    return c.json({ 
      success: false, 
      error: { 
        message: 'Name and type are required',
        received: { name: data.name, type: data.type }
      } 
    }, 400);
  }
  
  // Validate supported types
  const supportedTypes = ['url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text'];
  if (!supportedTypes.includes(data.type)) {
    return c.json({
      success: false,
      error: {
        message: `Unsupported type: ${data.type}. Supported types: ${supportedTypes.join(', ')}`
      }
    }, 400);
  }

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Create knowledge source with initial progress tracking
  const { meta } = await c.env.DB.prepare(`
    INSERT INTO knowledge_sources (agent_id, name, type, source_url, status, progress_percentage, progress_message, processing_stage)
    VALUES (?, ?, ?, ?, 'pending', 0, 'Knowledge source created, queued for processing...', 'initializing')
  `).bind(agentId, data.name, data.type, data.source_url || null).run();

  // Process the source in the background with detailed error tracking
  const sourceId = meta.last_row_id;
  
  // AGENTSET SOLUTION: Process file content BEFORE queuing
  if (data.file && data.file instanceof File) {
    console.log(`📄 [PRE-PROCESS] Extracting content from ${data.file.name}`);
    // AGENTSET STYLE: Simple file processing
    if (data.file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await data.file.arrayBuffer();
      // Use unpdf which works in Cloudflare Workers
      const { extractText, getDocumentProxy } = await import('unpdf');
      
      const document = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const { text } = await extractText(document, { mergePages: true });
      const fullText = text;
      
      data.content = fullText.replace(/\s+/g, ' ').trim();
    } else {
      data.content = await data.file.text();
    }
    data.source_url = data.file.name;
    console.log(`✅ [PRE-PROCESS] Content extracted: ${data.content.length} chars`);
    // Remove file object (can't be serialized to KV)
    data.file = null;
  }
  
  // Update database with extracted content
  if (data.content) {
    await c.env.DB.prepare(`
      UPDATE knowledge_sources 
      SET content = ? 
      WHERE id = ?
    `).bind(data.content, sourceId).run();
    console.log(`💾 [DB] Content saved to database (${data.content.length} chars)`);
  }
  
  // Process in background using Cloudflare Queue - return immediately
  console.log(`🚀 [QUEUE] Queuing knowledge source ${sourceId} for background processing`);
  
  // Send to Cloudflare Queue for async processing
  await c.env.RAG_QUEUE.send({
    type: 'rag_processing',
    sourceId,
    agentId: parseInt(agentId),
    data,
    tenantId: user.id, // Track tenant for rate limiting
    priority: 1, // Default priority
    retryCount: 0
  });
  
  console.log(`✅ [QUEUE] Knowledge source ${sourceId} queued successfully`);

  const source = await c.env.DB.prepare(`
    SELECT * FROM knowledge_sources WHERE id = ?
  `).bind(sourceId).first();

  return c.json(source, 201);
  
  } catch (error) {
    console.error('Error processing knowledge source request:', error);
    return c.json({
      success: false,
      error: {
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, 500);
  }
});

app.delete("/api/knowledge-sources/:sourceId", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const sourceId = c.req.param("sourceId");

  // Check access
  const source = await c.env.DB.prepare(`
    SELECT ks.*, w.owner_user_id FROM knowledge_sources ks
    JOIN agents a ON ks.agent_id = a.id
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE ks.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(sourceId, user.id, user.id).first();

  if (!source) {
    return c.json({ error: "Knowledge source not found or access denied" }, 404);
  }

  // Delete from Pinecone first
  try {
    const processor = new PineconeRAGProcessor(
      c.env.OPENAI_API_KEY,
      c.env.PINECONE_API_KEY,
      c.env.PINECONE_INDEX_NAME
    );
    await processor.deleteKnowledgeSource(parseInt(sourceId), parseInt(sourceId));
  } catch (error) {
    console.error("Failed to delete from Pinecone:", error);
  }
  
  // Delete chunks from local DB
  await c.env.DB.prepare(`DELETE FROM document_chunks WHERE knowledge_source_id = ?`).bind(sourceId).run();
  
  // Delete source
  await c.env.DB.prepare(`DELETE FROM knowledge_sources WHERE id = ?`).bind(sourceId).run();

  return c.json({ success: true });
});

// Knowledge settings endpoints
app.get("/api/agents/:agentId/knowledge-settings", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  let settings = await c.env.DB.prepare(`
    SELECT * FROM agent_knowledge_settings WHERE agent_id = ?
  `).bind(agentId).first();

  // Create default settings if they don't exist
  if (!settings) {
    const { meta } = await c.env.DB.prepare(`
      INSERT INTO agent_knowledge_settings (
        agent_id, enable_rag, max_chunks_per_query, similarity_threshold, 
        chunk_size, chunk_overlap, chunking_strategy, search_strategy, 
        enable_contextual_search, context_window
      )
      VALUES (?, 0, 3, 0.7, 2000, 400, 'recursive', 'hybrid', 1, 2)
    `).bind(agentId).run();

    settings = await c.env.DB.prepare(`
      SELECT * FROM agent_knowledge_settings WHERE id = ?
    `).bind(meta.last_row_id).first();
  }

  return c.json(settings);
});

app.put("/api/agents/:agentId/knowledge-settings", authMiddleware, zValidator("json", UpdateKnowledgeSettingsSchema), async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");
  const data = c.req.valid("json");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  // Update or create settings
  await c.env.DB.prepare(`
    INSERT INTO agent_knowledge_settings (
      agent_id, enable_rag, max_chunks_per_query, similarity_threshold, 
      chunk_size, chunk_overlap, chunking_strategy, search_strategy, 
      enable_contextual_search, context_window
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(agent_id) DO UPDATE SET
      enable_rag = excluded.enable_rag,
      max_chunks_per_query = excluded.max_chunks_per_query,
      similarity_threshold = excluded.similarity_threshold,
      chunk_size = excluded.chunk_size,
      chunk_overlap = excluded.chunk_overlap,
      chunking_strategy = excluded.chunking_strategy,
      search_strategy = excluded.search_strategy,
      enable_contextual_search = excluded.enable_contextual_search,
      context_window = excluded.context_window,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    agentId,
    data.enable_rag,
    data.max_chunks_per_query,
    data.similarity_threshold,
    data.chunk_size,
    data.chunk_overlap,
    data.chunking_strategy,
    data.search_strategy,
    data.enable_contextual_search,
    data.context_window
  ).run();

  const settings = await c.env.DB.prepare(`
    SELECT * FROM agent_knowledge_settings WHERE agent_id = ?
  `).bind(agentId).first();

  return c.json(settings);
});

// Knowledge statistics endpoint
app.get("/api/agents/:agentId/knowledge-stats", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const processor = new PineconeRAGProcessor(
      c.env.OPENAI_API_KEY,
      c.env.PINECONE_API_KEY,
      c.env.PINECONE_INDEX_NAME
    );
    const stats = await processor.getKnowledgeStatistics(parseInt(agentId));
    return c.json(stats);
  } catch (error) {
    console.error("Failed to get knowledge statistics:", error);
    return c.json({ error: "Failed to retrieve statistics" }, 500);
  }
});

// Real-time knowledge source status endpoint
app.get("/api/knowledge-sources/:sourceId/status", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const sourceId = c.req.param("sourceId");

  try {
    // Check access and get detailed status
    const source = await c.env.DB.prepare(`
      SELECT 
        ks.id,
        ks.name,
        ks.type,
        ks.status,
        ks.progress_percentage,
        ks.progress_message,
        ks.processing_stage,
        ks.metadata,
        ks.created_at,
        ks.updated_at,
        a.id as agent_id,
        w.owner_user_id
      FROM knowledge_sources ks
      JOIN agents a ON ks.agent_id = a.id
      JOIN workspaces w ON a.workspace_id = w.id
      LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
      WHERE ks.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
    `).bind(sourceId, user.id, user.id).first();

    if (!source) {
      return c.json({ error: "Knowledge source not found or access denied" }, 404);
    }

    // Parse metadata if it exists
    let parsedMetadata = {};
    if (source.metadata) {
      try {
        parsedMetadata = JSON.parse(source.metadata as string);
      } catch (e) {
        console.warn('Failed to parse metadata for source', sourceId);
      }
    }

    // Calculate estimated time remaining based on progress
    let estimatedTimeRemaining = null;
    if (source.status === 'processing' && source.progress_percentage > 0) {
      const elapsed = new Date().getTime() - new Date(source.updated_at as string).getTime();
      const totalEstimated = (elapsed / (source.progress_percentage / 100));
      estimatedTimeRemaining = Math.max(0, totalEstimated - elapsed);
    }

    return c.json({
      id: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      progress: {
        percentage: source.progress_percentage || 0,
        message: source.progress_message || 'No progress information',
        stage: source.processing_stage || 'unknown',
        estimated_time_remaining_ms: estimatedTimeRemaining
      },
      metadata: parsedMetadata,
      timestamps: {
        created_at: source.created_at,
        updated_at: source.updated_at
      },
      agent_id: source.agent_id
    });

  } catch (error) {
    console.error("Failed to get knowledge source status:", error);
    return c.json({ error: "Failed to retrieve status" }, 500);
  }
});

// Manual queue processing endpoint - DISABLED (using Cloudflare Queues instead)
app.post("/api/process-queue", authMiddleware, async (c) => {
  return c.json({
    success: false,
    message: 'Manual queue processing is disabled. Use Cloudflare Queues for real-time processing.',
    error: 'Endpoint disabled'
  }, 410); // 410 Gone - resource is no longer available
});

// Bulk status endpoint for multiple sources
app.get("/api/agents/:agentId/knowledge-sources/status", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const agentId = c.req.param("agentId");

  // Check access
  const access = await c.env.DB.prepare(`
    SELECT 1 FROM agents a
{{ ... }}
    JOIN workspaces w ON a.workspace_id = w.id
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
    WHERE a.id = ? AND (w.owner_user_id = ? OR wm.user_id = ?)
  `).bind(agentId, user.id, user.id).first();

  if (!access) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT 
        id, name, type, status, progress_percentage, progress_message, 
        processing_stage, created_at, updated_at
      FROM knowledge_sources 
      WHERE agent_id = ? 
      ORDER BY created_at DESC
    `).bind(agentId).all();

    const statusSummary = results.map((source: any) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      status: source.status,
      progress_percentage: source.progress_percentage || 0,
      progress_message: source.progress_message || '',
      processing_stage: source.processing_stage || 'unknown',
      updated_at: source.updated_at
    }));

    // Calculate summary stats
    const totalSources = results.length;
    const completedSources = results.filter((s: any) => s.status === 'completed').length;
    const processingSources = results.filter((s: any) => s.status === 'processing').length;
    const failedSources = results.filter((s: any) => s.status === 'failed').length;

    return c.json({
      sources: statusSummary,
      summary: {
        total: totalSources,
        completed: completedSources,
        processing: processingSources,
        failed: failedSources,
        success_rate: totalSources > 0 ? (completedSources / totalSources * 100).toFixed(1) : 0
      }
    });

  } catch (error) {
    console.error("Failed to get bulk knowledge sources status:", error);
    return c.json({ error: "Failed to retrieve status" }, 500);
  }
});

// Widget endpoints (public, no auth required)
app.get("/api/widget/agents/:agentId", async (c) => {
  const agentId = c.req.param("agentId");

  try {
    const agent = await c.env.DB.prepare(`
      SELECT id, name, description, model, is_active FROM agents WHERE id = ? AND is_active = 1
    `).bind(agentId).first();

    if (!agent) {
      return c.json({ error: "Agent not found or inactive" }, 404);
    }

    return c.json(agent);
  } catch (error) {
    console.error("Failed to fetch agent for widget:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/api/widget/agents/:agentId/chat", zValidator("json", ExecuteAgentSchema), async (c) => {
  const agentId = c.req.param("agentId");
  const { message } = c.req.valid("json");

  try {
    // Get agent details
    const agent = await c.env.DB.prepare(`
      SELECT * FROM agents WHERE id = ? AND is_active = 1
    `).bind(agentId).first();

    if (!agent) {
      return c.json({ error: "Agent not found or inactive" }, 404);
    }

    const startTime = Date.now();

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    // Check if RAG is enabled for this agent
    const knowledgeSettings = await c.env.DB.prepare(`
      SELECT * FROM agent_knowledge_settings WHERE agent_id = ? AND enable_rag = 1
    `).bind(agentId).first();

    let contextMessage = message;

    // If RAG is enabled, enhance the message with relevant knowledge
    if (knowledgeSettings) {
      try {
        const processor = new PineconeRAGProcessor(
          c.env.OPENAI_API_KEY,
          c.env.PINECONE_API_KEY,
          c.env.PINECONE_INDEX_NAME
        );
        
        // Find relevant chunks
        const relevantChunks = await processor.findRelevantChunks(
          message,
          parseInt(agentId),
          knowledgeSettings.max_chunks_per_query as number,
          knowledgeSettings.similarity_threshold as number,
          knowledgeSettings.search_strategy as any || 'hybrid',
          knowledgeSettings.enable_contextual_search as boolean
        );

        // If we found relevant chunks, enhance the context
        if (relevantChunks.length > 0) {
          const contextParts = relevantChunks.map((chunk, index) => 
            `[Source ${index + 1}${chunk.metadata?.source_name ? ` - ${chunk.metadata.source_name}` : ''}]\n${chunk.content}`
          );
          const context = contextParts.join('\n\n');
          contextMessage = `Context information:\n${context}\n\nUser question: ${message}`;
        }
      } catch (ragError) {
        console.error("RAG processing error:", ragError);
        // Continue without RAG if there's an error
      }
    }

    // Prepare messages
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (agent.system_prompt) {
      messages.push({ role: "system", content: agent.system_prompt as string });
    }
    messages.push({ role: "user", content: contextMessage });

    // Prepare completion parameters
    const completionParams: any = {
      model: agent.model as any,
      messages: messages as any,
      max_completion_tokens: Math.min(agent.max_tokens as number, 1000), // Limit for widget
    };

    // Only add temperature if the model supports it
    if (supportsCustomTemperature(agent.model as string)) {
      completionParams.temperature = agent.temperature as number;
    }

    // Execute with OpenAI
    const completion = await openai.chat.completions.create(completionParams);

    const response = completion.choices[0].message.content;
    const tokensUsed = completion.usage?.total_tokens || 0;
    const executionTime = Date.now() - startTime;

    // Log the interaction (without user info for widget)
    await c.env.DB.prepare(`
      INSERT INTO agent_executions (agent_id, user_id, input_message, output_message, status, tokens_used, execution_time_ms)
      VALUES (?, 'widget-user', ?, ?, 'completed', ?, ?)
    `).bind(agentId, message, response, tokensUsed, executionTime).run();

    return c.json({
      output: response,
      tokens_used: tokensUsed,
      execution_time_ms: executionTime,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Widget chat error:", error);

    // Log failed execution
    await c.env.DB.prepare(`
      INSERT INTO agent_executions (agent_id, user_id, input_message, status, error_message)
      VALUES (?, 'widget-user', ?, 'failed', ?)
    `).bind(agentId, message, errorMessage).run();

    return c.json({ error: "I'm sorry, I encountered an error. Please try again later." }, 500);
  }
});

// MinIO/R2 removed - using direct processing

// AGENTSET APPROACH: Simple, direct processing

// R2 upload removed - using direct processing

// MinerU removed - using simple pdf-parse only

// Legacy function - removed for queue approach


// Helper function to update processing progress
async function updateProgress(env: Env, sourceId: number, percentage: number, message: string, stage: string) {
  await env.DB.prepare(`
    UPDATE knowledge_sources 
    SET progress_percentage = ?, progress_message = ?, processing_stage = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(percentage, message, stage, sourceId).run();
  console.log(`Progress [${sourceId}]: ${percentage}% - ${stage} - ${message}`);
}

// Enhanced retry function with detailed error handling
async function processKnowledgeSourcePineconeWithRetry(env: Env, sourceId: number, data: any, agentId: number, maxRetries: number = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Processing attempt ${attempt}/${maxRetries} for knowledge source ${sourceId}`);
      await updateProgress(env, sourceId, 5, `Processing attempt ${attempt}/${maxRetries}...`, 'initializing');
      
      await processKnowledgeSourcePinecone(env, sourceId, data, agentId);
      console.log(`Successfully processed knowledge source ${sourceId} on attempt ${attempt}`);
      return; // Success, exit retry loop
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Unknown error on attempt ${attempt}`);
      console.error(`Attempt ${attempt}/${maxRetries} failed for source ${sourceId}:`, lastError);
      
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s
        console.log(`Waiting ${waitTime}ms before retry ${attempt + 1}...`);
        await updateProgress(env, sourceId, 10, `Attempt ${attempt} failed, retrying in ${Math.round(waitTime/1000)}s...`, 'retrying');
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  // All attempts failed
  console.error(`All ${maxRetries} attempts failed for knowledge source ${sourceId}. Final error:`, lastError);
  throw lastError || new Error('Processing failed after all retry attempts');
}

// Helper function to process knowledge sources with Pinecone
async function processKnowledgeSourcePinecone(env: Env, sourceId: number, data: any, agentId: number) {
  console.log(`Starting processKnowledgeSourcePinecone: sourceId=${sourceId}, agentId=${agentId}, type=${data.type}`);
  
  // Validate environment variables first
  if (!env.OPENAI_API_KEY || !env.PINECONE_API_KEY || !env.PINECONE_INDEX_NAME) {
    throw new Error('Missing required environment variables: OPENAI_API_KEY, PINECONE_API_KEY, or PINECONE_INDEX_NAME');
  }
  
  const processor = new PineconeRAGProcessor(
    env.OPENAI_API_KEY,
    env.PINECONE_API_KEY,
    env.PINECONE_INDEX_NAME
  );
  
  await env.DB.prepare(`UPDATE knowledge_sources SET status = 'processing' WHERE id = ?`).bind(sourceId).run();
  await updateProgress(env, sourceId, 10, 'Initializing processors...', 'initializing');

  try {
    // Get agent settings for chunking
    await updateProgress(env, sourceId, 15, 'Loading agent settings...', 'initializing');
    const settings = await env.DB.prepare(`
      SELECT * FROM agent_knowledge_settings WHERE agent_id = ?
    `).bind(agentId).first();

    const chunkingSettings = {
      chunk_size: settings?.chunk_size || 2000,
      chunk_overlap: settings?.chunk_overlap || 400,
      chunking_strategy: settings?.chunking_strategy || 'semantic'
    };

    console.log(`Using chunking settings:`, chunkingSettings);

    // Process the source using Pinecone
    let processData = {
      type: data.type,
      name: data.name,
      source_url: data.source_url,
      content: data.content
    };
    
    // SIMPLIFIED FILE PROCESSING
    if (data.file && data.file instanceof File) {
      try {
        console.log(`🏁 [SIMPLE] Processing file: ${data.file.name} (${data.file.size} bytes)`);
        await updateProgress(env, sourceId, 20, 'Processing file...', 'extracting');
        
        // DIRECT TEXT EXTRACTION FOR PDF
        if (data.file.name.toLowerCase().endsWith('.pdf')) {
          const arrayBuffer = await data.file.arrayBuffer();
          // Use unpdf which works in Cloudflare Workers
          const { extractText, getDocumentProxy } = await import('unpdf');
          
          const document = await getDocumentProxy(new Uint8Array(arrayBuffer));
          const { text } = await extractText(document, { mergePages: true });
          
          processData.content = text.replace(/\s+/g, ' ').trim();
          console.log(`✅ [SIMPLE] PDF extracted: ${processData.content.length} characters`);
        } else {
          // For other files, try direct text
          processData.content = await data.file.text();
          console.log(`✅ [SIMPLE] Text extracted: ${processData.content.length} characters`);
        }
        
        if (!processData.content || processData.content.length < 10) {
          throw new Error('File appears to be empty or unreadable');
        }
        
        processData.source_url = data.file.name;
        await updateProgress(env, sourceId, 50, `Content extracted (${processData.content.length} chars)`, 'processing');
        
      } catch (extractError) {
        console.error('❌ [SIMPLE] File extraction failed:', extractError);
        const errorMsg = extractError instanceof Error ? extractError.message : 'File processing failed';
        await updateProgress(env, sourceId, 0, `File processing failed: ${errorMsg}`, 'failed');
        throw new Error(`File processing failed: ${errorMsg}`);
      }
    }
    
    await updateProgress(env, sourceId, 60, 'Processing content with RAG pipeline...', 'processing');
    
    const result = await processor.processKnowledgeSource(
      sourceId,
      agentId,
      processData,
      chunkingSettings
    );

    if (!result.success) {
      const errorMsg = result.error || 'Unknown processing error from RAG pipeline';
      console.error(`RAG processing failed:`, errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`RAG processing completed successfully: ${result.chunks_count} chunks created`);
    await updateProgress(env, sourceId, 90, `Successfully processed ${result.chunks_count} chunks`, 'finalizing');

    // Update source status with metadata
    const metadata = {
      chunks_count: result.chunks_count,
      chunking_strategy: chunkingSettings.chunking_strategy,
      chunk_size: chunkingSettings.chunk_size,
      processed_with: 'pinecone',
      processed_at: new Date().toISOString(),
      content_length: processData.content?.length || 0,
      processing_duration: Date.now()
    };

    await env.DB.prepare(`
      UPDATE knowledge_sources 
      SET status = 'completed', 
          metadata = ?, 
          progress_percentage = 100,
          progress_message = 'Processing completed successfully',
          processing_stage = 'completed',
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(JSON.stringify(metadata), sourceId).run();

    console.log(`✅ Knowledge source ${sourceId} marked as completed in database`);
    await updateProgress(env, sourceId, 100, `Successfully processed ${result.chunks_count} chunks`, 'completed');
    console.log(`Knowledge source ${sourceId} processing completed successfully`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown processing error';
    const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
    
    console.error("Processing error:", error);
    
    await env.DB.prepare(`
      UPDATE knowledge_sources 
      SET status = 'failed', 
          progress_percentage = 0,
          progress_message = ?,
          processing_stage = 'failed',
          metadata = ?,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(
      `Processing failed: ${errorMsg}`,
      JSON.stringify({ error: errorMsg, stack: errorStack, timestamp: new Date().toISOString() }),
      sourceId
    ).run();
    
    throw error;
  }
}

// AGENTSET SOLUTION: Background job processor

// ENDPOINT PARA LIMPAR JOBS
app.post("/api/clear-jobs", async (c) => {
  try {
    console.log('🗑️ Limpando todos os jobs da memória KV...');
    
    // Listar todos os jobs
    const keys = await c.env.KV.list({ prefix: 'job:' });
    console.log(`Encontrados ${keys.keys.length} jobs para limpar`);
    
    // Deletar todos os jobs
    for (const key of keys.keys) {
      await c.env.KV.delete(key.name);
      console.log(`Deletado job: ${key.name}`);
    }
    
    // Resetar status dos conhecimentos para pending
    await c.env.DB.prepare(`
      UPDATE knowledge_sources 
      SET status = 'pending', 
          progress_percentage = 0,
          progress_message = 'Resetado - aguardando processamento',
          processing_stage = 'pending',
          updated_at = CURRENT_TIMESTAMP 
      WHERE status IN ('processing', 'failed')
    `).run();
    
    console.log('✅ Jobs limpos e status resetado');
    
    return c.json({ 
      success: true, 
      message: `${keys.keys.length} jobs removidos da memória`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao limpar jobs:', error);
    return c.json({ 
      success: false, 
      error: (error as Error).message
    }, 500);
  }
});

// ENDPOINT TEMPORÁRIO PARA MIGRAÇÃO
app.post("/api/fix-db", async (c) => {
  try {
    console.log('🔧 Executando migração do banco...');
    
    // Backup da tabela atual
    await c.env.DB.prepare("CREATE TABLE IF NOT EXISTS knowledge_sources_backup AS SELECT * FROM knowledge_sources").run();
    console.log('✅ Backup criado');
    
    // Recriar tabela com coluna content
    await c.env.DB.prepare("DROP TABLE knowledge_sources").run();
    console.log('✅ Tabela antiga removida');
    
    await c.env.DB.prepare(`CREATE TABLE knowledge_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      source_url TEXT,
      file_path TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      progress_percentage INTEGER DEFAULT 0,
      progress_message TEXT DEFAULT '',
      processing_stage TEXT DEFAULT 'pending',
      metadata TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`).run();
    console.log('✅ Nova tabela criada com coluna content');
    
    // Restaurar dados do backup
    await c.env.DB.prepare(`INSERT INTO knowledge_sources (
      id, agent_id, name, type, source_url, file_path,
      status, progress_percentage, progress_message,
      processing_stage, metadata, created_at, updated_at
    ) SELECT 
      id, agent_id, name, type, source_url, file_path,
      status, progress_percentage, progress_message,
      processing_stage, metadata, created_at, updated_at
    FROM knowledge_sources_backup`).run();
    console.log('✅ Dados restaurados');
    
    // Criar índices
    await c.env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_knowledge_sources_agent ON knowledge_sources(agent_id)").run();
    await c.env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_knowledge_sources_status ON knowledge_sources(status)").run();
    await c.env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_knowledge_sources_type ON knowledge_sources(type)").run();
    console.log('✅ Índices criados');
    
    // Limpar backup
    await c.env.DB.prepare("DROP TABLE knowledge_sources_backup").run();
    console.log('✅ Backup removido');
    
    console.log('🎉 Migração concluída com sucesso!');
    
    return c.json({ 
      success: true, 
      message: 'Migração aplicada com sucesso - coluna content adicionada',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    return c.json({ 
      success: false, 
      error: (error as Error).message
    }, 500);
  }
});

// Queue consumer handler
async function queueHandler(batch: any, env: Env) {
  console.log(`📦 [QUEUE] Processing batch of ${batch.messages.length} messages`);
  
  for (const message of batch.messages) {
    try {
      const msg = message.body;
      console.log(`⚡ [QUEUE] Processing message for source ${msg.sourceId}, attempt ${msg.retryCount || 0}`);
      
      // Update status to processing
      await env.DB.prepare(`UPDATE knowledge_sources SET status = 'processing' WHERE id = ?`)
        .bind(msg.sourceId).run();
      
      // Process with RAG system
      await processKnowledgeSourcePineconeWithRetry(env, msg.sourceId, msg.data, msg.agentId);
      
      console.log(`✅ [QUEUE] Successfully processed source ${msg.sourceId}`);
      message.ack();
      
    } catch (error: any) {
      console.error(`❌ [QUEUE] Failed to process message:`, error);
      
      const msg = message.body;
      const retryCount = (msg.retryCount || 0) + 1;
      
      if (retryCount <= 3) {
        console.log(`🔄 [QUEUE] Retrying message (${retryCount}/3) for source ${msg.sourceId}`);
        message.retry({ ...msg, retryCount });
      } else {
        console.error(`💀 [QUEUE] Max retries exceeded for source ${msg.sourceId}`);
        await env.DB.prepare(`
          UPDATE knowledge_sources
          SET status = 'failed', progress_message = ?
          WHERE id = ?
        `).bind(`Processing failed after ${retryCount} attempts: ${error.message}`, msg.sourceId).run();
        message.ack();
      }
    }
  }
}

// Analytics endpoint - separado e não invasivo
app.get('/api/analytics', authMiddleware, async (c) => {
  try {
    const analytics = new Analytics(c.env.DB);
    const metrics = await analytics.getMetrics();
    return c.json(metrics);
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// Remover rota catch-all - deixar Cloudflare Assets servir o SPA automaticamente

export default {
  fetch: app.fetch.bind(app),
  
  
  // Cloudflare Queue consumer
  async queue(batch: any, env: Env): Promise<void> {
    return queueHandler(batch, env);
  }
};


