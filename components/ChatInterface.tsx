import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, RefreshCw, Zap, Brain, Menu, ChevronDown, Gauge, Sparkles, AlertTriangle } from 'lucide-react';
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

      let generatedTitle: string | null = null;
      if (messages.length === 0) {
        generatedTitle = await generateChatTitle(textToSend, accumulatedText);
      }
      
      onUpdateSession(
        [...newMessages, { ...initialAiMsg, content: accumulatedText }], 
        modelType,
        generatedTitle
      );

    } catch (error: any) {
      console.error(error);
      const errorMsg = error.message || "Unknown error occurred.";
      
      setMessages(prev => {
        const cleanPrev = prev.filter(m => m.content !== '');
        return [...cleanPrev, {
          id: Date.now().toString(),
          role: 'model',
          content: `**System Error:** ${errorMsg}`,
          timestamp: Date.now()
        }];
      });
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
  const isError = messages.length > 0 && messages[messages.length - 1].content.startsWith('**System Error:**');

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      
      {/* Top Bar - Clean */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-4 bg-zinc-900 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onMobileMenuClick} className="md:hidden text-zinc-400 hover:text-white transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="relative group">
             <div className="flex items-center gap-2 hover:bg-zinc-800 rounded-lg px-2 py-1.5 cursor-pointer transition-colors">
               {modelType === ModelType.DEEP_CREATIVE && <Brain className="w-4 h-4 text-primary-400" />}
               {modelType === ModelType.FAST_DRAFT && <Zap className="w-4 h-4 text-yellow-400" />}
               {(modelType === ModelType.QUOTA_SAVER || modelType === ModelType.LITE_SPEED) && <Gauge className="w-4 h-4 text-green-400" />}
               
               <select 
                 value={modelType}
                 onChange={(e) => setModelType(e.target.value as ModelType)}
                 className="bg-transparent text-sm font-medium text-zinc-200 appearance-none focus:outline-none cursor-pointer w-[160px]"
               >
                 <option value={ModelType.DEEP_CREATIVE}>Deep Creative (1.5 Pro)</option>
                 <option value={ModelType.FAST_DRAFT}>Fast Draft (1.5 Flash)</option>
                 <option value={ModelType.QUOTA_SAVER}>Eco Mode (Flash 8B)</option>
               </select>
               <ChevronDown className="w-3 h-3 text-zinc-500 pointer-events-none absolute right-2" />
             </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-0 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent z-10">
        <div className="max-w-3xl mx-auto w-full h-full relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col relative">
                
                {/* 1. Background Text (Centered, Faded) */}
                <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none select-none opacity-[0.03]">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-center px-4 leading-tight text-white">
                        Every story begins with<br/>a single thought...
                    </h1>
                </div>

                {/* 2. Welcome Bubble (Left side) */}
                <div className="z-10 mt-6 md:mt-10 px-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                     <div className="flex w-full justify-start">
                        <div className="max-w-[85%] md:max-w-xl bg-zinc-800 text-zinc-100 px-6 py-5 rounded-3xl rounded-tl-sm shadow-xl border border-white/5">
                             <div className="flex items-center gap-2 mb-3">
                                <div className="p-1 bg-zinc-700 rounded-md">
                                    <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                                </div>
                                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Muse AI</span>
                             </div>
                             <p className="text-[15px] leading-relaxed text-zinc-200 font-sans">
                                {WELCOME_MESSAGE}
                             </p>
                        </div>
                    </div>
                </div>

            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex w-full mb-6 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`w-full ${
                    msg.role === 'user' 
                      ? 'max-w-[85%] bg-[#3f3f46] text-white px-5 py-3 rounded-3xl rounded-br-md shadow-md' 
                      : 'max-w-full text-zinc-100 px-0' // AI full width text
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap font-sans text-base">{msg.content}</p>
                  ) : (
                    <div className={`prose prose-invert prose-zinc max-w-none prose-p:leading-7 prose-headings:font-semibold prose-a:text-blue-400 ${msg.content.includes('System Error') ? 'text-red-300' : ''}`}>
                      {msg.content.includes('System Error') && <AlertTriangle className="w-5 h-5 mb-2 text-red-400 inline-block mr-2" />}
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Regenerate Button */}
          {isLastMessageFromModel && !isLoading && !isError && (
            <div className="flex justify-start mt-2 mb-8">
              <button 
                onClick={handleRegenerate}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate Response
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area - Minimal */}
      <div className="p-4 bg-zinc-900">
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
            placeholder="Send a message..."
            className="w-full bg-zinc-800 border border-transparent text-zinc-100 rounded-2xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none font-sans placeholder-zinc-500"
            rows={1}
            style={{ minHeight: '52px', maxHeight: '200px' }}
            disabled={isLoading}
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 bottom-2 p-1.5 bg-zinc-100 hover:bg-white text-black rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-[11px] text-zinc-500 mt-2">
          MuseAI can make mistakes. Verify important info.
        </p>
      </div>
    </div>
  );
};