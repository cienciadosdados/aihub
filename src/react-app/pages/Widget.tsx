import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router";
import { Send, Bot, User, Minimize2, Maximize2, Sparkles } from "lucide-react";
import type { Agent } from "@/shared/types";

export default function WidgetPage() {
  const [searchParams] = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Widget configuration from URL params
  const config = {
    agentId: searchParams.get('agentId'),
    theme: searchParams.get('theme') || 'light',
    position: searchParams.get('position') || 'bottom-right',
    primaryColor: `#${searchParams.get('primaryColor') || '8b5cf6'}`,
    size: searchParams.get('size') || 'medium',
    showName: searchParams.get('showName') === 'true',
    showAvatar: searchParams.get('showAvatar') === 'true',
    welcomeMessage: searchParams.get('welcome') || 'Hi! How can I help you today?',
    placeholder: searchParams.get('placeholder') || 'Type your message...',
    height: searchParams.get('height') || '500px',
    width: searchParams.get('width') || '400px',
  };

  useEffect(() => {
    setIsPreview(searchParams.get('preview') === 'true');
    if (config.agentId) {
      fetchAgent();
    }
  }, [config.agentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when component mounts
    if (config.welcomeMessage && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: config.welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [config.welcomeMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchAgent = async () => {
    try {
      // In a real implementation, you'd need a public endpoint to get agent info
      // For now, we'll create a simplified version
      const response = await fetch(`/api/widget/agents/${config.agentId}`);
      if (response.ok) {
        const agentData = await response.json();
        setAgent(agentData);
      }
    } catch (error) {
      console.error('Failed to fetch agent:', error);
      // Create a fallback agent for preview
      setAgent({
        id: parseInt(config.agentId || '1'),
        name: 'AI Assistant',
        description: 'Your helpful AI assistant',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1000,
        is_active: true,
        workspace_id: 1,
        created_by_user_id: 'preview',
        system_prompt: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading || !agent) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    // Add user message
    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      let response;
      
      if (isPreview) {
        // Mock response for preview mode
        await new Promise(resolve => setTimeout(resolve, 1500));
        response = {
          output: `Thank you for your message: "${userMessage}". This is a preview of how your AI agent will respond. In the live version, I would provide intelligent responses based on the agent's configuration and knowledge base.`
        };
      } else {
        // Real API call
        const apiResponse = await fetch(`/api/widget/agents/${config.agentId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userMessage }),
        });

        if (!apiResponse.ok) {
          throw new Error('Failed to get response from agent');
        }

        response = await apiResponse.json();
      }

      // Add assistant message
      const assistantMessage = {
        role: 'assistant' as const,
        content: response.output,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = config.theme === 'dark';
  const bgColor = isDark ? 'bg-gray-900' : 'bg-white';
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';

  if (!agent) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className="animate-pulse">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen ${bgColor} ${textColor} flex flex-col font-sans`}>
      {/* Header */}
      <div className={`${borderColor} border-b px-4 py-3 flex items-center justify-between bg-gradient-to-r`} 
           style={{ backgroundImage: `linear-gradient(135deg, ${config.primaryColor}20, ${config.primaryColor}10)` }}>
        <div className="flex items-center space-x-3">
          {config.showAvatar && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white" 
                 style={{ backgroundColor: config.primaryColor }}>
              <Bot className="w-4 h-4" />
            </div>
          )}
          {config.showName && (
            <div>
              <div className="font-semibold">{agent.name}</div>
              {agent.description && (
                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {agent.description}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isPreview && (
            <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/30">
              Preview
            </span>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className={`p-1 rounded hover:bg-gray-200 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="flex items-start space-x-2 max-w-[80%]">
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white mt-1" 
                         style={{ backgroundColor: config.primaryColor }}>
                      <Bot className="w-3 h-3" />
                    </div>
                  )}
                  
                  <div className={`px-3 py-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'text-white rounded-br-sm' 
                      : `${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-bl-sm`
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: config.primaryColor } : {}}>
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-1 ${
                      msg.role === 'user' 
                        ? 'text-white/70' 
                        : isDark ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                      isDark ? 'bg-gray-700' : 'bg-gray-300'
                    }`}>
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white" 
                       style={{ backgroundColor: config.primaryColor }}>
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className={`px-3 py-2 rounded-lg rounded-bl-sm ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`${borderColor} border-t p-4`}>
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={config.placeholder}
                disabled={isLoading}
                className={`flex-1 px-3 py-2 rounded-lg border ${borderColor} ${bgColor} ${textColor} focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50`}
                style={{ outline: `2px solid ${config.primaryColor}50` }}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                style={{ backgroundColor: config.primaryColor }}
              >
                {isLoading ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
