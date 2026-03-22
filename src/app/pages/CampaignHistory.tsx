import { useNavigate } from "react-router";
import { ArrowLeft, Calendar, Trophy, Scroll } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { getFactionName, getFactionIcon } from "../../lib/factions";
import type { FactionId } from "../../types";

export default function CampaignHistory() {
  const navigate = useNavigate();
  const { campaignHistory } = useCrusade();

  // Archive detail view not yet implemented — cards are display-only for now

  const getRecordColor = (record: { wins: number; losses: number; draws: number }) => {
    if (record.wins > record.losses) return "text-emerald-400";
    if (record.wins < record.losses) return "text-red-400";
    return "text-amber-400";
  };

  const getTotalBattles = (record: { wins: number; losses: number; draws: number }) => {
    return record.wins + record.losses + record.draws;
  };

  // Compute summary stats from real data
  const totalCampaigns = campaignHistory.length;
  const totalBattles = campaignHistory.reduce((sum, c) => sum + c.total_battles, 0);
  const factionsPlayed = new Set(campaignHistory.map((c) => c.faction_id)).size;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back to Settings</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Scroll className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              Campaign History
            </h1>
          </div>
          <p className="text-stone-400 text-sm">
            Your past crusades and battle records
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="relative overflow-hidden rounded-sm border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-stone-950 p-4">
            <div className="text-xs text-stone-400 font-semibold mb-1">Total Campaigns</div>
            <div className="text-2xl font-bold text-amber-400">{totalCampaigns}</div>
          </div>
          <div className="relative overflow-hidden rounded-sm border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-stone-950 p-4">
            <div className="text-xs text-stone-400 font-semibold mb-1">Total Battles</div>
            <div className="text-2xl font-bold text-emerald-400">
              {totalBattles}
            </div>
          </div>
          <div className="relative overflow-hidden rounded-sm border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-4">
            <div className="text-xs text-stone-400 font-semibold mb-1">Factions Played</div>
            <div className="text-2xl font-bold text-purple-400">
              {factionsPlayed}
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="space-y-3">
          {campaignHistory.map((campaign) => {
            const record = { wins: campaign.wins, losses: campaign.losses, draws: campaign.draws };
            const factionName = getFactionName(campaign.faction_id as FactionId);
            const factionIcon = getFactionIcon(campaign.faction_id as FactionId);

            return (
              <div
                key={campaign.id}
                className="w-full relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 transition-all"
              >

                <div className="relative p-4">
                  {/* Campaign Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg font-bold text-stone-100 tracking-wide transition-colors">
                      {campaign.name}
                    </h2>
                    <Trophy className="w-5 h-5 text-amber-500/50 transition-colors" />
                  </div>

                  {/* Date Range */}
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-4 h-4 text-stone-500" />
                    <span className="text-sm text-stone-400">
                      {formatDate(campaign.start_date)} – {formatDate(campaign.end_date)}
                    </span>
                  </div>

                  {/* Faction and Record */}
                  <div className="flex items-center justify-between">
                    {/* Faction */}
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{factionIcon}</span>
                      <span className="text-sm text-stone-400 font-semibold">
                        {factionName}
                      </span>
                    </div>

                    {/* Record */}
                    <div className={`text-sm font-mono font-bold ${getRecordColor(record)}`}>
                      {record.wins}W – {record.losses}L – {record.draws}D
                    </div>
                  </div>

                  {/* Battle Count Badge */}
                  <div className="absolute top-4 right-4">
                    <div className="px-2 py-1 rounded-full bg-stone-800/50 border border-stone-700/50">
                      <span className="text-xs text-stone-400 font-mono">
                        {getTotalBattles(record)} battles
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State (if no campaigns) */}
        {campaignHistory.length === 0 && (
          <div className="text-center py-12">
            <Scroll className="w-16 h-16 text-stone-700 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-xl font-bold text-stone-500 mb-2">
              No Past Campaigns
            </h2>
            <p className="text-stone-500 text-sm">
              Your campaign history will appear here once you complete your first crusade.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
