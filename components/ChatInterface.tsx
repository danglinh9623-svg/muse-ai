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
  onUpdateSession: (messages: Message[], model: ModelType, newTitle?: string | null) => void;
  onMobileMenuClick: () => void;
}

const WELCOME_MESSAGE = "I am Muse, your professional creative partner. I can help you brainstorm complex plots, draft emotive scenes, or develop deep character psychologies. Where shall we begin?";

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
      const aiMsgId = (Date.now() + 1).toString();
      const initialAiMsg: Message = {
        id: aiMsgId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, initialAiMsg]);

      const history = newMessages.map(m => ({ role: m.role, content: m.content }));
      const stream = await generateStoryContentStream(modelType, history.slice(0, -1), textToSend);
      
      let accumulatedText = '';
      let groundingMetadata: any = null;

      for await (const chunk of stream) {
        const chunkText = chunk.text;
        
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

      // Check if this was the first message exchange to generate a title
      let generatedTitle: string | null = null;
      if (messages.length === 0) {
        // We pass the accumulated text (AI response) to the title generator
        generatedTitle = await generateChatTitle(textToSend, accumulatedText);
      }
      
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
        content: '**System Error:** Failed to generate response. This usually happens if the API Key is invalid, or the model is overloaded. \n\nCheck the browser console (F12) for more details.',
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
    onUpdateSession(historyUntilUser, modelType, null);
    handleSend(lastUserMsg.content); 
  };

  const isLastMessageFromModel = messages.length > 0 && messages[messages.length - 1].role === 'model';

  return (
    <div className="flex flex-col h-full bg-zinc-900 relative">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Top Bar */}
      <div className="h-14 border-b border-zinc-800/50 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onMobileMenuClick} className="md:hidden text-zinc-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative group">
             <div className="flex items-center gap-2 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-full px-3 py-1.5 cursor-pointer transition-all">
               {modelType === ModelType.DEEP_CREATIVE && <Brain className="w-3.5 h-3.5 text-primary-400" />}
               {modelType === ModelType.FAST_DRAFT && <Zap className="w-3.5 h-3.5 text-yellow-500" />}
               {(modelType === ModelType.QUOTA_SAVER || modelType === ModelType.LITE_SPEED) && <Gauge className="w-3.5 h-3.5 text-green-500" />}
               
               <select 
                 value={modelType}
                 onChange={(e) => setModelType(e.target.value as ModelType)}
                 className="bg-transparent text-xs font-medium text-zinc-300 appearance-none focus:outline-none cursor-pointer w-[140px] md:w-[160px]"
               >
                 <option value={ModelType.DEEP_CREATIVE}>Deep Creative (Pro 3)</option>
                 <option value={ModelType.FAST_DRAFT}>Fast Draft (Flash 3)</option>
                 <option value={ModelType.QUOTA_SAVER}>Balanced (Flash Latest)</option>
                 <option value={ModelType.LITE_SPEED}>Speed (Lite Latest)</option>
               </select>
               <ChevronDown className="w-3 h-3 text-zinc-500 pointer-events-none absolute right-2.5" />
             </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent z-10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-10 px-4 min-h-[60vh]">
            
            {/* Logo / Hero Area */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-1000"></div>
              <Sparkles className="w-16 h-16 text-zinc-200 relative z-10 drop-shadow-2xl" />
            </div>

            {/* Greeting */}
            <div className="max-w-2xl text-center space-y-4">
               <h2 className="text-3xl md:text-4xl font-serif font-medium text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 tracking-tight">
                 Unleash your imagination
               </h2>
               <p className="text-zinc-400 text-lg leading-relaxed max-w-lg mx-auto">
                 {WELCOME_MESSAGE}
               </p>
            </div>

            {/* Action Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              {[
                "Develop a villain's backstory",
                "Describe a cyberpunk city in rain",
                "Write a dialogue with subtext",
                "Brainstorm plot twists for a mystery"
              ].map((prompt, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSend(prompt)}
                  className="px-4 py-3 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800/60 hover:border-zinc-700 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 text-left transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div 
                className={`max-w-[90%] md:max-w-3xl p-5 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#3f3f46] text-white rounded-2xl rounded-tr-sm' 
                    : 'bg-transparent text-zinc-300 pl-0 md:pl-2'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans text-sm md:text-base leading-relaxed">{msg.content}</p>
                ) : (
                  <div className="prose prose-invert prose-zinc max-w-none prose-p:leading-7 prose-headings:font-sans prose-headings:font-semibold prose-a:text-primary-400 prose-blockquote:border-l-primary-500 prose-blockquote:bg-zinc-800/30 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {/* Regenerate Button - Placed at bottom */}
        {isLastMessageFromModel && !isLoading && (
          <div className="flex justify-start md:pl-2">
            <button 
              onClick={handleRegenerate}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800/50"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate Response
            </button>
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-transparent z-20">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500/20 to-indigo-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Write something magical..."
            className="w-full bg-[#18181b] border border-zinc-800 text-zinc-100 rounded-xl pl-5 pr-12 py-4 shadow-2xl focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none font-sans relative z-10 placeholder-zinc-500"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '200px' }}
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-3 bottom-3 p-2 bg-zinc-100 hover:bg-white text-black rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all z-20 shadow-lg hover:shadow-xl"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-600 mt-3 font-medium">
          MuseAI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};