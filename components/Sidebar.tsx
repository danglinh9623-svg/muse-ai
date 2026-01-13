import React, { useEffect, useState } from 'react';
import { Plus, MessageSquare, Users, Trash2, Download, BookOpen, Menu, X, Check } from 'lucide-react';
import { AppView, ChatSession } from '../types';

interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (e: React.MouseEvent, id: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    
    if (isInStandaloneMode) {
      setIsInstalled(true);
    }
  }, []);
  
  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    
    if (promptEvent) {
      // Browser supports automatic prompt
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User install choice: ${outcome}`);
      if (outcome === 'accepted') {
        (window as any).deferredPrompt = null;
      }
    } else {
      // Fallback for browsers blocking the prompt or iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isIOS) {
        alert("Hướng dẫn cài trên iOS:\n\n1. Bấm nút Chia sẻ (Share) ở thanh dưới cùng.\n2. Chọn 'Thêm vào Màn hình chính' (Add to Home Screen).");
      } else {
        alert("Hướng dẫn cài trên Android:\n\n1. Bấm vào nút menu (3 chấm ⋮) ở góc trên bên phải trình duyệt.\n2. Chọn 'Cài đặt ứng dụng' (Install App) hoặc 'Thêm vào màn hình chính'.");
      }
    }
  };

  const navClass = (view: AppView) => 
    `flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-sm font-medium ${
      currentView === view 
        ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' 
        : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#09090b] border-r border-zinc-800/60 w-72">
      {/* Header */}
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-900/20">
             <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 leading-tight tracking-tight">MuseAI</h1>
            <p className="text-[10px] text-zinc-500 font-medium tracking-wider uppercase">Pro Writer</p>
          </div>
        </div>
        <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-zinc-400 hover:text-zinc-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Nav */}
      <div className="px-3 pb-4 space-y-1">
        <button 
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 p-2.5 rounded-lg transition-all duration-200 font-semibold text-sm mb-4 shadow hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Story</span>
        </button>

        <div onClick={() => setCurrentView(AppView.CHAT)} className={navClass(AppView.CHAT)}>
          <MessageSquare className="w-4 h-4" />
          <span>Write / Chat</span>
        </div>

        <div onClick={() => setCurrentView(AppView.CHARACTERS)} className={navClass(AppView.CHARACTERS)}>
          <Users className="w-4 h-4" />
          <span>Character Workshop</span>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin scrollbar-thumb-zinc-800">
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-3 px-2 mt-2">Recent Stories</h3>
        {sessions.length === 0 ? (
           <div className="px-2 py-4 text-center">
             <p className="text-xs text-zinc-600 italic">No stories yet.</p>
           </div>
        ) : (
          sessions.map((session) => (
            <div 
              key={session.id}
              onClick={() => {
                onSelectSession(session.id);
                setCurrentView(AppView.CHAT);
                if (window.innerWidth < 768) setIsMobileOpen(false);
              }}
              className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors ${
                currentSessionId === session.id 
                  ? 'bg-zinc-800/80 text-zinc-200 border border-zinc-700/50' 
                  : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
              }`}
            >
              <span className="truncate max-w-[170px]">{session.title}</span>
              <button 
                onClick={(e) => onDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-600 transition-opacity p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer / Install */}
      <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/50">
        {isInstalled ? (
           <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 w-full px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800">
             <Check className="w-4 h-4 text-green-500" />
             <span>Đã cài đặt</span>
           </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            className="flex items-center gap-2 text-xs font-bold transition-all w-full px-3 py-2.5 text-white bg-primary-600 hover:bg-primary-500 rounded-lg shadow-lg shadow-primary-900/20 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Cài App về máy</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
      
      {/* Mobile Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 md:hidden shadow-2xl ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>
    </>
  );
};