import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, RefreshCw, Zap, Brain, Menu, ChevronDown, Gauge, Sparkles } from 'lucide-react';
import { Message, ModelType } from '../types';
import { generateStoryContentStream, generateChatTitle } from '../services/geminiService';

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  modelType: ModelType;
  setModelType: (type: ModelType) => void;
  currentSessionId: string | null;
  onUpdateSession: (messages: Message[], model: ModelType, newTitle?: string) => void;
  onMobileMenuClick: () => void;
}

const WELCOME_MESSAGE = "Hello! I'm Muse, your creative writing partner. I'm here to help you brainstorm ideas, draft chapters, or deepen your characters. What are we writing today?";

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  setMessages,
  modelType,
  setModelType,
  currentSessionId,
  onUpdateSession,
  onMobileMenuClick
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || !currentSessionId) return;

    if (!overrideInput) setInput('');

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, newUserMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Placeholder for AI response
      const aiMsgId = (Date.now() + 1).toString();
      const initialAiMsg: Message = {
        id: aiMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, initialAiMsg]);

      // Stream handling
      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const stream = await generateStoryContentStream(modelType, history.slice(0, -1), textToSend);
      
      let accumulatedText = '';
      let groundingMetadata: any = null;

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        
        // Capture grounding metadata if present
        if (chunk.candidates?.[0]?.groundingMetadata) {
          groundingMetadata = chunk.candidates[0].groundingMetadata;
        }

        if (chunkText) {
          accumulatedText += chunkText;
          setMessages(prev => prev.map(msg => 
            msg.id === aiMsgId ? { ...msg, content: accumulatedText } : msg
          ));
        }
      }

      // Append citations if available
      if (groundingMetadata?.groundingChunks) {
        const sources = groundingMetadata.groundingChunks
          .map((c: any) => c.web?.uri)
          .filter((uri: string) => uri);
        
        if (sources.length > 0) {
           const uniqueSources = Array.from(new Set(sources));
           accumulatedText += `\n\n**Sources:**\n${uniqueSources.map((s) => `- ${s}`).join('\n')}`;
           setMessages(prev => prev.map(msg => 
             msg.id === aiMsgId ? { ...msg, content: accumulatedText } : msg
           ));
        }
      }

      // -- Smart Features: Auto-Titling --
      // If this is the very first turn (messages was empty, so newMessages has 1 item), generate a title
      let generatedTitle: string | undefined = undefined;
      if (messages.length === 0) {
        // Run in background, don't block
        generatedTitle = await generateChatTitle(textToSend, accumulatedText);
      }
      
      // Final save
      onUpdateSession(
        [...newMessages, { ...initialAiMsg, content: accumulatedText }], 
        modelType,
        generatedTitle
      );

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: '**Error:** Failed to generate response. Please check your API Key or quota.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0 || isLoading) return;
    
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    
    if (lastUserIndex === -1) return;

    const lastUserMsg = messages[lastUserIndex];
    
    const historyUntilUser = messages.slice(0, lastUserIndex); 
    setMessages(historyUntilUser); 
    
    onUpdateSession(historyUntilUser, modelType);
    handleSend(lastUserMsg.content); 
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 relative">
      {/* Top Bar */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={onMobileMenuClick} className="md:hidden text-zinc-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="relative group">
             <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-zinc-800 transition-colors">
               {modelType === ModelType.DEEP_CREATIVE && <Brain className="w-4 h-4 text-primary-500" />}
               {modelType === ModelType.FAST_DRAFT && <Zap className="w-4 h-4 text-yellow-500" />}
               {(modelType === ModelType.QUOTA_SAVER || modelType === ModelType.LITE_SPEED) && <Gauge className="w-4 h-4 text-green-500" />}
               
               <select 
                 value={modelType}
                 onChange={(e) => setModelType(e.target.value as ModelType)}
                 className="bg-transparent text-sm font-medium text-zinc-200 appearance-none focus:outline-none cursor-pointer w-[140px] md:w-[180px]"
               >
                 <option value={ModelType.DEEP_CREATIVE}>Deep Creative (Pro 3)</option>
                 <option value={ModelType.FAST_DRAFT}>Fast Draft (Flash 3)</option>
                 <option value={ModelType.QUOTA_SAVER}>Balanced (Flash Latest)</option>
                 <option value={ModelType.LITE_SPEED}>Speed (Lite Latest)</option>
               </select>
               <ChevronDown className="w-4 h-4 text-zinc-500 pointer-events-none absolute right-2" />
             </div>
          </div>
        </div>
        
        {messages.length > 0 && (
           <button 
             onClick={handleRegenerate}
             disabled={isLoading}
             className="text-zinc-500 hover:text-primary-400 transition-colors p-2 rounded-full hover:bg-zinc-800 flex-shrink-0 ml-2"
             title="Regenerate Last Response"
           >
             <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
           </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 px-4">
            
            {/* Logo / Icon Area */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full"></div>
              <Sparkles className="w-16 h-16 text-primary-500 relative z-10 opacity-90" />
            </div>

            {/* Greeting "Message Bubble" - Left Aligned */}
            <div className="w-full flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-2xl">
               <div className="bg-zinc-800/80 border border-zinc-700/50 p-5 rounded-2xl rounded-tl-none shadow-xl relative ml-4">
                  {/* Small avatar indicator */}
                  <div className="absolute -left-4 top-0 w-3 h-3 bg-primary-500 rounded-full mt-1"></div>
                  <p className="text-zinc-200 font-serif leading-relaxed text-lg">
                    {WELCOME_MESSAGE}
                  </p>
               </div>
            </div>

            {/* Quote & Tip Section */}
            <div className="text-center space-y-4 max-w-lg">
              <p className="text-xl font-serif italic text-zinc-600">
                "Every story begins with a single thought..."
              </p>
              
              <div className="inline-block bg-zinc-950/80 border border-zinc-800 rounded-full px-4 py-2">
                 <p className="text-xs text-zinc-500 font-sans">
                  <span className="font-semibold text-primary-500/80">Tip:</span> Switch to "Quota Saver" or "Speed" modes if you run into rate limits.
                </p>
              </div>
            </div>

          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] md:max-w-2xl p-4 md:p-6 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 rounded-br-sm' 
                    : 'bg-transparent border border-zinc-800 text-zinc-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans text-sm md:text-base">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-sm md:prose-base font-serif max-w-none prose-p:leading-relaxed prose-headings:font-sans prose-a:text-primary-400">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe a scene, ask for a plot twist, or paste a draft..."
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl pl-4 pr-12 py-4 shadow-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 resize-none font-sans"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '200px' }}
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 p-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-2 font-mono">
          Gemini may produce inaccurate information. Stories are fictional.
        </p>
      </div>
    </div>
  );
};