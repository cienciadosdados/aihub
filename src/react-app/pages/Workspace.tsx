import { useEffect, useState } from "react";
import { useAuth } from "@/react-app/App";
import { useNavigate, useParams } from "react-router";
import { Plus, Bot, ArrowLeft, Play, Trash2, Sparkles } from "lucide-react";
import type { Agent, Workspace } from "@/shared/types";

export default function WorkspacePage() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 1000,
    enable_rag: false,
    max_chunks_per_query: 3,
    similarity_threshold: 0.7,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user && workspaceId) {
      fetchWorkspaceData();
    }
  }, [user, workspaceId]);

  const fetchWorkspaceData = async () => {
    try {
      // Fetch workspace details and agents
      const headers = {
        "X-User-Data": JSON.stringify(user)
      };
      
      const [workspaceResponse, agentsResponse] = await Promise.all([
        fetch("/api/workspaces", { headers }),
        fetch(`/api/workspaces/${workspaceId}/agents`, { headers }),
      ]);

      if (workspaceResponse.ok) {
        const workspaces = await workspaceResponse.json();
        const currentWorkspace = workspaces.find((w: Workspace) => w.id.toString() === workspaceId);
        setWorkspace(currentWorkspace || null);
      }

      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json();
        setAgents(agentsData);
      }
    } catch (error) {
      console.error("Failed to fetch workspace data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgent.name.trim()) return;

    setCreating(true);
    try {
      // Create the agent first (without RAG settings)
      const { enable_rag, max_chunks_per_query, similarity_threshold, ...agentData } = newAgent;
      const response = await fetch(`/api/workspaces/${workspaceId}/agents`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Data": JSON.stringify(user)
        },
        body: JSON.stringify({
          ...agentData,
          workspace_id: parseInt(workspaceId!),
        }),
      });

      if (response.ok) {
        const agent = await response.json();
        
        // If RAG is enabled, configure the knowledge settings
        if (enable_rag) {
          try {
            await fetch(`/api/agents/${agent.id}/knowledge-settings`, {
              method: "PUT",
              headers: { 
                "Content-Type": "application/json",
                "X-User-Data": JSON.stringify(user)
              },
              body: JSON.stringify({
                enable_rag: true,
                max_chunks_per_query,
                similarity_threshold,
                chunk_size: 1000,
                chunk_overlap: 200,
                chunking_strategy: 'semantic',
                search_strategy: 'hybrid',
                enable_contextual_search: true,
                context_window: 2,
              }),
            });
          } catch (ragError) {
            console.error("Failed to configure RAG settings:", ragError);
            // Continue anyway - user can configure later
          }
        }
        
        setAgents(prev => [agent, ...prev]);
        setShowCreateModal(false);
        setNewAgent({
          name: "",
          description: "",
          system_prompt: "",
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 1000,
          enable_rag: false,
          max_chunks_per_query: 3,
          similarity_threshold: 0.7,
        });
      }
    } catch (error) {
      console.error("Failed to create agent:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAgent = async (agentId: number) => {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
      const response = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": JSON.stringify(user)
        }
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
      }
    } catch (error) {
      console.error("Failed to delete agent:", error);
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

  if (!user || !workspace) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
                {workspace.description && (
                  <p className="text-white/60 text-sm">{workspace.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Agent</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 max-w-2xl mx-auto">
              <Bot className="w-16 h-16 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Create your first AI agent</h2>
              <p className="text-white/70 mb-8 text-lg">
                AI agents are intelligent assistants that can help with tasks, answer questions, and automate workflows.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Agent</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Agents</h2>
              <p className="text-white/70">Manage your AI agents in this workspace</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="group bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 w-12 h-12 rounded-xl flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/agent/${agent.id}`)}
                        className="text-white/40 hover:text-green-400 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="text-white/40 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2 flex items-center space-x-2">
                    <span>{agent.name}</span>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                      🧠 RAG Ready
                    </span>
                  </h3>
                  
                  {agent.description && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-white/50">
                      <span>Model:</span>
                      <span className="text-purple-400">{agent.model}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/50">
                      <span>Temperature:</span>
                      <span className="text-blue-400">{agent.temperature}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/50">
                      <span>Status:</span>
                      <span className={agent.is_active ? "text-green-400" : "text-red-400"}>
                        {agent.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => navigate(`/agent/${agent.id}`)}
                      className="w-full bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 border border-purple-500/30 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Test Agent</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Create AI Agent</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateAgent} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
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
                    value={newAgent.model}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, model: e.target.value }))}
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
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newAgent.description}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Describe what this agent does"
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  System Prompt
                </label>
                <textarea
                  value={newAgent.system_prompt}
                  onChange={(e) => setNewAgent(prev => ({ ...prev, system_prompt: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                  placeholder="Define the agent's personality and instructions..."
                  rows={4}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Temperature ({newAgent.temperature})
                    {(newAgent.model.includes('o1') || newAgent.model.includes('o3')) && (
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
                    value={newAgent.temperature}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500"
                    disabled={newAgent.model.includes('o1') || newAgent.model.includes('o3')}
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>Focused</span>
                    <span>Creative</span>
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
                    value={newAgent.max_tokens}
                    onChange={(e) => setNewAgent(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  <div className="text-xs text-white/50 mt-1">
                    Maximum response length (1-16000 tokens)
                  </div>
                </div>
              </div>

              {/* RAG Configuration Section */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <span>🧠</span>
                  <span>Knowledge & RAG Settings</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="enable_rag"
                      checked={newAgent.enable_rag}
                      onChange={(e) => setNewAgent(prev => ({ ...prev, enable_rag: e.target.checked }))}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <label htmlFor="enable_rag" className="text-white/80 text-sm">
                      Enable RAG (Retrieval-Augmented Generation)
                    </label>
                  </div>
                  
                  {newAgent.enable_rag && (
                    <div className="grid md:grid-cols-2 gap-4 pl-7">
                      <div>
                        <label className="block text-white/70 text-sm font-medium mb-2">
                          Max Chunks per Query ({newAgent.max_chunks_per_query})
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={newAgent.max_chunks_per_query}
                          onChange={(e) => setNewAgent(prev => ({ ...prev, max_chunks_per_query: parseInt(e.target.value) }))}
                          className="w-full accent-purple-500"
                        />
                        <div className="text-xs text-white/50 mt-1">
                          Number of knowledge chunks to retrieve per query
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-white/70 text-sm font-medium mb-2">
                          Similarity Threshold ({newAgent.similarity_threshold})
                        </label>
                        <input
                          type="range"
                          min="0.3"
                          max="1.0"
                          step="0.1"
                          value={newAgent.similarity_threshold}
                          onChange={(e) => setNewAgent(prev => ({ ...prev, similarity_threshold: parseFloat(e.target.value) }))}
                          className="w-full accent-purple-500"
                        />
                        <div className="text-xs text-white/50 mt-1">
                          Minimum similarity score for relevant content
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-white/50 bg-white/5 rounded p-3">
                    💡 <strong>Tip:</strong> Enable RAG to allow your agent to access uploaded documents, websites, and other knowledge sources. You can add knowledge sources after creating the agent.
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newAgent.name.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  {creating ? "Creating..." : "Create Agent"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
