import { useState, useEffect } from "react";
import { Settings, Info } from "lucide-react";
import type { AgentKnowledgeSettings, UpdateKnowledgeSettings } from "@/shared/types";

interface KnowledgeSettingsProps {
  agentId: number;
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function KnowledgeSettings({ agentId, isOpen, onClose, user }: KnowledgeSettingsProps) {
  const [, setSettings] = useState<AgentKnowledgeSettings | null>(null);
  const [editingSettings, setEditingSettings] = useState<UpdateKnowledgeSettings>({
    enable_rag: false,
    max_chunks_per_query: 3,
    similarity_threshold: 0.7,
    chunk_size: 1000,
    chunk_overlap: 200,
    chunking_strategy: 'semantic',
    search_strategy: 'hybrid',
    enable_contextual_search: true,
    context_window: 2,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, agentId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-settings`, {
        headers: {
          "X-User-Data": JSON.stringify(user)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setEditingSettings({
          enable_rag: data.enable_rag,
          max_chunks_per_query: data.max_chunks_per_query,
          similarity_threshold: data.similarity_threshold,
          chunk_size: data.chunk_size,
          chunk_overlap: data.chunk_overlap,
          chunking_strategy: data.chunking_strategy || 'semantic',
          search_strategy: data.search_strategy || 'hybrid',
          enable_contextual_search: data.enable_contextual_search !== false,
          context_window: data.context_window || 2,
        });
      }
    } catch (error) {
      console.error("Failed to fetch knowledge settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-settings`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Data": JSON.stringify(user)
        },
        body: JSON.stringify(editingSettings),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        onClose();
      }
    } catch (error) {
      console.error("Failed to save knowledge settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-purple-400" />
            <h3 className="text-2xl font-bold text-white">RAG Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse text-white/60">Loading settings...</div>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Enable RAG Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium">Enable RAG (Retrieval-Augmented Generation)</label>
                <button
                  type="button"
                  onClick={() => setEditingSettings(prev => ({ ...prev, enable_rag: !prev.enable_rag }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editingSettings.enable_rag ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editingSettings.enable_rag ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-white/60 text-sm">
                When enabled, the agent will use knowledge sources to provide more informed responses.
              </p>
            </div>

            {editingSettings.enable_rag && (
              <>
                {/* Max Chunks */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Max Chunks per Query ({editingSettings.max_chunks_per_query})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={editingSettings.max_chunks_per_query}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, max_chunks_per_query: parseInt(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>1 chunk</span>
                    <span>10 chunks</span>
                  </div>
                  <div className="flex items-start space-x-2 mt-2 text-xs text-white/60">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Number of relevant text chunks to include in the agent's context. More chunks provide more information but use more tokens.</span>
                  </div>
                </div>

                {/* Similarity Threshold */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Similarity Threshold ({editingSettings.similarity_threshold.toFixed(2)})
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingSettings.similarity_threshold}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, similarity_threshold: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0.0 (Less relevant)</span>
                    <span>1.0 (Most relevant)</span>
                  </div>
                  <div className="flex items-start space-x-2 mt-2 text-xs text-white/60">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Minimum similarity score for including chunks. Higher values ensure more relevant content but may miss useful information.</span>
                  </div>
                </div>

                {/* Chunk Size */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Chunk Size ({editingSettings.chunk_size} characters)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={editingSettings.chunk_size}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, chunk_size: parseInt(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>100 chars</span>
                    <span>2000 chars</span>
                  </div>
                  <div className="flex items-start space-x-2 mt-2 text-xs text-white/60">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Size of text chunks when processing documents. Smaller chunks are more precise but may lose context.</span>
                  </div>
                </div>

                {/* Chunk Overlap */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Chunk Overlap ({editingSettings.chunk_overlap} characters)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="500"
                    step="50"
                    value={editingSettings.chunk_overlap}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, chunk_overlap: parseInt(e.target.value) }))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0 chars</span>
                    <span>500 chars</span>
                  </div>
                  <div className="flex items-start space-x-2 mt-2 text-xs text-white/60">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>Overlap between adjacent chunks to maintain context continuity. More overlap preserves context but increases processing time.</span>
                  </div>
                </div>

                {/* Chunking Strategy */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">
                    Chunking Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'paragraph', label: 'Paragraph', desc: 'Split by paragraphs, preserves document structure' },
                      { value: 'sentence', label: 'Sentence', desc: 'Split by sentences, more granular control' },
                      { value: 'recursive', label: 'Recursive', desc: 'Adaptive size with semantic boundaries' },
                      { value: 'semantic', label: 'Semantic', desc: 'AI-powered semantic breakpoints' },
                    ].map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditingSettings(prev => ({ ...prev, chunking_strategy: value as any }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          editingSettings.chunking_strategy === value
                            ? 'bg-purple-600/20 border-purple-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-white/60 mt-1">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Strategy */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-3">
                    Search Strategy
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'cosine', label: 'Cosine', desc: 'Vector similarity' },
                      { value: 'euclidean', label: 'Euclidean', desc: 'Distance-based' },
                      { value: 'hybrid', label: 'Hybrid', desc: 'Vector + keywords' },
                    ].map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setEditingSettings(prev => ({ ...prev, search_strategy: value as any }))}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          editingSettings.search_strategy === value
                            ? 'bg-purple-600/20 border-purple-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-white/60 mt-1">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contextual Search Toggle */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-medium">Enable Contextual Search</label>
                    <button
                      type="button"
                      onClick={() => setEditingSettings(prev => ({ ...prev, enable_contextual_search: !prev.enable_contextual_search }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editingSettings.enable_contextual_search ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editingSettings.enable_contextual_search ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-white/60 text-sm">
                    Include surrounding chunks for better context. Improves answer quality but uses more tokens.
                  </p>
                </div>

                {editingSettings.enable_contextual_search && (
                  /* Context Window */
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Context Window ({editingSettings.context_window} chunks on each side)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={editingSettings.context_window}
                      onChange={(e) => setEditingSettings(prev => ({ ...prev, context_window: parseInt(e.target.value) }))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-white/50 mt-1">
                      <span>1 chunk</span>
                      <span>5 chunks</span>
                    </div>
                    <div className="flex items-start space-x-2 mt-2 text-xs text-white/60">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>Number of adjacent chunks to include for context. Higher values provide more context but increase token usage.</span>
                    </div>
                  </div>
                )}

                {/* Vector Database Information */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-200">
                      <div className="font-medium mb-2">Enterprise RAG System powered by Pinecone</div>
                      <div className="space-y-2 text-xs">
                        <p><strong>Vector Database:</strong> Pinecone - Industry-leading vector search with sub-second queries</p>
                        <p><strong>Semantic Chunking:</strong> AI-powered content segmentation with multiple strategies</p>
                        <p><strong>Hybrid Search:</strong> Advanced vector similarity combined with keyword matching</p>
                        <p><strong>Contextual Retrieval:</strong> Intelligent context expansion with surrounding chunks</p>
                        <p><strong>Scalability:</strong> Handles millions of vectors with consistent performance</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
