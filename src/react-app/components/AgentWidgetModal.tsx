import { useState, useEffect } from "react";
import { Copy, ExternalLink, Palette, Monitor, Smartphone, Code, X, Check } from "lucide-react";
import type { Agent } from "@/shared/types";

interface AgentWidgetModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}

export default function AgentWidgetModal({ agent, isOpen, onClose }: AgentWidgetModalProps) {
  const [widgetConfig, setWidgetConfig] = useState({
    theme: 'light',
    position: 'bottom-right',
    primaryColor: '#8b5cf6',
    size: 'medium',
    showAgentName: true,
    showAgentAvatar: true,
    welcomeMessage: `Hi! I'm ${agent.name}. How can I help you today?`,
    placeholder: 'Type your message...',
    height: '500px',
    width: '400px',
  });
  
  const [widgetUrl, setWidgetUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (isOpen) {
      generateWidgetCode();
    }
  }, [isOpen, widgetConfig, agent.id]);

  const generateWidgetCode = () => {
    const baseUrl = window.location.origin;
    const configParams = new URLSearchParams({
      agentId: agent.id.toString(),
      theme: widgetConfig.theme,
      position: widgetConfig.position,
      primaryColor: widgetConfig.primaryColor.replace('#', ''),
      size: widgetConfig.size,
      showName: widgetConfig.showAgentName.toString(),
      showAvatar: widgetConfig.showAgentAvatar.toString(),
      welcome: widgetConfig.welcomeMessage,
      placeholder: widgetConfig.placeholder,
      height: widgetConfig.height,
      width: widgetConfig.width,
    });

    const url = `${baseUrl}/widget?${configParams.toString()}`;
    setWidgetUrl(url);

    // Generate embed code
    const iframeCode = `<!-- AI Agent Widget - ${agent.name} -->
<div id="ai-agent-widget-${agent.id}"></div>
<script>
  (function() {
    var widget = document.createElement('iframe');
    widget.src = '${url}';
    widget.style.border = 'none';
    widget.style.position = 'fixed';
    widget.style.zIndex = '9999';
    widget.style.borderRadius = '12px';
    widget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
    
    // Position based on config
    ${widgetConfig.position === 'bottom-right' ? 
      `widget.style.bottom = '20px'; widget.style.right = '20px';` :
      widgetConfig.position === 'bottom-left' ? 
      `widget.style.bottom = '20px'; widget.style.left = '20px';` :
      widgetConfig.position === 'top-right' ? 
      `widget.style.top = '20px'; widget.style.right = '20px';` :
      `widget.style.top = '20px'; widget.style.left = '20px';`
    }
    
    // Size
    widget.style.width = '${widgetConfig.width}';
    widget.style.height = '${widgetConfig.height}';
    
    // Mobile responsive
    if (window.innerWidth < 768) {
      widget.style.width = '90vw';
      widget.style.height = '70vh';
      widget.style.bottom = '10px';
      widget.style.right = '5vw';
      widget.style.left = '5vw';
    }
    
    document.getElementById('ai-agent-widget-${agent.id}').appendChild(widget);
  })();
</script>`;

    setEmbedCode(iframeCode);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewUrl = `${widgetUrl}&preview=true`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex">
        {/* Configuration Panel */}
        <div className="w-1/2 p-6 border-r border-white/10 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Widget Embedding</h3>
              <p className="text-white/70">Configure and embed {agent.name} in your website</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Theme */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Theme</label>
              <div className="grid grid-cols-2 gap-3">
                {['light', 'dark'].map(theme => (
                  <button
                    key={theme}
                    onClick={() => setWidgetConfig(prev => ({ ...prev, theme }))}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      widgetConfig.theme === theme
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <Palette className="w-5 h-5 text-white mx-auto mb-1" />
                    <div className="text-white text-sm capitalize">{theme}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Position</label>
              <select
                value={widgetConfig.position}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, position: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </div>

            {/* Primary Color */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Primary Color</label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded-lg border border-white/20 bg-transparent"
                />
                <input
                  type="text"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => setWidgetConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Size</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { size: 'small', width: '350px', height: '400px' },
                  { size: 'medium', width: '400px', height: '500px' },
                  { size: 'large', width: '450px', height: '600px' }
                ].map(({ size, width, height }) => (
                  <button
                    key={size}
                    onClick={() => setWidgetConfig(prev => ({ ...prev, size, width, height }))}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      widgetConfig.size === size
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-white text-sm capitalize">{size}</div>
                    <div className="text-white/60 text-xs">{width} × {height}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Welcome Message</label>
              <textarea
                value={widgetConfig.welcomeMessage}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-purple-500"
                rows={3}
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Input Placeholder</label>
              <input
                type="text"
                value={widgetConfig.placeholder}
                onChange={(e) => setWidgetConfig(prev => ({ ...prev, placeholder: e.target.value }))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Display Options */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-3">Display Options</label>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={widgetConfig.showAgentName}
                    onChange={(e) => setWidgetConfig(prev => ({ ...prev, showAgentName: e.target.checked }))}
                    className="accent-purple-500"
                  />
                  <span className="text-white/80">Show Agent Name</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={widgetConfig.showAgentAvatar}
                    onChange={(e) => setWidgetConfig(prev => ({ ...prev, showAgentAvatar: e.target.checked }))}
                    className="accent-purple-500"
                  />
                  <span className="text-white/80">Show Agent Avatar</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Preview and Code Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Preview Controls */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-white">Preview & Code</h4>
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode('desktop')}
                  className={`p-2 rounded-md transition-colors ${
                    previewMode === 'desktop' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewMode('mobile')}
                  className={`p-2 rounded-md transition-colors ${
                    previewMode === 'mobile' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => window.open(previewUrl, '_blank')}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Test Widget</span>
              </button>
              <button
                onClick={() => copyToClipboard(widgetUrl)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>Copy URL</span>
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white/80 text-sm font-medium flex items-center space-x-2">
                  <Code className="w-4 h-4" />
                  <span>Embed Code</span>
                </label>
                <button
                  onClick={() => copyToClipboard(embedCode)}
                  className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                    copied 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-white/10 hover:bg-white/20 border border-white/20 text-white/80'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              
              <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm text-white/90 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{embedCode}</pre>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-blue-300 font-medium mb-2">How to Use:</h5>
              <ol className="text-white/70 text-sm space-y-1 list-decimal list-inside">
                <li>Copy the embed code above</li>
                <li>Paste it into your HTML page where you want the widget</li>
                <li>The widget will appear automatically when the page loads</li>
                <li>Users can chat with your AI agent directly on your site</li>
              </ol>
            </div>

            <div className="mt-4 bg-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
              <h5 className="text-yellow-300 font-medium mb-2">Features:</h5>
              <ul className="text-white/70 text-sm space-y-1 list-disc list-inside">
                <li>Fully responsive design</li>
                <li>Customizable colors and themes</li>
                <li>Mobile-friendly interface</li>
                <li>Secure communication with your AI agent</li>
                <li>No external dependencies required</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
