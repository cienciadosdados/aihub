import { useEffect, useState } from "react";
import { useAuth } from "@/react-app/App";
import { useNavigate } from "react-router";
import { Plus, Bot, Users, Settings, LogOut, Sparkles } from "lucide-react";
import type { Workspace } from "@/shared/types";

export default function Dashboard() {
  const { user, isPending, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      navigate("/");
    }
  }, [user, isPending, navigate]);

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch("/api/workspaces", {
        headers: {
          "X-User-Data": JSON.stringify(user)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error("Failed to fetch workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleCreateWorkspace called");
    if (!newWorkspaceName.trim()) {
      console.log("No workspace name provided");
      return;
    }

    console.log("Creating workspace:", newWorkspaceName);
    setCreating(true);
    try {
      console.log("Sending request to /api/workspaces");
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Data": JSON.stringify(user)
        },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDescription || undefined,
        }),
      });

      console.log("Response status:", response.status);
      if (response.ok) {
        const workspace = await response.json();
        console.log("Workspace created:", workspace);
        setWorkspaces(prev => [workspace, ...prev]);
        setShowCreateModal(false);
        setNewWorkspaceName("");
        setNewWorkspaceDescription("");
      } else {
        const errorText = await response.text();
        console.error("Failed to create workspace:", response.status, errorText);
      }
    } catch (error) {
      console.error("Failed to create workspace:", error);
    } finally {
      setCreating(false);
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Bot className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">AI Hub</h1>
                <p className="text-white/60 text-sm">Welcome back, {user.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/analytics')}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
                style={{ display: 'flex' }}
              >
                <Sparkles className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Workspace</span>
              </button>
              
              <div className="relative group">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors cursor-pointer"
                />
                <div className="absolute right-0 top-12 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-2 min-w-48">
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {workspaces.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-12 max-w-2xl mx-auto">
              <Bot className="w-16 h-16 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4">Create your first workspace</h2>
              <p className="text-white/70 mb-8 text-lg">
                Workspaces help you organize your AI agents and collaborate with your team.
              </p>
              <button
                onClick={() => {
                  console.log("Create Workspace button clicked");
                  setShowCreateModal(true);
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 flex items-center space-x-2 mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-3xl font-bold text-white">Your Workspaces</h2>
                <span className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium border border-purple-500/30">
                  {user.name}
                </span>
              </div>
              <p className="text-white/70">Manage and access your AI agent workspaces</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <div
                  key={workspace.id}
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                  className="group bg-white/5 hover:bg-white/10 backdrop-blur-lg border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <Settings className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {workspace.name}
                  </h3>
                  
                  {workspace.description && (
                    <p className="text-white/70 text-sm mb-4 line-clamp-2">
                      {workspace.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/50">
                      Created {new Date(workspace.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center space-x-1 text-purple-400">
                      <Bot className="w-4 h-4" />
                      <span>Agents</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Create Workspace</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  placeholder="Enter workspace name"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 resize-none"
                  placeholder="Describe your workspace"
                  rows={3}
                />
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
                  disabled={creating || !newWorkspaceName.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
