import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/react-app/App";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Send, Bot, User, Clock, Zap, Sparkles, Copy, RotateCcw, Settings, BookOpen, Database, Code } from "lucide-react";
import type { Agent, AgentExecution } from "@/shared/types";
import KnowledgeSourceManager from "@/react-app/components/KnowledgeSourceManager";
import KnowledgeSettings from "@/react-app/components/KnowledgeSettings";
import AgentWidgetModal from "@/react-app/components/AgentWidgetModal";

export default function AgentPage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const { agentId } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [executions, setExecutions] = useState<AgentExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [executing, setExecuting] = useState(false);
  const [currentResponse, setCurrentResponse] = useState("");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState({
    name: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1000,
  });
  const [updating, setUpdating] = useState(false);
  const [showKnowledgeManager, setShowKnowledgeManager] = useState(false);
  const [showKnowledgeSettings, setShowKnowledgeSettings] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && agentId) {
      fetchAgentData();
    }
  }, [user, agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [executions, currentResponse]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAgentData = async () => {
    try {
      const headers = {
        "X-User-Data": JSON.stringify(user)
      };
      
      // Get agent details from workspaces API (we need to find which workspace contains this agent)
      const workspacesResponse = await fetch("/api/workspaces", { headers });
      if (workspacesResponse.ok) {
        const workspaces = await workspacesResponse.json();
        let foundAgent = null;
        
        for (const workspace of workspaces) {
          const agentsResponse = await fetch(`/api/workspaces/${workspace.id}/agents`, { headers });
          if (agentsResponse.ok) {
            const agents = await agentsResponse.json();
            foundAgent = agents.find((a: Agent) => a.id.toString() === agentId);
            if (foundAgent) break;
          }
        }
        
        setAgent(foundAgent);
        if (foundAgent) {
          setEditingAgent({
            name: foundAgent.name,
            description: foundAgent.description || "",
            system_prompt: foundAgent.system_prompt || "",
            model: foundAgent.model,
            temperature: foundAgent.temperature,
            max_tokens: foundAgent.max_tokens,
          });
        }
      }

      // Fetch executions
      const executionsResponse = await fetch(`/api/agents/${agentId}/executions`, { headers });
      if (executionsResponse.ok) {
        const executionsData = await executionsResponse.json();
        setExecutions(executionsData);
      }
    } catch (error) {
      console.error("Failed to fetch agent data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || executing) return;

    const userMessage = message;
    setMessage("");
    setExecuting(true);
    setCurrentResponse("");

    try {
      const response = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Data": JSON.stringify(user)
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentResponse(result.output);
        
        // Add to executions list
        const newExecution: AgentExecution = {
          id: result.id,
          agent_id: parseInt(agentId!),
          user_id: user!.id,
          input_message: userMessage,
          output_message: result.output,
          status: "completed",
          error_message: null,
          tokens_used: result.tokens_used,
          execution_time_ms: result.execution_time_ms,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        setExecutions(prev => [newExecution, ...prev]);
      } else {
        const error = await response.json();
        setCurrentResponse(`Error: ${error.error}`);
      }
    } catch (error) {
      setCurrentResponse(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearChat = () => {
    setExecutions([]);
    setCurrentResponse("");
  };

  const handleUpdateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent.name.trim()) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Data": JSON.stringify(user)
        },
        body: JSON.stringify(editingAgent),
      });

      if (response.ok) {
        const updatedAgent = await response.json();
        setAgent(updatedAgent);
        setShowConfigModal(false);
      }
    } catch (error) {
      console.error("Failed to update agent:", error);
    } finally {
      setUpdating(false);
    }
  };

  const openConfigModal = () => {
    if (agent) {
      setEditingAgent({
        name: agent.name,
        description: agent.description || "",
        system_prompt: agent.system_prompt || "",
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
      });
      setShowConfigModal(true);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
      </div>
    );
  }

  if (!user || !agent) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/workspace/${agent.workspace_id}`)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                  <div className="flex items-center space-x-4 text-sm text-white/60">
                    <span>{agent.model}</span>
                    <span>•</span>
                    <span>Temperature: {agent.temperature}</span>
                    <span>•</span>
                    <span className={agent.is_active ? "text-green-400" : "text-red-400"}>
                      {agent.is_active ? "Active" : "Inactive"}
                    </span>
                    <span>•</span>
                    <span className="text-purple-400 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>RAG Enabled</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowWidgetModal(true)}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Get embed code"
              >
                <Code className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowKnowledgeManager(true)}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Knowledge base"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowKnowledgeSettings(true)}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="RAG settings"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={openConfigModal}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Agent settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={clearChat}
                className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                title="Clear chat"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Welcome Message */}
            {executions.length === 0 && !currentResponse && (
              <div className="text-center py-12">
                <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 max-w-2xl mx-auto">
                  <Bot className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-white mb-2">Chat with {agent.name}</h2>
                  {agent.description && (
                    <p className="text-white/70 mb-4">{agent.description}</p>
                  )}
                  {agent.system_prompt && (
                    <div className="bg-white/5 rounded-lg p-4 text-left mb-4">
                      <div className="text-sm text-white/60 mb-2">System Prompt:</div>
                      <div className="text-white/80 text-sm">{agent.system_prompt}</div>
                    </div>
                  )}
                  <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-lg p-4 text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <div className="text-sm text-purple-300 font-medium">Knowledge-Enhanced AI</div>
                    </div>
                    <div className="text-white/70 text-sm">
                      This agent can access external knowledge sources including websites, documents, and YouTube videos to provide more informed and accurate responses.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {executions.slice().reverse().map((execution) => (
              <div key={execution.id} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl rounded-br-md px-6 py-4 max-w-[80%]">
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-white/80" />
                      <span className="text-sm text-white/80">You</span>
                    </div>
                    <p className="text-white">{execution.input_message}</p>
                  </div>
                </div>

                {/* Agent Response */}
                <div className="flex justify-start">
                  <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl rounded-bl-md px-6 py-4 max-w-[80%]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-white/80">{agent.name}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(execution.output_message || "")}
                        className="text-white/40 hover:text-white/60 transition-colors"
                        title="Copy response"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {execution.status === "failed" ? (
                      <p className="text-red-400">{execution.error_message}</p>
                    ) : (
                      <div className="text-white whitespace-pre-wrap">{execution.output_message}</div>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-white/10 text-xs text-white/50">
                      {execution.tokens_used && (
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>{execution.tokens_used} tokens</span>
                        </div>
                      )}
                      {execution.execution_time_ms && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{execution.execution_time_ms}ms</span>
                        </div>
                      )}
                      <span>{new Date(execution.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Current Response (if executing) */}
            {(executing || currentResponse) && (
              <div className="flex justify-start">
                <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl rounded-bl-md px-6 py-4 max-w-[80%]">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bot className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-white/80">{agent.name}</span>
                    {executing && <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />}
                  </div>
                  
                  {executing && !currentResponse ? (
                    <div className="text-white/60">Thinking...</div>
                  ) : (
                    <div className="text-white whitespace-pre-wrap">{currentResponse}</div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-lg p-6 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Message ${agent.name}...`}
                  className="w-full bg-white/10 border border-white/20 rounded-full px-6 py-4 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 pr-14"
                  disabled={executing}
                />
                <button
                  type="submit"
                  disabled={executing || !message.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full transition-all duration-300 hover:scale-105"
                >
                  {executing ? (
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Agent Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Agent Configuration</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateAgent} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="Enter agent name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Model
                  </label>
                  <select
                    value={editingAgent.model}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  >
                    <optgroup label="GPT-4 Models">
                      <option value="gpt-4o">GPT-4o (Most Capable)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-4">GPT-4</option>
                    </optgroup>
                    <optgroup label="GPT-3.5 Models">
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </optgroup>
                    <optgroup label="o1 Reasoning Models">
                      <option value="o1-preview">o1-preview (Advanced Reasoning)</option>
                      <option value="o1-mini">o1-mini (Reasoning - Cost Effective)</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={editingAgent.description}
                  onChange={(e) => setEditingAgent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Describe what this agent does"
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  System Prompt
                </label>
                <textarea
                  value={editingAgent.system_prompt}
                  onChange={(e) => setEditingAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                  placeholder="Define the agent's personality, role, and behavior..."
                  rows={5}
                />
                <div className="text-xs text-white/50 mt-1">
                  Instructions that define how the agent should behave and respond
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Temperature ({editingAgent.temperature})
                    {(editingAgent.model.includes('o1') || editingAgent.model.includes('o3')) && (
                      <span className="text-yellow-400 text-xs ml-2">
                        (Fixed at 1.0 for this model)
                      </span>
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={editingAgent.temperature}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500"
                    disabled={editingAgent.model.includes('o1') || editingAgent.model.includes('o3')}
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>Focused (0.0)</span>
                    <span>Balanced (1.0)</span>
                    <span>Creative (2.0)</span>
                  </div>
                  <div className="text-xs text-white/50 mt-2">
                    Controls randomness in responses. Lower = more consistent, Higher = more creative
                  </div>
                </div>
                
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="16000"
                    value={editingAgent.max_tokens}
                    onChange={(e) => setEditingAgent(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <div className="text-xs text-white/50 mt-1">
                    Maximum length of the response (1-16000 tokens)
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">Model Information</h4>
                <div className="text-sm text-white/70 mb-3">
                  {editingAgent.model === "gpt-4o" && (
                    <div>
                      <strong>GPT-4o:</strong> Most capable model with advanced reasoning, vision, and function-calling capabilities. Best for complex tasks.
                    </div>
                  )}
                  {editingAgent.model === "gpt-4o-mini" && (
                    <div>
                      <strong>GPT-4o Mini:</strong> Fast and cost-effective while maintaining high intelligence. Great balance of performance and cost.
                    </div>
                  )}
                  {editingAgent.model === "o1-preview" && (
                    <div>
                      <strong>o1-preview:</strong> Advanced reasoning model that thinks step by step. Excellent for complex problem-solving and analysis.
                    </div>
                  )}
                  {editingAgent.model === "o1-mini" && (
                    <div>
                      <strong>o1-mini:</strong> Reasoning-focused model optimized for STEM tasks. Cost-effective option for analytical work.
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">Enhanced with RAG</span>
                  </div>
                  <p className="text-xs text-white/60">
                    This agent supports Retrieval-Augmented Generation (RAG) with knowledge sources from URLs, PDFs, documents, and YouTube videos for more informed responses.
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editingAgent.name.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  {updating ? "Updating..." : "Update Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Knowledge Source Manager */}
      <KnowledgeSourceManager
        agentId={parseInt(agentId!)}
        isOpen={showKnowledgeManager}
        onClose={() => setShowKnowledgeManager(false)}
        user={user}
      />

      {/* Knowledge Settings */}
      <KnowledgeSettings
        agentId={parseInt(agentId!)}
        isOpen={showKnowledgeSettings}
        onClose={() => setShowKnowledgeSettings(false)}
        user={user}
      />

      {/* Widget Modal */}
      <AgentWidgetModal
        agent={agent}
        isOpen={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
      />
    </div>
  );
}
