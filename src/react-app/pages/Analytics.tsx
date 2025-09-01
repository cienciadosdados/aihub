import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bot, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/react-app/App';

interface AnalyticsData {
  total_conversations: number;
  total_agents: number;
  total_workspaces: number;
  total_documents: number;
  avg_response_time: number;
  avg_tokens_per_conversation: number;
  success_rate: number;
  conversations_last_7d: number;
  documents_uploaded_last_7d: number;
  active_users_last_7d: number;
  top_agents: Array<{
    name: string;
    conversations: number;
    avg_response_time: number;
  }>;
  recent_errors: Array<{
    timestamp: string;
    error: string;
    agent_id: number;
  }>;
}

export default function Analytics() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
      const response = await fetch('/api/analytics', {
        headers: {
          'X-User-Data': JSON.stringify(user),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Analytics fetch error:', response.status, errorText);
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const analytics = await response.json();
      setData(analytics);
    } catch (err) {
      console.error('Analytics error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Erro ao carregar analytics</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

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
                <h1 className="text-2xl font-bold text-white">📊 Analytics</h1>
                <p className="text-white/60 text-sm">Métricas do sistema</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={fetchAnalytics}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
              >
                <span>🔄 Atualizar</span>
              </button>
              
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
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">💬 Conversas</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.total_conversations.toLocaleString()}</div>
              <p className="text-xs text-white/60">+{data.conversations_last_7d} últimos 7 dias</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">🤖 Agentes</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.total_agents.toLocaleString()}</div>
              <p className="text-xs text-white/60">Ativos no sistema</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">🏢 Workspaces</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.total_workspaces.toLocaleString()}</div>
              <p className="text-xs text-white/60">Projetos criados</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">📄 Documentos</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.total_documents.toLocaleString()}</div>
              <p className="text-xs text-white/60">+{data.documents_uploaded_last_7d} últimos 7 dias</p>
            </div>
          </div>
        </div>

        {/* Métricas de Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">⚡ Tempo de Resposta</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.avg_response_time.toFixed(0)}ms</div>
              <p className="text-xs text-white/60">Média últimos 30 dias</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">🔢 Tokens por Conversa</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{data.avg_tokens_per_conversation.toFixed(0)}</div>
              <p className="text-xs text-white/60">Média de consumo</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-2">
              <h3 className="text-sm font-medium text-white/80">✅ Taxa de Sucesso</h3>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{(data.success_rate * 100).toFixed(1)}%</div>
              <p className="text-xs text-white/60">Conversas bem-sucedidas</p>
            </div>
          </div>
        </div>

        {/* Top Agentes */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
          <div className="pb-4">
            <h3 className="text-lg font-semibold text-white">👑 Top Agentes (30 dias)</h3>
          </div>
          <div className="space-y-4">
            {data.top_agents.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-purple-300">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="text-sm text-white/60">{agent.conversations} conversas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{agent.avg_response_time.toFixed(0)}ms</p>
                  <p className="text-xs text-white/60">tempo médio</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Erros Recentes */}
        {data.recent_errors.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-6">
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-white">⚠️ Erros Recentes</h3>
            </div>
            <div className="space-y-3">
              {data.recent_errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-300">{error.error}</p>
                      <p className="text-xs text-red-400 mt-1">Agent ID: {error.agent_id}</p>
                    </div>
                    <span className="text-xs text-red-400">
                      {new Date(error.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
