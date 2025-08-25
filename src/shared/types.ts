import z from "zod";

// Workspace schemas
export const WorkspaceSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  owner_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
});

// Agent schemas
export const AgentSchema = z.object({
  id: z.number(),
  workspace_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable(),
  system_prompt: z.string().nullable(),
  model: z.string(),
  temperature: z.number(),
  max_tokens: z.number(),
  is_active: z.boolean(),
  created_by_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateAgentSchema = z.object({
  workspace_id: z.number(),
  name: z.string().min(1, "Agent name is required"),
  description: z.string().optional(),
  system_prompt: z.string().optional(),
  model: z.string().default("gpt-4o-mini"),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(1).max(16000).default(1000),
  enable_rag: z.boolean().default(false),
  max_chunks_per_query: z.number().min(1).max(10).default(3),
  similarity_threshold: z.number().min(0.1).max(1.0).default(0.7),
});

export const UpdateAgentSchema = CreateAgentSchema.partial().omit({ workspace_id: true });

// Agent execution schemas
export const AgentExecutionSchema = z.object({
  id: z.number(),
  agent_id: z.number(),
  user_id: z.string(),
  input_message: z.string(),
  output_message: z.string().nullable(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  error_message: z.string().nullable(),
  tokens_used: z.number().nullable(),
  execution_time_ms: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ExecuteAgentSchema = z.object({
  message: z.string().min(1, "Message is required"),
});

// Knowledge source schemas
export const KnowledgeSourceSchema = z.object({
  id: z.number(),
  agent_id: z.number(),
  name: z.string(),
  type: z.enum(['url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text']),
  source_url: z.string().nullable(),
  file_path: z.string().nullable(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  metadata: z.string().nullable(),
  progress_percentage: z.number().default(0),
  progress_message: z.string().default(''),
  processing_stage: z.string().default('pending'),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateKnowledgeSourceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(['url', 'pdf', 'doc', 'docx', 'pptx', 'youtube', 'text']),
  source_url: z.string().optional(), // Removed .url() validation to handle non-URL cases
  content: z.string().optional(),
  file: z.any().optional(), // For file uploads
});

export const AgentKnowledgeSettingsSchema = z.object({
  id: z.number(),
  agent_id: z.number(),
  enable_rag: z.boolean(),
  max_chunks_per_query: z.number(),
  similarity_threshold: z.number(),
  chunk_size: z.number(),
  chunk_overlap: z.number(),
  chunking_strategy: z.string().default('recursive'),
  search_strategy: z.string().default('hybrid'),
  enable_contextual_search: z.boolean().default(true),
  context_window: z.number().default(2),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UpdateKnowledgeSettingsSchema = z.object({
  enable_rag: z.boolean(),
  max_chunks_per_query: z.number().min(1).max(10),
  similarity_threshold: z.number().min(0).max(1),
  chunk_size: z.number().min(100).max(2000),
  chunk_overlap: z.number().min(0).max(500),
  chunking_strategy: z.enum(['paragraph', 'sentence', 'recursive', 'semantic']).default('recursive'),
  search_strategy: z.enum(['cosine', 'euclidean', 'hybrid']).default('hybrid'),
  enable_contextual_search: z.boolean().default(true),
  context_window: z.number().min(1).max(5).default(2),
});

// Type exports
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CreateWorkspace = z.infer<typeof CreateWorkspaceSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type CreateAgent = z.infer<typeof CreateAgentSchema>;
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;
export type AgentExecution = z.infer<typeof AgentExecutionSchema>;
export type ExecuteAgent = z.infer<typeof ExecuteAgentSchema>;
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>;
export type CreateKnowledgeSource = z.infer<typeof CreateKnowledgeSourceSchema>;
export type AgentKnowledgeSettings = z.infer<typeof AgentKnowledgeSettingsSchema>;
export type UpdateKnowledgeSettings = z.infer<typeof UpdateKnowledgeSettingsSchema>;
