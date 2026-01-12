import React, { useState } from 'react';
    import { Wand2, Save, User } from 'lucide-react';
    import { CharacterProfile } from '../types';
    import { enhanceCharacterProfile } from '../services/geminiService';
    
    interface CharacterBuilderProps {
      savedCharacters: CharacterProfile[];
      onSaveCharacter: (char: CharacterProfile) => void;
    }
    
    const initialCharacter: CharacterProfile = {
      id: '',
      name: '',
      role: 'Protagonist',
      age: '',
      appearance: '',
      personality: '',
      backstory: '',
      goals: '',
      weaknesses: '',
      relationships: '',
      notes: ''
    };
    
    export const CharacterBuilder: React.FC<CharacterBuilderProps> = ({ savedCharacters, onSaveCharacter }) => {
      const [char, setChar] = useState<CharacterProfile>(initialCharacter);
      const [isGenerating, setIsGenerating] = useState(false);
    
      const handleChange = (field: keyof CharacterProfile, value: string) => {
        setChar(prev => ({ ...prev, [field]: value }));
      };
    
      const handleEnhance = async () => {
        if (!char.name && !char.role) {
          alert("Please provide at least a name or role to start brainstorming.");
          return;
        }
        setIsGenerating(true);
        try {
          const instructions = `Enhance the character '${char.name}' who is a ${char.role}. Fill in missing fields with creative, psychologically deep details suitable for a novel.`;
          const jsonString = await enhanceCharacterProfile(JSON.stringify(char), instructions);
          const data = JSON.parse(jsonString);
          
          setChar(prev => ({
            ...prev,
            ...data,
            notes: (prev.notes + '\n\nAI Suggestions:\n' + (data.suggestions || '')).trim()
          }));
        } catch (e) {
          alert("Failed to generate character details. Check API Key.");
        } finally {
          setIsGenerating(false);
        }
      };
    
      const handleSave = () => {
        const id = char.id || Date.now().toString();
        onSaveCharacter({ ...char, id });
        alert("Character Saved!");
      };
    
      const renderField = (label: string, field: keyof CharacterProfile, rows = 3) => (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase">{label}</label>
          <textarea
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-zinc-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm font-sans placeholder-zinc-700 resize-y"
            rows={rows}
            value={char[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
      );
    
      return (
        <div className="flex-1 h-full overflow-y-auto bg-zinc-900 p-4 md:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-zinc-100">Character Architect</h2>
                <p className="text-zinc-400 text-sm">Define the soul of your story's cast.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleEnhance}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-primary-400 rounded-lg transition-colors font-medium border border-zinc-700"
                >
                  <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Dreaming...' : 'Enhance with AI'}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium shadow-lg shadow-primary-900/20"
                >
                  <Save className="w-4 h-4" />
                  Save Profile
                </button>
              </div>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 mb-4 text-primary-500">
                  <User className="w-5 h-5" />
                  <h3 className="font-semibold">Core Identity</h3>
                </div>
                {renderField('Name', 'name', 1)}
                {renderField('Role / Archetype', 'role', 1)}
                {renderField('Age / Era', 'age', 1)}
                {renderField('Appearance', 'appearance', 4)}
              </div>
    
              {/* Internal World */}
              <div className="space-y-4 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-2 mb-4 text-primary-500">
                  <Wand2 className="w-5 h-5" />
                  <h3 className="font-semibold">Psychology</h3>
                </div>
                {renderField('Personality Traits', 'personality', 3)}
                {renderField('Goals & Motivations', 'goals', 3)}
                {renderField('Fears & Weaknesses', 'weaknesses', 3)}
              </div>
    
              {/* Deep Context - Full Width */}
              <div className="col-span-1 md:col-span-2 space-y-4 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                 {renderField('Backstory / Origin', 'backstory', 6)}
                 {renderField('Relationships', 'relationships', 4)}
                 {renderField('Notes & Misc', 'notes', 4)}
              </div>
            </div>
          </div>
        </div>
      );
    };