import { DialogOverlay, useOverlayVisibility } from './ui/Presentation';
import React, { useState } from 'react';
import { CHARACTER_NAMES_DATABASE, CharacterNameEntry } from '../utils/namesDatabase';
import {
  Users,
  Search,
  Filter,
  Plus,
  Sparkles,
} from 'lucide-react';

interface NamesDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (fullName: string) => void;
}

export const NamesDatabaseModal: React.FC<NamesDatabaseModalProps> = ({
  isOpen,
  onClose,
  onSelectCharacter,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [selectedRole, setSelectedRole] = useState<string>('All');

  const showUI = useOverlayVisibility(isOpen);
  if (!showUI) return null;

  const filteredNames = CHARACTER_NAMES_DATABASE.filter((entry) => {
    const full = `${entry.first} ${entry.last}`.toLowerCase();
    const matchesSearch = full.includes(search.toLowerCase()) || entry.tagline.toLowerCase().includes(search.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || entry.genre === selectedGenre;
    const matchesRole = selectedRole === 'All' || entry.role === selectedRole;
    return matchesSearch && matchesGenre && matchesRole;
  });

  return (
    <DialogOverlay open={isOpen} onClose={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1f1f28] dc-bg-panel border border-white/15 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Character Names & Persona Generator</h3>
              <p className="text-xs text-neutral-400">
                Browse curated cinematic character identities across genres and narrative roles.
              </p>
            </div>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-md">
            ✕
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-3 bg-black/30 border-b border-white/10 flex flex-wrap gap-2.5 items-center text-xs">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search names or tropes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <select
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-neutral-800 border border-white/10 rounded-lg px-2.5 py-1 text-neutral-200 text-xs focus:outline-none"
          >
            <option value="All">All Genres</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Noir">Noir</option>
            <option value="Action">Action</option>
            <option value="Drama">Drama</option>
            <option value="Thriller">Thriller</option>
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-neutral-800 border border-white/10 rounded-lg px-2.5 py-1 text-neutral-200 text-xs focus:outline-none"
          >
            <option value="All">All Roles</option>
            <option value="Protagonist">Protagonist</option>
            <option value="Antagonist">Antagonist</option>
            <option value="Specialist">Specialist</option>
            <option value="Mentor">Mentor</option>
          </select>
        </div>

        {/* Names Grid */}
        <div className="p-5 flex-1 max-h-[55vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {filteredNames.map((item, idx) => (
            <div
              key={idx}
              className="bg-black/30 border border-white/10 hover:border-blue-400/40 rounded-xl p-3 flex flex-col justify-between gap-2 group transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-screenplay font-bold text-sm text-white">
                    {item.first.toUpperCase()} {item.last.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] dc-meta bg-blue-500/20 text-blue-300 font-mono">
                    {item.genre} • {item.role}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                  {item.tagline}
                </p>
              </div>

              <button
                onClick={() => {
                  onSelectCharacter(item.first.toUpperCase());
                  onClose();
                }}
                className="mt-1 py-1 px-2.5 bg-neutral-800 hover:bg-blue-600 hover:text-white text-neutral-300 rounded-lg font-medium text-[11px] flex items-center justify-center gap-1 border border-white/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Use as Character</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#181820] dc-bg-sidebar border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </DialogOverlay>
  );
};
