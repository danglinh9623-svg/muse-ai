import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { CharacterBuilder } from './components/CharacterBuilder';
import { AppView, ChatSession, CharacterProfile, Message, ModelType } from './types';
import { Menu } from 'lucide-react';

// Helper for local storage with error handling
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    console.error(`Failed to load ${key} from storage`, e);
    return fallback;
  }
};

const App: React.FC = () => {
  // --- State ---
  const [currentView, setCurrentView] = useState<AppView>(AppView.CHAT);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Data
  const [sessions, setSessions] = useState<ChatSession[]>(() => 
    loadFromStorage('muse_sessions', [])
  );
  const [characters, setCharacters] = useState<CharacterProfile[]>(() => 
    loadFromStorage('muse_characters', [])
  );
  
  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [modelType, setModelType] = useState<ModelType>(ModelType.DEEP_CREATIVE);

  // --- Effects ---
  
  // Persist sessions
  useEffect(() => {
    localStorage.setItem('muse_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Persist characters
  useEffect(() => {
    localStorage.setItem('muse_characters', JSON.stringify(characters));
  }, [characters]);

  // Load active session messages when ID changes
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        setActiveMessages(session.messages);
        setModelType(session.modelUsed);
      }
    } else {
      setActiveMessages([]);
    }
  }, [currentSessionId, sessions]); 

  // --- Handlers ---

  const handleCreateSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Story',
      messages: [],
      lastUpdated: Date.now(),
      modelUsed: ModelType.DEEP_CREATIVE
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setActiveMessages([]);
    setCurrentView(AppView.CHAT);
    if (window.innerWidth < 768) setIsMobileOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const handleUpdateSession = (newMessages: Message[], usedModel: ModelType, newTitle?: string | null) => {
    if (!currentSessionId) return;
    
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        
        // Smart Title Logic:
        // 1. If AI provided a title (newTitle is string), use it.
        // 2. If title is still default "New Story" AND we have messages, but AI failed (newTitle is null), 
        //    truncate the first user message.
        // 3. Otherwise keep existing title.
        
        let title = s.title;
        
        if (newTitle) {
          title = newTitle;
        } else if (s.title === 'New Story' && newMessages.length > 0 && newMessages[0].role === 'user') {
          const userText = newMessages[0].content;
          title = userText.length > 30 ? userText.slice(0, 30) + '...' : userText;
        }
        
        return {
          ...s,
          messages: newMessages,
          lastUpdated: Date.now(),
          modelUsed: usedModel,
          title
        };
      }
      return s;
    }));
    setActiveMessages(newMessages); 
  };

  const handleSaveCharacter = (char: CharacterProfile) => {
    setCharacters(prev => {
      const exists = prev.findIndex(c => c.id === char.id);
      if (exists !== -1) {
        const updated = [...prev];
        updated[exists] = char;
        return updated;
      }
      return [...prev, char];
    });
  };

  // --- Render ---

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-100 font-sans">
      <Sidebar 
        currentView={currentView}
        setCurrentView={setCurrentView}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      
      <main className="flex-1 h-full relative bg-zinc-900 overflow-hidden shadow-2xl shadow-black z-0">
        {currentView === AppView.CHAT ? (
          <ChatInterface 
            messages={activeMessages}
            setMessages={setActiveMessages}
            modelType={modelType}
            setModelType={setModelType}
            currentSessionId={currentSessionId}
            onUpdateSession={handleUpdateSession}
            onMobileMenuClick={() => setIsMobileOpen(true)}
          />
        ) : (
          <div className="h-full flex flex-col bg-zinc-900">
             <div className="md:hidden h-16 border-b border-zinc-800/50 flex items-center px-4 bg-zinc-900">
                <button onClick={() => setIsMobileOpen(true)} className="text-zinc-400">
                  <Menu className="w-6 h-6" />
                </button>
             </div>
            <CharacterBuilder 
              savedCharacters={characters}
              onSaveCharacter={handleSaveCharacter}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;