import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bot, ArrowLeft, LogOut, User, Settings as SettingsIcon, Save, Edit3 } from 'lucide-react';
import { useAuth } from '@/react-app/App';

interface UserProfile {
  name: string;
  email: string;
}

interface WorkspaceSettings {
  id: number;
  name: string;
  description: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // User profile state
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || ''
  });
  
  // Workspaces state
  const [workspaces, setWorkspaces] = useState<WorkspaceSettings[]>([]);
  const [editingWorkspace, setEditingWorkspace] = useState<number | null>(null);
  const [workspaceEdits, setWorkspaceEdits] = useState<{[key: number]: WorkspaceSettings}>({});

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspaces', {
        headers: {
          'X-User-Data': JSON.stringify(user)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      // TODO: Implementar endpoint para atualizar perfil do usuário
      console.log('Saving user profile:', userProfile);
      // Simular sucesso por enquanto
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditWorkspace = (workspace: WorkspaceSettings) => {
    setEditingWorkspace(workspace.id);
    setWorkspaceEdits({
      ...workspaceEdits,
      [workspace.id]: { ...workspace }
    });
  };

  const handleSaveWorkspace = async (workspaceId: number) => {
    try {
      setSaving(true);
      const editedWorkspace = workspaceEdits[workspaceId];
      
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Data': JSON.stringify(user)
        },
        body: JSON.stringify({
          name: editedWorkspace.name,
          description: editedWorkspace.description
        })
      });

      if (response.ok) {
        setWorkspaces(workspaces.map(w => 
          w.id === workspaceId ? editedWorkspace : w
        ));
        setEditingWorkspace(null);
        delete workspaceEdits[workspaceId];
      }
    } catch (error) {
      console.error('Failed to save workspace:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (workspaceId: number) => {
    setEditingWorkspace(null);
    const newEdits = { ...workspaceEdits };
    delete newEdits[workspaceId];
    setWorkspaceEdits(newEdits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-white hover:text-purple-300 transition-colors flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              <Bot className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">⚙️ Configurações</h1>
                <p className="text-white/60 text-sm">Gerencie seu perfil e workspaces</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=fff`}
                  alt="Profile"
                  className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors cursor-pointer"
                />
                <div className="absolute right-0 top-12 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-2 min-w-48">
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
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* User Profile Section */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <User className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Perfil do Usuário</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Nome
              </label>
              <input
                type="text"
                value={userProfile.name}
                onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                placeholder="Seu nome"
              />
            </div>
            
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={userProfile.email}
                onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                placeholder="seu@email.com"
              />
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Perfil'}</span>
            </button>
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Seus Workspaces</h2>
          </div>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-white/60">Carregando workspaces...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  {editingWorkspace === workspace.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Nome do Workspace
                        </label>
                        <input
                          type="text"
                          value={workspaceEdits[workspace.id]?.name || ''}
                          onChange={(e) => setWorkspaceEdits({
                            ...workspaceEdits,
                            [workspace.id]: {
                              ...workspaceEdits[workspace.id],
                              name: e.target.value
                            }
                          })}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Descrição
                        </label>
                        <textarea
                          value={workspaceEdits[workspace.id]?.description || ''}
                          onChange={(e) => setWorkspaceEdits({
                            ...workspaceEdits,
                            [workspace.id]: {
                              ...workspaceEdits[workspace.id],
                              description: e.target.value
                            }
                          })}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 resize-none"
                          rows={2}
                        />
                      </div>
                      
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleSaveWorkspace(workspace.id)}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Salvando...' : 'Salvar'}</span>
                        </button>
                        <button
                          onClick={() => handleCancelEdit(workspace.id)}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-white">{workspace.name}</h3>
                        {workspace.description && (
                          <p className="text-white/70 text-sm mt-1">{workspace.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditWorkspace(workspace)}
                        className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
