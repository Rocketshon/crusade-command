import { useNavigate } from 'react-router';
import { Sword, ScrollText } from 'lucide-react';
import { useArmy } from '../../lib/ArmyContext';

export default function Home() {
  const navigate = useNavigate();
  const { mode, army, setMode, clearArmy } = useArmy();

  const hasArmy = army.length > 0 || mode !== null;

  const handleSelectMode = (selected: 'standard' | 'crusade') => {
    setMode(selected);
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
    </div>
  );
}
