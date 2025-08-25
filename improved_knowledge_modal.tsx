// Improved Add Knowledge Source Modal
{showAddModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-60 p-4">
    <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h4 className="text-xl font-bold text-white">Add Knowledge Source</h4>
        <button
          onClick={() => {
            setShowAddModal(false);
            resetNewSource();
            setSelectedFile(null);
          }}
          className="text-white/60 hover:text-white transition-colors text-2xl"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleAddSource} className="p-6 space-y-6">
        {/* Source Type Selection */}
        <div>
          <label className="block text-white/80 text-sm font-medium mb-3">Source Type</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { type: 'url', icon: Globe, label: 'Website/URL', color: 'from-blue-500 to-cyan-500' },
              { type: 'text', icon: Type, label: 'Raw Text', color: 'from-gray-500 to-slate-500' },
              { type: 'pdf', icon: FileText, label: 'PDF File', color: 'from-red-500 to-pink-500' },
              { type: 'youtube', icon: Youtube, label: 'YouTube', color: 'from-red-600 to-red-500' },
            ].map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => setNewSource(prev => ({ ...prev, type }))}
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
            <div className="text-xs text-white/50 mt-1">
              Enter a website URL to scrape content for the knowledge base
            </div>
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
            <div className="text-xs text-white/50 mt-1">
              YouTube video transcript will be extracted automatically
            </div>
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

        {newSource.type === 'pdf' && (
          <div>
            <label className="block text-white/80 text-sm font-medium mb-2">PDF File</label>
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
                  <FileText className="w-8 h-8 text-white/40 mx-auto mb-2" />
                  <div className="text-white/60 mb-2">Choose a PDF file to upload</div>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.json"
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
                    Supports: PDF, TXT, MD, JSON files
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
              setSelectedFile(null);
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
              newSource.type === 'pdf' && !selectedFile
            )}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-300 hover:scale-105"
          >
            {adding ? "Adding..." : "Add Source"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}