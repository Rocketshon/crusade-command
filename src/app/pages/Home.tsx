import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Sword, ScrollText, Plus, X, Pencil, Check, Users } from 'lucide-react';
import { useArmy, type SavedArmy } from '../../lib/ArmyContext';
import { FACTIONS } from '../../lib/factions';

function ArmyListCard({
  army,
  isActive,
  onSwitch,
  onDelete,
  onRename,
}: {
  army: SavedArmy;
  isActive: boolean;
  onSwitch: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(army.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totalPoints = army.units.reduce((sum, u) => sum + u.points_cost, 0);
  const factionMeta = army.factionId ? FACTIONS.find(f => f.id === army.factionId) : null;

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={`relative p-4 bg-[#f5efe6] border rounded-xl transition-all ${
        isActive ? 'border-[#b8860b] ring-2 ring-[#b8860b]/20' : 'border-[#d4c5a9]'
      }`}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirmDelete) {
            onDelete();
          } else {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
          }
        }}
        className="absolute top-2 right-2 p-1 text-[#8b7355] hover:text-red-700 transition-colors"
        aria-label="Delete army"
      >
        <X className="w-4 h-4" />
      </button>

      {confirmDelete && (
        <div className="absolute top-2 right-8 text-xs text-red-700 font-medium">
          Tap again to delete
        </div>
      )}

      {/* Name row */}
      <div className="flex items-center gap-2 mb-2 pr-6">
        {editing ? (
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
              className="flex-1 px-2 py-1 text-sm bg-[#faf6f0] border border-[#d4c5a9] rounded text-[#2c2416] focus:outline-none focus:border-[#b8860b]"
              autoFocus
            />
            <button onClick={handleSaveName} className="text-[#b8860b] hover:text-[#9a7209]">
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onSwitch} className="flex-1 text-left">
              <span className="font-semibold text-[#2c2416] text-sm">{army.name}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(army.name); }}
              className="text-[#8b7355] hover:text-[#b8860b] transition-colors"
              aria-label="Rename army"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Info row */}
      <button onClick={onSwitch} className="w-full text-left">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            army.mode === 'crusade'
              ? 'bg-purple-100 text-purple-800'
              : 'bg-[#b8860b]/15 text-[#b8860b]'
          }`}>
            {army.mode === 'crusade' ? 'Crusade' : 'Standard'}
          </span>

          {/* Faction */}
          {factionMeta && (
            <span className="text-xs text-[#8b7355] flex items-center gap-1">
              <span>{factionMeta.icon}</span>
              {factionMeta.name}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-2 flex items-center gap-3 text-xs text-[#8b7355]">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {army.units.length} unit{army.units.length !== 1 ? 's' : ''}
          </span>
          <span className="font-mono">{totalPoints.toLocaleString()} pts</span>
        </div>
      </button>

      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b8860b] rounded-b-xl" />
      )}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const {
    mode, army, setMode, clearArmy,
    savedArmies, activeArmyId,
    createArmy, deleteArmy, switchArmy, renameArmy,
  } = useArmy();
  const [newArmyName, setNewArmyName] = useState('');
  const [showNewArmyInput, setShowNewArmyInput] = useState(false);

  const hasArmy = army.length > 0 || mode !== null;

  const handleSelectMode = (selected: 'standard' | 'crusade') => {
    setMode(selected);
    navigate('/army');
  };

  const handleCreateArmy = () => {
    if (!newArmyName.trim()) return;
    createArmy(newArmyName.trim());
    setNewArmyName('');
    setShowNewArmyInput(false);
    navigate('/army');
  };

  const handleSwitchArmy = (armyId: string) => {
    switchArmy(armyId);
    navigate('/army');
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] flex flex-col items-center px-4 pt-16 pb-24">
      {/* Header */}
      <h1 className="font-serif text-3xl font-bold text-[#b8860b] tracking-wide text-center">
        BUILD YOUR ARMY
      </h1>
      <p className="mt-2 text-[#8b7355] text-center">
        Choose your mode to begin
      </p>

      {/* Mode Cards */}
      <div className="mt-10 w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Standard Mode */}
        <button
          onClick={() => handleSelectMode('standard')}
          className="group flex flex-col items-center gap-3 p-6 bg-[#f5efe6] border border-[#d4c5a9] rounded-xl
                     transition-all hover:border-[#b8860b] hover:shadow-lg hover:shadow-amber-900/10
                     focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
        >
          <Sword className="w-10 h-10 text-[#b8860b] group-hover:scale-110 transition-transform" />
          <span className="font-serif text-lg font-semibold text-[#2c2416]">Matched Play</span>
          <span className="text-sm text-[#8b7355] text-center leading-snug">
            Build an army list with points limits
          </span>
        </button>

        {/* Crusade Mode */}
        <button
          onClick={() => handleSelectMode('crusade')}
          className="group flex flex-col items-center gap-3 p-6 bg-[#f5efe6] border border-[#d4c5a9] rounded-xl
                     transition-all hover:border-[#b8860b] hover:shadow-lg hover:shadow-amber-900/10
                     focus:outline-none focus:ring-2 focus:ring-[#b8860b]"
        >
          <ScrollText className="w-10 h-10 text-[#b8860b] group-hover:scale-110 transition-transform" />
          <span className="font-serif text-lg font-semibold text-[#2c2416]">Crusade</span>
          <span className="text-sm text-[#8b7355] text-center leading-snug">
            Track your force with XP, honours &amp; scars
          </span>
        </button>
      </div>

      {/* Existing army actions */}
      {hasArmy && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            onClick={() => navigate('/army')}
            className="px-6 py-2.5 bg-[#b8860b] text-[#faf6f0] font-semibold rounded-lg
                       hover:bg-[#9a7209] transition-colors focus:outline-none focus:ring-2 focus:ring-[#b8860b] focus:ring-offset-2"
          >
            Continue Building
          </button>
          <button
            onClick={() => {
              clearArmy();
            }}
            className="text-sm text-[#8b7355] hover:text-[#5c4a32] underline underline-offset-2 transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Saved Army Lists */}
      {savedArmies.length > 0 && (
        <div className="mt-12 w-full max-w-md">
          <h2 className="font-serif text-lg font-bold text-[#2c2416] tracking-wider uppercase mb-4">
            Your Army Lists
          </h2>
          <div className="space-y-3">
            {savedArmies.map(sa => (
              <ArmyListCard
                key={sa.id}
                army={sa}
                isActive={sa.id === activeArmyId}
                onSwitch={() => handleSwitchArmy(sa.id)}
                onDelete={() => deleteArmy(sa.id)}
                onRename={(name) => renameArmy(sa.id, name)}
              />
            ))}

            {/* New Army input */}
            {showNewArmyInput ? (
              <div className="p-4 bg-[#f5efe6] border border-dashed border-[#b8860b] rounded-xl space-y-3">
                <input
                  type="text"
                  value={newArmyName}
                  onChange={(e) => setNewArmyName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateArmy(); }}
                  placeholder="Army name..."
                  className="w-full px-3 py-2 bg-[#faf6f0] border border-[#d4c5a9] rounded-lg text-sm text-[#2c2416]
                             placeholder:text-[#8b7355] focus:outline-none focus:border-[#b8860b] focus:ring-2 focus:ring-[#b8860b]/20"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowNewArmyInput(false); setNewArmyName(''); }}
                    className="flex-1 px-4 py-2 text-sm text-[#8b7355] border border-[#d4c5a9] rounded-lg hover:border-[#b8860b] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateArmy}
                    disabled={!newArmyName.trim()}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-[#faf6f0] bg-[#b8860b] rounded-lg
                               hover:bg-[#9a7209] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewArmyInput(true)}
                className="w-full flex items-center justify-center gap-2 p-4 bg-[#f5efe6] border border-dashed border-[#d4c5a9] rounded-xl
                           text-[#8b7355] hover:border-[#b8860b] hover:text-[#b8860b] transition-all"
              >
                <Plus className="w-5 h-5" />
                <span className="text-sm font-medium">New Army List</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
