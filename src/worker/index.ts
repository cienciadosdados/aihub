import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import OpenAI from "openai";
import { PineconeRAGProcessor } from "./pinecone-rag";
import * as Minio from 'minio';
import {
  CreateWorkspaceSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  ExecuteAgentSchema,
  UpdateKnowledgeSettingsSchema,
} from "../shared/types";
// PDF processing disabled for Cloudflare Workers compatibility
// Will implement alternative PDF processing solution

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
  
  // Start background processing without awaiting to prevent blocking the response
  processKnowledgeSourcePineconeWithRetry(c.env, sourceId, data, parseInt(agentId))
    .catch(async (error) => {
      console.error(`Critical error processing knowledge source ${sourceId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
      const errorDetails = error instanceof Error ? error.stack : 'No stack trace available';
      
      // Update with detailed error information
      await c.env.DB.prepare(`
        UPDATE knowledge_sources 
        SET status = 'failed', 
            progress_percentage = 0, 
            progress_message = ?, 
            processing_stage = 'failed',
            metadata = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).bind(
        `Processing failed: ${errorMessage}`,
        JSON.stringify({ error: errorMessage, stack: errorDetails, timestamp: new Date().toISOString() }),
        sourceId
      ).run();
    });

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

// Bulk status endpoint for multiple sources
app.get("/api/agents/:agentId/knowledge-sources/status", authMiddleware, async (c) => {
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

// R2 client helper (S3-compatible)
function createR2Client(env: Env): Minio.Client {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY || !env.R2_SECRET_KEY) {
    throw new Error('R2 credentials not configured. Please set R2_ENDPOINT, R2_ACCESS_KEY, and R2_SECRET_KEY in your environment variables.');
  }

  return new Minio.Client({
    endPoint: env.R2_ENDPOINT.replace('https://', '').replace('http://', ''),
    port: env.R2_PORT ? parseInt(env.R2_PORT) : (env.R2_ENDPOINT.includes('https') ? 443 : 9000),
    useSSL: env.R2_USE_SSL !== 'false', // Default to true unless explicitly false
    accessKey: env.R2_ACCESS_KEY,
    secretKey: env.R2_SECRET_KEY,
  });
}

// Upload file to R2 and return public URL
async function uploadFileToR2(env: Env, file: File, fileName?: string): Promise<string> {
  const r2Client = createR2Client(env);
  const bucketName = env.R2_BUCKET_NAME || 'documents';
  
  // Generate unique filename if not provided
  const objectName = fileName || `${Date.now()}_${file.name}`;
  
  // Upload file
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  await r2Client.putObject(bucketName, objectName, buffer, buffer.length, {
    'Content-Type': file.type || 'application/octet-stream'
  });

  // Generate public URL for R2 using R2.dev domain
  const publicUrl = `${env.R2_PUBLIC_URL}/${objectName}`;

  console.log(`File uploaded to R2: ${publicUrl}`);
  console.log(`R2 Upload details: bucket=${bucketName}, object=${objectName}`);
  return publicUrl;
}

// MinerU API integration for document processing using public URL
async function processDocumentWithMinerU(env: Env, publicUrl: string, fileName: string): Promise<string> {
  if (!env.MINERU_API_KEY) {
    throw new Error('MinerU API key not configured. Please set MINERU_API_KEY in your environment variables.');
  }

  console.log(`Processing ${fileName} with MinerU using URL: ${publicUrl}`);
  
  try {
    // Step 1: Create extraction task using public URL
    const extractTaskResponse = await fetch(`${env.MINERU_BASE_URL}/api/v4/extract/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.MINERU_API_KEY}`,
      },
      body: JSON.stringify({
        url: publicUrl,
        is_ocr: true,
        enable_formula: true,
        enable_table: true,
        language: "ch",
        data_id: `file_${Date.now()}`
      })
    });

    if (!extractTaskResponse.ok) {
      const errorText = await extractTaskResponse.text();
      throw new Error(`Failed to create extraction task: ${extractTaskResponse.status} - ${errorText}`);
    }

    const taskResult = await extractTaskResponse.json() as any;
    console.log('MinerU task created:', taskResult);

    if (taskResult.code !== 0 || !taskResult.data?.task_id) {
      throw new Error(`MinerU task creation error: ${taskResult.msg || 'No task ID returned'}`);
    }

    const taskId = taskResult.data.task_id;

    // Step 2: Poll for results
    const maxRetries = 30; // 5 minutes max (10s intervals)
    let retries = 0;

    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const resultResponse = await fetch(`${env.MINERU_BASE_URL}/api/v4/extract/task/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.MINERU_API_KEY}`,
        }
      });

      if (resultResponse.ok) {
        const result = await resultResponse.json() as any;
        console.log(`Task ${taskId} status:`, result.data?.state);
        
        if (result.code === 0 && result.data) {
          const taskData = result.data;
          
          if (taskData.state === 'done' && taskData.full_zip_url) {
            // Download and extract content from ZIP
            const zipResponse = await fetch(taskData.full_zip_url);
            if (!zipResponse.ok) {
              throw new Error(`Failed to download results: ${zipResponse.status}`);
            }

            // Extract text content from the ZIP response
            try {
              // Try to get the text content directly from the response
              // MinerU typically provides markdown files in the ZIP
              const arrayBuffer = await zipResponse.arrayBuffer();
              
              // For now, we'll try to extract readable text from the buffer
              // This is a simple approach - in production you'd use a ZIP library
              const uint8Array = new Uint8Array(arrayBuffer);
              const text = new TextDecoder('utf-8').decode(uint8Array);
              
              // Extract markdown/text content using regex patterns
              const markdownMatch = text.match(/\.md[\s\S]*?(?=PK|\x00{10,}|$)/g);
              const textContent = markdownMatch ? markdownMatch.join('\n\n') : '';
              
              if (textContent && textContent.length > 100) {
                // Clean up binary characters and return extracted text
                return textContent.replace(/[\x00-\x1F\x7F-\xFF]/g, '').trim();
              } else {
                // Fallback: try to extract any readable text
                const readableText = text.replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, '').replace(/\s+/g, ' ').trim();
                if (readableText.length > 50) {
                  return readableText;
                }
                // Last resort: return the ZIP URL info for manual processing
                return `Document processed but content extraction needs manual review. Results: ${taskData.full_zip_url}`;
              }
            } catch (extractError) {
              console.error('ZIP extraction error:', extractError);
              // Fallback to returning ZIP URL for manual processing
              return `Document processed successfully but automatic text extraction failed. Results available at: ${taskData.full_zip_url}`;
            }
            
          } else if (taskData.state === 'failed') {
            throw new Error(`Processing failed: ${taskData.err_msg || 'Unknown error'}`);
          } else if (taskData.state === 'running') {
            const progress = taskData.extract_progress;
            if (progress) {
              console.log(`Processing... ${progress.extracted_pages || 0}/${progress.total_pages || 0} pages`);
            }
          }
        }
      }

      retries++;
    }

    throw new Error('Processing timeout - please try again later');
    
  } catch (error) {
    console.error(`MinerU processing error for ${fileName}:`, error);
    throw new Error(`Failed to process ${fileName} with MinerU: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractFileContent(file: File, env?: Env): Promise<string> {
  const filename = file.name.toLowerCase();
  
  try {
    // Simple text files - process locally
    if (filename.endsWith('.txt') || filename.endsWith('.md')) {
      return await file.text();
    } else if (filename.endsWith('.json')) {
      const content = await file.text();
      const json = JSON.parse(content);
      return JSON.stringify(json, null, 2);
    } 
    // Document files - use Min.io + MinerU pipeline
    else if (filename.endsWith('.pdf') || 
             filename.endsWith('.docx') || 
             filename.endsWith('.doc') || 
             filename.endsWith('.pptx')) {
      
      if (!env) {
        throw new Error('Environment context required for document processing');
      }
      
      if (!env.MINERU_API_KEY) {
        // Fallback to local PDF processing for PDF files only
        if (filename.endsWith('.pdf')) {
          console.log('MinerU not available, attempting local PDF processing...');
          try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await import('pdf-parse');
            const data = await (pdf as any).default(Buffer.from(arrayBuffer));
            return data.text.replace(/\s+/g, ' ').trim();
          } catch (pdfError) {
            console.error('Local PDF processing failed:', pdfError);
            throw new Error('PDF processing failed: MinerU API key not configured and local PDF processing failed. Please configure MINERU_API_KEY or convert to text format.');
          }
        } else {
          const format = filename.split('.').pop()?.toUpperCase();
          throw new Error(`${format} processing requires MinerU API key. Please configure MINERU_API_KEY or convert to text format.`);
        }
      }

      console.log(`Processing document: ${file.name} (${file.size} bytes)`);
      
      // Step 1: Upload to R2 to get public URL
      const publicUrl = await uploadFileToR2(env, file);
      
      // Step 2: Process with MinerU using the public URL
      const extractedContent = await processDocumentWithMinerU(env, publicUrl, file.name);
      
      return extractedContent;
    } 
    else {
      throw new Error(`Unsupported file format: ${filename}. Supported formats: TXT, MD, JSON, PDF, DOC/DOCX, PPTX (with MinerU API).`);
    }
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    throw new Error(`Failed to extract content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


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
    
    // Handle file upload
    if (data.file && data.file instanceof File) {
      try {
        await updateProgress(env, sourceId, 25, 'Extracting content from file...', 'extracting');
        console.log(`Extracting content from file: ${data.file.name} (${data.file.size} bytes)`);
        const fileContent = await extractFileContent(data.file, env);
        
        if (!fileContent || fileContent.trim().length === 0) {
          throw new Error('No content extracted from file or file is empty');
        }
        
        processData.content = fileContent;
        processData.source_url = data.file.name;
        console.log(`File content extracted: ${fileContent.length} characters`);
        await updateProgress(env, sourceId, 50, 'Content extracted, starting processing...', 'chunking');
      } catch (extractError) {
        console.error('File extraction error:', extractError);
        const errorMsg = extractError instanceof Error ? extractError.message : 'Unknown extraction error';
        await updateProgress(env, sourceId, 0, `Extraction failed: ${errorMsg}`, 'failed');
        throw new Error(`File extraction failed: ${errorMsg}`);
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

export default app;
