import { useNavigate } from "react-router";
import { Skull, Swords, ArrowRight } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName, getFactionIcon } from "../../lib/factions";

export default function CampaignHub() {
  const navigate = useNavigate();
  const { campaign, currentPlayer } = useCrusade();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-between p-6 relative overflow-hidden">
      {/* Dark ambient glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-md">
        {/* Logo/Title section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Skull className="w-16 h-16 text-emerald-500/80" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-md">
                <Skull className="w-16 h-16 text-emerald-500/40" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2 tracking-wider text-stone-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            CRUSADE
          </h1>
          <h2 className="text-xl tracking-[0.3em] text-emerald-500/70 uppercase font-light mb-4">
            Command
          </h2>

          <p className="text-stone-400 text-sm max-w-xs mx-auto leading-relaxed">
            Begin your path to glory or join your brothers in the endless war
          </p>
        </div>

        {/* Active Campaign Card (if exists) */}
        {campaign && currentPlayer && (
          <button
            onClick={() => navigate("/campaign/active")}
            className="group w-full relative overflow-hidden mb-4"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 to-stone-950 border border-emerald-500/30 rounded-lg transition-all duration-300 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
            <div className="relative px-6 py-5 flex items-center justify-between">
              <div className="flex-1 text-left">
                <div className="text-xs text-emerald-500/70 uppercase tracking-wider mb-1">
                  Active Crusade
                </div>
                <h3 className="text-lg tracking-wide text-stone-100 font-semibold">
                  {campaign.name}
                </h3>
                <p className="text-stone-400 text-sm mt-1">
                  {getFactionIcon(currentPlayer.faction_id)} {getFactionName(currentPlayer.faction_id)} — {currentPlayer.name}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500/70 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          </button>
        )}

        {/* Action Cards */}
        <div className="w-full space-y-4">
          {/* Create Campaign Card */}
          <button
            onClick={() => navigate('/create-campaign')}
            className="group w-full relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/20 rounded-lg transition-all duration-300 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative px-6 py-6 flex items-center justify-between">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-1">
                  <Swords className="w-5 h-5 text-emerald-500/80" strokeWidth={1.5} />
                  <h3 className="text-lg tracking-wide text-stone-100 font-semibold">
                    {campaign ? 'New Campaign' : 'Create Campaign'}
                  </h3>
                </div>
                <p className="text-stone-500 text-sm ml-8">
                  Forge a new crusade and lead your forces
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500/50" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </button>

          {/* Join Campaign Card */}
          <button
            onClick={() => navigate('/join-campaign')}
            className="group w-full relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-stone-900 to-stone-950 border border-emerald-500/20 rounded-lg transition-all duration-300 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]" />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
            <div className="relative px-6 py-6 flex items-center justify-between">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-3 mb-1">
                  <Skull className="w-5 h-5 text-emerald-500/80" strokeWidth={1.5} />
                  <h3 className="text-lg tracking-wide text-stone-100 font-semibold">
                    Join Campaign
                  </h3>
                </div>
                <p className="text-stone-500 text-sm ml-8">
                  Answer the call and join an existing crusade
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500/50" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          </button>
        </div>
      </div>

      {/* Bottom decorative element */}
      <div className="relative z-10 mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-stone-600 text-xs tracking-wider">
          <div className="w-8 h-px bg-gradient-to-r from-transparent to-stone-700" />
          <span className="uppercase">For the Emperor</span>
          <div className="w-8 h-px bg-gradient-to-l from-transparent to-stone-700" />
        </div>
      </div>
    </div>
  );
}
