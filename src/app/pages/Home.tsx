import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sword, ScrollText, Plus, X, Pencil, Check, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useArmy, type SavedArmy } from '../../lib/ArmyContext';
import { FACTIONS } from '../../lib/factions';
import { getArtPath, getFactionArt } from '../../lib/artMap';
import { getActiveEdition, EDITIONS, isEditionDataAvailable } from '../../lib/editionManager';

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
  const confirmDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current); };
  }, []);
  const totalPoints = army.units.reduce((sum, u) => sum + u.points_cost, 0);
  const factionMeta = army.factionId ? FACTIONS.find(f => f.id === army.factionId) : null;
  const artSrc = army.factionId ? getFactionArt(army.factionId) : getArtPath('battle-scene.jpg');

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setEditing(false);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-all ${
        isActive ? 'ring-2 ring-[var(--accent-gold)]/40 border-[var(--accent-gold)]' : 'border-[var(--border-color)]'
      } border`}
    >
      {/* Background art */}
      <div className="absolute inset-0">
        <img src={artSrc} alt="" className="w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-[var(--bg-primary)]/70" />
      </div>

      <div className="relative p-4">
        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirmDelete) {
              onDelete();
            } else {
              setConfirmDelete(true);
              confirmDeleteTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
            }
          }}
          className="absolute top-2 right-2 p-1 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          aria-label="Delete army"
        >
          <X className="w-4 h-4" />
        </button>

        {confirmDelete && (
          <div className="absolute top-2 right-8 text-xs text-red-500 font-medium">
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
                className="flex-1 px-2 py-1 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
                autoFocus
              />
              <button onClick={handleSaveName} className="text-[var(--accent-gold)] hover:opacity-70">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button onClick={onSwitch} className="flex-1 text-left">
                <span className="font-semibold text-[var(--text-primary)] text-sm">{army.name}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditing(true); setEditName(army.name); }}
                className="text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
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
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)]'
            }`}>
              {army.mode === 'crusade' ? 'Crusade' : 'Standard'}
            </span>

            {/* Faction */}
            {factionMeta && (
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <span>{factionMeta.icon}</span>
                {factionMeta.name}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-2 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {army.units.length} unit{army.units.length !== 1 ? 's' : ''}
            </span>
            <span className="font-mono">{totalPoints.toLocaleString()} pts</span>
          </div>
        </button>

        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-gold)] rounded-b-xl" />
        )}
      </div>
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
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center relative overflow-hidden">
      {/* Hero background artwork */}
      <div className="absolute inset-0 z-0">
        <img
          src={getArtPath('emperor.jpg')}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[var(--bg-primary)]/85 to-[var(--bg-primary)]" />
      </div>

      <div className="relative z-10 w-full flex flex-col items-center px-4 pt-16 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-0">
          <div className="w-8" /> {/* Spacer */}
          <h1 className="font-serif text-4xl font-black text-[var(--accent-gold)] tracking-[0.2em] text-center uppercase drop-shadow-[0_0_30px_rgba(201,168,76,0.3)] flex-1">
            WARCASTER
          </h1>
          <button
            onClick={() => navigate('/settings')}
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        {/* Edition badge */}
        <button
          onClick={() => {
            const active = getActiveEdition();
            const other = EDITIONS.find(e => e.id !== active.id);
            if (other && !isEditionDataAvailable(other.id)) {
              toast.info(`${other.name} data coming ${other.releaseDate.slice(0, 7).replace('-', ' ')}`);
            }
          }}
          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full
                     hover:border-[var(--accent-gold)] transition-colors cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {getActiveEdition().name}
          </span>
        </button>

        <p className="mt-2 text-[var(--text-secondary)] text-center text-sm tracking-wider">
          Choose your mode to begin
        </p>

        {/* Mode Cards */}
        <div className="mt-10 w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Standard Mode */}
          <button
            onClick={() => handleSelectMode('standard')}
            className="group relative overflow-hidden flex flex-col items-center gap-3 p-6 bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-color)] rounded-xl
                       transition-all hover:border-[var(--accent-gold)] hover:shadow-lg hover:shadow-amber-900/20
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          >
            <Sword className="w-10 h-10 text-[var(--accent-gold)] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-lg font-semibold text-[var(--text-primary)]">Matched Play</span>
            <span className="text-sm text-[var(--text-secondary)] text-center leading-snug">
              Build an army list with points limits
            </span>
          </button>

          {/* Crusade Mode */}
          <button
            onClick={() => handleSelectMode('crusade')}
            className="group relative overflow-hidden flex flex-col items-center gap-3 p-6 bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-color)] rounded-xl
                       transition-all hover:border-[var(--accent-gold)] hover:shadow-lg hover:shadow-amber-900/20
                       focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
          >
            <ScrollText className="w-10 h-10 text-[var(--accent-gold)] group-hover:scale-110 transition-transform" />
            <span className="font-serif text-lg font-semibold text-[var(--text-primary)]">Crusade</span>
            <span className="text-sm text-[var(--text-secondary)] text-center leading-snug">
              Track your force with XP, honours &amp; scars
            </span>
          </button>
        </div>

        {/* Existing army actions */}
        {hasArmy && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              onClick={() => navigate('/army')}
              className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--bg-primary)] font-semibold rounded-lg
                         hover:bg-[var(--accent-gold-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
            >
              Continue Building
            </button>
            <button
              onClick={() => {
                clearArmy();
              }}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}

        {/* Saved Army Lists */}
        {savedArmies.length > 0 && (
          <div className="mt-12 w-full max-w-md">
            <h2 className="font-serif text-lg font-bold text-[var(--accent-gold)] tracking-wider uppercase mb-4">
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
                <div className="p-4 bg-[var(--bg-card)] border border-dashed border-[var(--accent-gold)] rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newArmyName}
                    onChange={(e) => setNewArmyName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateArmy(); }}
                    placeholder="Army name..."
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)]
                               placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[var(--accent-gold)]/20"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowNewArmyInput(false); setNewArmyName(''); }}
                      className="flex-1 px-4 py-2 text-sm text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg hover:border-[var(--accent-gold)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateArmy}
                      disabled={!newArmyName.trim()}
                      className="flex-1 px-4 py-2 text-sm font-semibold text-[var(--bg-primary)] bg-[var(--accent-gold)] rounded-lg
                                 hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewArmyInput(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-xl
                             text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] transition-all"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-sm font-medium">New Army List</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
