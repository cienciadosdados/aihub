import { useState, useEffect } from "react";
import { 
  Plus, 
  Globe, 
  FileText, 
  File, 
  Presentation, 
  Youtube, 
  Type, 
  Trash2, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Upload,
  X
} from "lucide-react";
import type { KnowledgeSource, CreateKnowledgeSource } from "@/shared/types";

interface KnowledgeSourceManagerProps {
  agentId: number;
  isOpen: boolean;
  user: any;
  onClose: () => void;
}

export default function KnowledgeSourceManager({ agentId, isOpen, onClose, user }: KnowledgeSourceManagerProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState<Partial<CreateKnowledgeSource>>({
    type: 'url',
    name: '',
    source_url: '',
    content: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen, agentId]);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/agents/${agentId}/knowledge-sources`, {
        headers: {
          "X-User-Data": JSON.stringify(user)
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSources(data);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge sources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.name?.trim()) return;

    setAdding(true);
    try {
      let requestBody;
      let headers: any = {
        "X-User-Data": JSON.stringify(user)
      };

      // Check if this is a file upload
      const isFileType = ['pdf', 'docx'].includes(newSource.type!);
      
      console.log('Adding source:', { 
        name: newSource.name, 
        type: newSource.type, 
        isFileType, 
        hasSelectedFile: !!selectedFile 
      });
      
      if (isFileType && selectedFile) {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', newSource.name!);
        formData.append('type', newSource.type!);
        requestBody = formData;
        console.log('Using FormData for file upload');
      } else {
        // Use JSON for URL/text sources
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify(newSource);
        console.log('Using JSON for non-file source');
      }

      const response = await fetch(`/api/agents/${agentId}/knowledge-sources`, {
        method: "POST",
        headers,
        body: requestBody,
      });

      if (response.ok) {
        const source = await response.json();
        setSources(prev => [source, ...prev]);
        setShowAddModal(false);
        resetNewSource();
      } else {
        const error = await response.text();
        console.error("Failed to add knowledge source:", response.status, error);
        alert(`Error adding source: ${error}`);
      }
    } catch (error) {
      console.error("Failed to add knowledge source:", error);
      alert("Error adding source. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSource = async (sourceId: number) => {
    if (!confirm("Are you sure you want to delete this knowledge source?")) return;

    try {
      const response = await fetch(`/api/knowledge-sources/${sourceId}`, {
        method: "DELETE",
        headers: {
          "X-User-Data": JSON.stringify(user)
        }
      });

      if (response.ok) {
        setSources(prev => prev.filter(s => s.id !== sourceId));
      }
    } catch (error) {
      console.error("Failed to delete knowledge source:", error);
    }
  };

  const resetNewSource = () => {
    setNewSource({
      type: 'url',
      name: '',
      source_url: '',
      content: '',
    });
    setSelectedFile(null);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'url': return <Globe className="w-5 h-5" />;
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'doc': return <File className="w-5 h-5" />;
      case 'docx': return <File className="w-5 h-5" />;
      case 'pptx': return <Presentation className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'text': return <Type className="w-5 h-5" />;
      default: return <File className="w-5 h-5" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'processing': return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'url': return 'from-blue-500 to-cyan-500';
      case 'pdf': return 'from-red-500 to-pink-500';
      case 'doc': return 'from-blue-600 to-indigo-600';
      case 'docx': return 'from-blue-700 to-indigo-700';
      case 'pptx': return 'from-orange-500 to-yellow-500';
      case 'youtube': return 'from-red-600 to-red-500';
      case 'text': return 'from-gray-500 to-slate-500';
      default: return 'from-purple-500 to-blue-500';
    }
  };

  const isFileUploadType = (type: string) => ['pdf', 'docx'].includes(type);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-2xl font-bold text-white">Knowledge Base</h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:scale-105 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Source</span>
            </button>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-pulse text-white/60">Loading knowledge sources...</div>
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                <FileText className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-white mb-2">No knowledge sources yet</h4>
                <p className="text-white/60 mb-6">
                  Add URLs, documents, or YouTube videos to enhance your agent with external knowledge powered by Pinecone vector search.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  Add First Source
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {sources.map((source) => (
                <div
                  key={source.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`bg-gradient-to-r ${getSourceTypeColor(source.type)} w-10 h-10 rounded-lg flex items-center justify-center text-white`}>
                        {getSourceIcon(source.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{source.name}</h4>
                        <div className="flex items-center space-x-2 text-sm text-white/60">
                          <span className="capitalize">{source.type}</span>
                          {getStatusIcon(source.status)}
                          <span className="capitalize">{source.status}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="text-white/40 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {source.source_url && (
                    <div className="text-xs text-white/50 truncate mb-2">
                      {source.source_url}
                    </div>
                  )}

                  {source.status === 'failed' && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
                      Processing failed
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-60 p-4">
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h4 className="text-xl font-bold text-white">Add Knowledge Source</h4>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetNewSource();
                }}
                className="text-white/60 hover:text-white transition-colors text-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Source Type Selection */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">Source Type</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { type: 'url', icon: Globe, label: 'Website URL', color: 'from-blue-500 to-cyan-500' },
                    { type: 'text', icon: Type, label: 'Plain Text', color: 'from-gray-500 to-slate-500' },
                    { type: 'pdf', icon: FileText, label: 'PDF File', color: 'from-red-500 to-pink-500' },
                    { type: 'docx', icon: File, label: 'Word Doc', color: 'from-blue-600 to-indigo-600' },
                    { type: 'youtube', icon: Youtube, label: 'YouTube', color: 'from-red-600 to-red-500' },
                  ].map(({ type, icon: Icon, label, color }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewSource(prev => ({ ...prev, type: type as any }))}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        newSource.type === type
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className={`bg-gradient-to-r ${color} w-8 h-8 rounded-md flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-white text-xs text-center">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  value={newSource.name || ''}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                  placeholder="Give this source a descriptive name"
                  required
                />
              </div>

              {/* Dynamic Content Based on Type */}
              {newSource.type === 'url' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Website URL</label>
                  <input
                    type="url"
                    value={newSource.source_url || ''}
                    onChange={(e) => setNewSource(prev => ({ ...prev, source_url: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                    placeholder="https://example.com"
                    required
                  />
                </div>
              )}

              {newSource.type === 'youtube' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">YouTube URL</label>
                  <input
                    type="url"
                    value={newSource.source_url || ''}
                    onChange={(e) => setNewSource(prev => ({ ...prev, source_url: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500"
                    placeholder="https://youtube.com/watch?v=..."
                    required
                  />
                </div>
              )}

              {newSource.type === 'text' && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Text Content</label>
                  <textarea
                    value={newSource.content || ''}
                    onChange={(e) => setNewSource(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 resize-none"
                    placeholder="Paste your text content here..."
                    rows={6}
                    required
                  />
                </div>
              )}

              {isFileUploadType(newSource.type!) && (
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    {newSource.type === 'pdf' ? 'PDF File' : 'Word Document'}
                  </label>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-6">
                    {selectedFile ? (
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <div className="text-white font-medium">{selectedFile.name}</div>
                        <div className="text-white/60 text-sm">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="mt-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove file
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
                        <div className="text-white/60 mb-2">
                          Choose a {newSource.type?.toUpperCase()} file to upload
                        </div>
                        <input
                          type="file"
                          accept={newSource.type === 'pdf' ? '.pdf' : '.docx'}
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="hidden"
                          id="file-upload"
                        />
                        <label
                          htmlFor="file-upload"
                          className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors"
                        >
                          Select File
                        </label>
                        <div className="text-xs text-white/50 mt-2">
                          {newSource.type === 'pdf' ? 'PDF files with extractable text' : 'Microsoft Word (.docx) documents'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetNewSource();
                  }}
                  className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newSource.name?.trim() || (
                    newSource.type === 'url' && !newSource.source_url?.trim()
                  ) || (
                    newSource.type === 'youtube' && !newSource.source_url?.trim()
                  ) || (
                    newSource.type === 'text' && !newSource.content?.trim()
                  ) || (
                    isFileUploadType(newSource.type!) && !selectedFile
                  )}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                  {adding ? "Processing..." : "Add Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
