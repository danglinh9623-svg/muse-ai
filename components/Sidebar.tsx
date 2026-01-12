import React from 'react';
import { Plus, MessageSquare, Users, Trash2, Download, BookOpen, Menu, X } from 'lucide-react';
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
  
  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      (window as any).deferredPrompt = null;
    } else {
      alert("Installation is mainly supported on Android (Chrome) or Desktop (Chrome/Edge). If on iOS, use 'Add to Home Screen' from the Share menu.");
    }
  };

  const navClass = (view: AppView) => 
    `flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
      currentView === view 
        ? 'bg-primary-600/20 text-primary-500 font-medium' 
        : 'hover:bg-zinc-800 text-zinc-400'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-72">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary-500" />
          <h1 className="text-xl font-serif font-bold text-zinc-100 tracking-tight">MuseAI</h1>
        </div>
        <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-zinc-400">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Nav */}
      <div className="p-3 space-y-2">
        <button 
          onClick={onCreateSession}
          className="w-full flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white p-3 rounded-lg transition-colors font-medium shadow-lg shadow-primary-900/20"
        >
          <Plus className="w-5 h-5" />
          <span>New Story</span>
        </button>

        <div onClick={() => setCurrentView(AppView.CHAT)} className={navClass(AppView.CHAT)}>
          <MessageSquare className="w-5 h-5" />
          <span>Write / Chat</span>
        </div>

        <div onClick={() => setCurrentView(AppView.CHARACTERS)} className={navClass(AppView.CHARACTERS)}>
          <Users className="w-5 h-5" />
          <span>Character Workshop</span>
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-2">Recent Stories</h3>
        {sessions.map((session) => (
          <div 
            key={session.id}
            onClick={() => {
              onSelectSession(session.id);
              setCurrentView(AppView.CHAT);
              if (window.innerWidth < 768) setIsMobileOpen(false);
            }}
            className={`group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm ${
              currentSessionId === session.id ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
            }`}
          >
            <span className="truncate max-w-[180px]">{session.title}</span>
            <button 
              onClick={(e) => onDeleteSession(e, session.id)}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer / Install */}
      <div className="p-4 border-t border-zinc-800">
        <button 
          onClick={handleInstallClick}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-primary-400 transition-colors w-full"
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
      
      {/* Mobile Drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>
    </>
  );
};