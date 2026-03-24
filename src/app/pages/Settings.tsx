import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  AlertTriangle,
  Share2,
  ChevronRight,
  Download,
  Upload,
  Database,
  Info,
  Pencil,
  LogOut,
  Shield,
  UserMinus,
  Megaphone,
  ChevronUp,
} from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { useAuth } from "../../lib/AuthContext";
import { saveCampaign, savePlayer, saveUnits, saveBattles, saveUser, STORAGE_KEYS } from "../../lib/storage";
import { getAllFactionSlugs, getAllUnits } from "../../data";
import { getFactionName, getFactionIcon } from "../../lib/factions";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { toast } from "sonner";
import { getAllFlags, setFeatureFlag, type FeatureFlags } from '../../lib/featureFlags';
import { getUsageStats, clearTelemetry } from '../../lib/telemetry';
import { getErrorLog, clearErrorLog } from '../../lib/errorTracking';

export default function Settings() {
  const navigate = useNavigate();
  const { campaign, currentPlayer, players, units, battles, leaveCampaign, updateCampaignSettings, removePlayer, postAnnouncement } = useCrusade();
  const { user: authUser, signOut, updateUsername } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [showImportSuccess, setShowImportSuccess] = useState(false);

  // CM Admin state
  const isCampaignMaster = !!(campaign && authUser && campaign.owner_id === authUser.id);
  const [cmSupplyLimit, setCmSupplyLimit] = useState(campaign?.supply_limit ?? 1000);
  const [cmStartingRp, setCmStartingRp] = useState(campaign?.starting_rp ?? 5);
  const [announcementText, setAnnouncementText] = useState("");
  const [showRemovePlayerDialog, setShowRemovePlayerDialog] = useState<string | null>(null);

  // Developer Tools state
  const [devFlags, setDevFlags] = useState<FeatureFlags>(() => getAllFlags());
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [showUsageStats, setShowUsageStats] = useState(false);

  // Profile state
  const displayName = authUser?.username ?? "Commander";
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const userEmail = "";

  // Database stats from real data layer
  const dbStats = useMemo(() => {
    const factionCount = getAllFactionSlugs().length;
    const datasheetCount = getAllUnits().length;
    return { factionCount, datasheetCount };
  }, []);

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLeaveCampaign = () => {
    setShowLeaveDialog(false);
    leaveCampaign();
    navigate("/home");
  };

  const handleSignOut = async () => {
    setShowSignOutDialog(false);
    // Clear campaign data from localStorage
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGN);
    localStorage.removeItem(STORAGE_KEYS.PLAYER);
    localStorage.removeItem(STORAGE_KEYS.UNITS);
    localStorage.removeItem(STORAGE_KEYS.BATTLES);
    localStorage.removeItem(STORAGE_KEYS.ALL_PLAYERS);
    await signOut();
    navigate("/sign-in");
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    // Update in Supabase
    if (isSupabaseConfigured() && authUser?.id) {
      const { error } = await supabase
        .from('cc_profiles')
        .update({ display_name: tempName.trim() })
        .eq('id', authUser.id);
      if (error) {
        toast.error('Failed to update name');
        return;
      }
    }
    // Update local storage
    saveUser({ id: authUser?.id ?? '', email: '', display_name: tempName.trim() });
    updateUsername(tempName.trim());
    toast.success('Name updated');
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setTempName(displayName);
    setIsEditingName(false);
  };

  const handleShareJoinCode = () => {
    if (campaign?.join_code) {
      navigator.clipboard.writeText(campaign.join_code)
        .then(() => {
          setShowShareSuccess(true);
          setTimeout(() => setShowShareSuccess(false), 2000);
        })
        .catch(() => toast.error("Couldn't copy — tap and hold to copy manually"));
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      campaign,
      currentPlayer,
      units,
      battles,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crusade-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 2000);
  };

  const handleImportData = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        // Restore campaign, units, battles via localStorage then reload
        if (data.campaign) saveCampaign(data.campaign);
        if (data.currentPlayer) savePlayer(data.currentPlayer);
        if (data.units) saveUnits(data.units);
        if (data.battles) saveBattles(data.battles);
        setShowImportSuccess(true);
        setTimeout(() => {
          setShowImportSuccess(false);
          window.location.reload();
        }, 1500);
      } catch {
        alert("Failed to parse import file.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 pb-24 relative overflow-hidden">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelected}
      />

      <div className="relative z-10 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            Settings
          </h1>
          <p className="text-stone-400 text-sm mt-1">Manage your campaign and app preferences</p>
        </div>

        {/* Profile Section */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
            Profile
          </h2>
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-5">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4 mb-5">
              {/* Avatar Circle */}
              <div className="w-16 h-16 rounded-full bg-stone-700 flex items-center justify-center">
                <span className="text-2xl font-bold text-stone-300">
                  {getInitials(displayName)}
                </span>
              </div>

              {/* Name and Edit */}
              <div className="flex-1">
                {isEditingName ? (
                  <div>
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-700 bg-stone-900 text-stone-300 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveName}
                        className="px-3 py-1 text-sm rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-black font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-sm rounded-lg border border-stone-700 text-stone-400 hover:text-stone-300 hover:border-stone-600 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-stone-200">
                        {displayName}
                      </h3>
                      <button
                        onClick={() => {
                          setTempName(displayName);
                          setIsEditingName(true);
                        }}
                        className="p-1 rounded hover:bg-stone-800 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-stone-400" />
                      </button>
                    </div>
                    <p className="text-sm text-stone-400 mt-1">{userEmail}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={() => setShowSignOutDialog(true)}
              className="w-full relative overflow-hidden rounded-sm border border-red-500/20 bg-stone-900 hover:border-red-500/40 hover:bg-red-500/5 transition-all group p-4"
            >
              <div className="flex items-center justify-center gap-3">
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="text-red-400 font-semibold">Sign Out</span>
              </div>
            </button>
          </div>
        </div>

        {/* Campaign Section */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
            Campaign
          </h2>
          <div className="space-y-2">
            {/* Leave Campaign */}
            <button
              onClick={() => setShowLeaveDialog(true)}
              disabled={!campaign}
              className="w-full relative overflow-hidden rounded-sm border border-red-500/20 bg-stone-900 hover:border-red-500/40 hover:bg-red-500/5 transition-all group p-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-stone-300 font-semibold">Leave Campaign</span>
                </div>
              </div>
            </button>

            {/* Share Join Code */}
            <button
              onClick={handleShareJoinCode}
              disabled={!campaign}
              className="w-full relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group p-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Share2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-stone-300 font-semibold">Share Join Code</span>
                </div>
                {showShareSuccess && (
                  <span className="text-emerald-400 text-sm">Copied!</span>
                )}
              </div>
            </button>

            {/* Campaign History */}
            <button
              onClick={() => navigate("/campaign-history")}
              className="w-full relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-emerald-500" />
                  <span className="text-stone-300 font-semibold">Campaign History</span>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-emerald-500 transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* Campaign Administration — CM Only */}
        {isCampaignMaster && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
              Campaign Administration
            </h2>
            <div className="relative overflow-hidden rounded-sm border border-emerald-500/30 bg-stone-900 p-5 space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span className="text-stone-200 font-semibold">Campaign Master Controls</span>
              </div>

              {/* Adjust Supply Limit */}
              <div>
                <label className="block text-sm text-stone-400 mb-1">Supply Limit</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={cmSupplyLimit}
                    onChange={(e) => setCmSupplyLimit(Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-sm border border-stone-700 bg-stone-800 text-stone-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => updateCampaignSettings({ supply_limit: cmSupplyLimit })}
                    className="px-4 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Adjust Starting RP */}
              <div>
                <label className="block text-sm text-stone-400 mb-1">Starting RP</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={cmStartingRp}
                    onChange={(e) => setCmStartingRp(Number(e.target.value))}
                    className="flex-1 px-3 py-2 rounded-sm border border-stone-700 bg-stone-800 text-stone-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => updateCampaignSettings({ starting_rp: cmStartingRp })}
                    className="px-4 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Advance Round */}
              <div>
                <label className="block text-sm text-stone-400 mb-1">
                  Current Round: <span className="text-stone-200 font-mono">{campaign?.current_round ?? 1}</span>
                </label>
                <button
                  onClick={() => updateCampaignSettings({ current_round: (campaign?.current_round ?? 1) + 1 })}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-sm border border-emerald-500/30 bg-stone-800 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-emerald-400 font-semibold transition-all"
                >
                  <ChevronUp className="w-4 h-4" />
                  Advance to Round {(campaign?.current_round ?? 1) + 1}
                </button>
              </div>

              {/* Post Announcement */}
              <div>
                <label className="block text-sm text-stone-400 mb-1">Post Announcement</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Write an announcement..."
                    className="flex-1 px-3 py-2 rounded-sm border border-stone-700 bg-stone-800 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (announcementText.trim()) {
                        postAnnouncement(announcementText.trim());
                        setAnnouncementText("");
                      }
                    }}
                    disabled={!announcementText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Megaphone className="w-4 h-4" />
                    Post
                  </button>
                </div>
              </div>

              {/* Player Management */}
              <div>
                <label className="block text-sm text-stone-400 mb-2">Player Management</label>
                <div className="space-y-2">
                  {players.map((player) => {
                    const isOwner = player.user_id === campaign?.owner_id;
                    return (
                      <div
                        key={player.id}
                        className="flex items-center justify-between p-3 rounded-sm border border-stone-700/60 bg-stone-800"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getFactionIcon(player.faction_id)}</span>
                          <div>
                            <div className="text-sm font-semibold text-stone-200">
                              {player.name}
                              {isOwner && (
                                <span className="ml-2 text-xs text-emerald-400 font-normal">(CM)</span>
                              )}
                            </div>
                            <div className="text-xs text-stone-500">
                              {getFactionName(player.faction_id)}
                            </div>
                          </div>
                        </div>
                        {!isOwner && (
                          <button
                            onClick={() => setShowRemovePlayerDialog(player.id)}
                            className="p-2 rounded-sm hover:bg-red-500/10 transition-colors group"
                          >
                            <UserMinus className="w-4 h-4 text-stone-500 group-hover:text-red-400 transition-colors" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {players.length === 0 && (
                    <p className="text-sm text-stone-600 text-center py-2">No players in campaign</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Section */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
            Data
          </h2>
          <div className="space-y-2">
            {/* Export Crusade Data */}
            <button
              onClick={handleExportData}
              className="w-full relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-blue-400" />
                  <span className="text-stone-300 font-semibold">Export Crusade Data</span>
                </div>
                {showExportSuccess && (
                  <span className="text-emerald-400 text-sm">Exported!</span>
                )}
              </div>
            </button>

            {/* Import Crusade Data */}
            <button
              onClick={handleImportData}
              className="w-full relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span className="text-stone-300 font-semibold">Import Crusade Data</span>
                </div>
                {showImportSuccess && (
                  <span className="text-emerald-400 text-sm">Imported!</span>
                )}
              </div>
            </button>

            {/* Database Stats */}
            <div className="relative overflow-hidden rounded-sm border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-stone-950 p-4">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-stone-300 font-semibold mb-2">Database Statistics</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-400">Factions:</span>
                      <span className="text-stone-400 font-mono">{dbStats.factionCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Datasheets:</span>
                      <span className="text-stone-400 font-mono">{dbStats.datasheetCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Developer Tools Section */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
            Developer Tools
          </h2>
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-5 space-y-5">

            {/* Feature Flags */}
            <div>
              <h3 className="text-stone-200 font-semibold mb-3">Feature Flags</h3>
              <div className="space-y-2">
                {(Object.keys(devFlags) as (keyof FeatureFlags)[]).map((flag) => (
                  <label key={flag} className="flex items-center justify-between p-2 rounded-sm hover:bg-stone-800 transition-colors cursor-pointer">
                    <span className="text-sm text-stone-400 font-mono">{flag}</span>
                    <button
                      onClick={() => {
                        const newValue = !devFlags[flag];
                        setFeatureFlag(flag, newValue);
                        setDevFlags(getAllFlags());
                      }}
                      className={`relative w-10 h-5 rounded-full transition-colors ${devFlags[flag] ? 'bg-emerald-600' : 'bg-stone-700'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${devFlags[flag] ? 'translate-x-5' : ''}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Error Log */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-stone-200 font-semibold">Error Log</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 font-mono">{getErrorLog().length} errors</span>
                  <button
                    onClick={() => setShowErrorLog(!showErrorLog)}
                    className="px-3 py-1 text-xs rounded-sm border border-stone-700 text-stone-400 hover:text-stone-300 hover:border-stone-600 transition-all"
                  >
                    {showErrorLog ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => {
                      clearErrorLog();
                      setShowErrorLog(false);
                      toast.success('Error log cleared');
                    }}
                    className="px-3 py-1 text-xs rounded-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {showErrorLog && (
                <div className="max-h-60 overflow-y-auto space-y-2 mt-2">
                  {getErrorLog().length === 0 ? (
                    <p className="text-sm text-stone-600 text-center py-2">No errors recorded</p>
                  ) : (
                    getErrorLog().map((entry, i) => (
                      <div key={i} className="p-2 rounded-sm border border-stone-700/40 bg-stone-800 text-xs">
                        <div className="flex justify-between text-stone-500 mb-1">
                          <span className="font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-red-400 font-mono break-all">{entry.message}</p>
                        {entry.stack && (
                          <pre className="text-stone-600 mt-1 text-[10px] leading-tight overflow-x-auto whitespace-pre-wrap">{entry.stack.slice(0, 300)}</pre>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-stone-200 font-semibold">Usage Stats</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUsageStats(!showUsageStats)}
                    className="px-3 py-1 text-xs rounded-sm border border-stone-700 text-stone-400 hover:text-stone-300 hover:border-stone-600 transition-all"
                  >
                    {showUsageStats ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => {
                      clearTelemetry();
                      setShowUsageStats(false);
                      toast.success('Telemetry cleared');
                    }}
                    className="px-3 py-1 text-xs rounded-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {showUsageStats && (() => {
                const stats = getUsageStats();
                return (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 rounded-sm border border-stone-700/40 bg-stone-800">
                        <span className="text-stone-500 text-xs">Sessions</span>
                        <p className="text-stone-200 font-mono">{stats.sessionCount}</p>
                      </div>
                      <div className="p-2 rounded-sm border border-stone-700/40 bg-stone-800">
                        <span className="text-stone-500 text-xs">Total Events</span>
                        <p className="text-stone-200 font-mono">{stats.events.length}</p>
                      </div>
                      <div className="p-2 rounded-sm border border-stone-700/40 bg-stone-800">
                        <span className="text-stone-500 text-xs">First Seen</span>
                        <p className="text-stone-200 font-mono text-xs">{new Date(stats.firstSeen).toLocaleDateString()}</p>
                      </div>
                      <div className="p-2 rounded-sm border border-stone-700/40 bg-stone-800">
                        <span className="text-stone-500 text-xs">Last Seen</span>
                        <p className="text-stone-200 font-mono text-xs">{new Date(stats.lastSeen).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {Object.keys(stats.featureUsage).length > 0 && (
                      <div className="p-2 rounded-sm border border-stone-700/40 bg-stone-800">
                        <span className="text-stone-500 text-xs block mb-1">Feature Usage</span>
                        <div className="space-y-1">
                          {Object.entries(stats.featureUsage)
                            .sort(([, a], [, b]) => b - a)
                            .map(([event, count]) => (
                              <div key={event} className="flex justify-between text-xs">
                                <span className="text-stone-400 font-mono">{event}</span>
                                <span className="text-stone-200 font-mono">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 px-1">
            About
          </h2>
          <div className="relative overflow-hidden rounded-sm border border-stone-700/60 bg-stone-900 p-5">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-stone-200 font-bold text-lg mb-1">
                  Crusade Commander
                </h3>
                <p className="text-stone-400 text-xs font-mono">Version 1.0.0 (Build 2026.03)</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <h4 className="text-stone-400 font-semibold mb-1">Credits</h4>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Designed and developed for the Warhammer 40,000 Crusade gaming community.
                  Built with React, TypeScript, and Tailwind CSS.
                </p>
              </div>

              <div>
                <h4 className="text-stone-400 font-semibold mb-1">Disclaimer</h4>
                <p className="text-stone-400 text-xs leading-relaxed">
                  This is an unofficial fan-made app. Warhammer 40,000 is a registered trademark
                  of Games Workshop Limited. All rights reserved to their respective owners.
                  This app is not affiliated with, endorsed by, or sponsored by Games Workshop.
                </p>
              </div>

              <div>
                <h4 className="text-stone-400 font-semibold mb-1">Data Sources</h4>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Game rules and statistics are provided for reference purposes only.
                  Always refer to official rulebooks and errata for tournament play.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Campaign Confirmation Dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="relative w-full max-w-md rounded-sm border border-red-500/30 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xl font-bold text-stone-100 mb-2">Leave Campaign?</h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Are you sure you want to leave "{campaign?.name ?? "this campaign"}"? Your roster and battle history will be archived, but you'll no longer receive updates from this campaign.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="flex-1 px-4 py-3 rounded-sm border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveCampaign}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-black font-bold hover:from-red-500 hover:to-red-400 transition-all"
              >
                Leave Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Player Confirmation Dialog */}
      {showRemovePlayerDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="relative w-full max-w-md rounded-sm border border-red-500/30 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xl font-bold text-stone-100 mb-2">Remove Player?</h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Are you sure you want to remove this player from the campaign? Their roster and battle history will be deleted.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRemovePlayerDialog(null)}
                className="flex-1 px-4 py-3 rounded-sm border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removePlayer(showRemovePlayerDialog);
                  setShowRemovePlayerDialog(null);
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-black font-bold hover:from-red-500 hover:to-red-400 transition-all"
              >
                Remove Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      {showSignOutDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="relative w-full max-w-md rounded-sm border border-red-500/30 bg-stone-900 p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xl font-bold text-stone-100 mb-2">Sign Out?</h3>
                <p className="text-stone-400 text-sm leading-relaxed">
                  Are you sure you want to sign out of your account? You will be redirected to the sign-in page.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSignOutDialog(false)}
                className="flex-1 px-4 py-3 rounded-sm border border-stone-700/60 bg-stone-900 text-stone-300 font-semibold hover:border-emerald-500/50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSignOut}
                className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-black font-bold hover:from-red-500 hover:to-red-400 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
