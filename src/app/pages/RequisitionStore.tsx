import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  UserPlus,
  Wrench,
  Heart,
  TrendingUp,
  Crown,
  Medal,
  Star,
  Scroll,
  Trophy,
  X,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useCrusade } from "../../lib/CrusadeContext";
import type { CrusadeUnit } from "../../types";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "../components/ui/alert-dialog";

// --- Requisition History (localStorage) ---

interface RequisitionHistoryEntry {
  id: string;
  requisitionName: string;
  unitName?: string;
  cost: number;
  date: string; // ISO string
}

const HISTORY_KEY = "crusade_requisition_history";

function loadHistory(): RequisitionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistoryEntry(entry: RequisitionHistoryEntry) {
  const history = loadHistory();
  history.unshift(entry);
  // Keep last 50 entries
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

// --- Requisition definitions ---

interface RequisitionDef {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: typeof UserPlus;
}

const REQUISITIONS: RequisitionDef[] = [
  {
    id: "fresh-recruits",
    name: "Fresh Recruits",
    cost: 1,
    description: "Add a new unit to your Order of Battle.",
    icon: UserPlus,
  },
  {
    id: "rearm-resupply",
    name: "Rearm and Resupply",
    cost: 1,
    description: "Change a unit's wargear options.",
    icon: Wrench,
  },
  {
    id: "repair-recuperate",
    name: "Repair and Recuperate",
    cost: 1,
    description: "Remove one Battle Scar from a unit.",
    icon: Heart,
  },
  {
    id: "increase-supply-limit",
    name: "Increase Supply Limit",
    cost: 1,
    description: "Increase your Supply Limit by 100 pts.",
    icon: TrendingUp,
  },
  {
    id: "promote-character",
    name: "Promote Character",
    cost: 1,
    description: "Promote a non-character unit to character status.",
    icon: Crown,
  },
  {
    id: "legendary-veterans",
    name: "Legendary Veterans",
    cost: 1,
    description: "Allow a non-character to reach Heroic/Legendary rank.",
    icon: Medal,
  },
  {
    id: "mark-for-greatness",
    name: "Mark for Greatness",
    cost: 0,
    description: "Already built into the post-battle flow.",
    icon: Star,
  },
  {
    id: "strategic-genius",
    name: "Strategic Genius",
    cost: 1,
    description: "Select an additional Agenda for your next battle.",
    icon: Scroll,
  },
  {
    id: "war-trophies",
    name: "War Trophies",
    cost: 1,
    description: "Award a Crusade Relic to a unit.",
    icon: Trophy,
  },
];

// --- Eligibility helpers ---

function getEligibility(
  req: RequisitionDef,
  rp: number,
  playerUnits: CrusadeUnit[]
): { available: boolean; reason?: string } {
  if (req.id === "mark-for-greatness") {
    return { available: false, reason: "Use during post-battle sequence" };
  }

  if (rp < req.cost) {
    return { available: false, reason: "Not enough RP" };
  }

  switch (req.id) {
    case "repair-recuperate": {
      const hasScars = playerUnits.some(
        (u) => u.battle_scars.length > 0 && !u.is_destroyed
      );
      return hasScars
        ? { available: true }
        : { available: false, reason: "No units have Battle Scars" };
    }
    case "rearm-resupply": {
      const hasUnits = playerUnits.filter((u) => !u.is_destroyed).length > 0;
      return hasUnits
        ? { available: true }
        : { available: false, reason: "No units on roster" };
    }
    case "promote-character":
    case "legendary-veterans":
    case "war-trophies": {
      const hasUnits = playerUnits.filter((u) => !u.is_destroyed).length > 0;
      return hasUnits
        ? { available: true }
        : { available: false, reason: "No eligible units" };
    }
    default:
      return { available: true };
  }
}

// --- Format date ---

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Component ---

export default function RequisitionStore() {
  const navigate = useNavigate();
  const { campaign, currentPlayer, units, spendRequisition, removeBattleScar } =
    useCrusade();

  const currentRP = currentPlayer?.requisition_points ?? 0;
  const playerUnits = useMemo(
    () => units.filter((u) => u.player_id === currentPlayer?.id),
    [units, currentPlayer?.id]
  );

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequisitionDef | null>(null);

  // Unit/scar picker for Repair and Recuperate
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{
    id: string;
    name: string;
    scars: { id: string; name: string }[];
  } | null>(null);
  const [scarPickerOpen, setScarPickerOpen] = useState(false);

  // History
  const [history, setHistory] = useState<RequisitionHistoryEntry[]>([]);
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const unitsWithScars = useMemo(
    () =>
      playerUnits
        .filter((u) => u.battle_scars.length > 0 && !u.is_destroyed)
        .map((u) => ({
          id: u.id,
          name: u.custom_name,
          scars: u.battle_scars.map((s) => ({ id: s.id, name: s.name })),
        })),
    [playerUnits]
  );

  // Redirect if no campaign
  useEffect(() => {
    if (!campaign) {
      navigate("/home", { replace: true });
    }
  }, [campaign, navigate]);

  const handleSpendClick = useCallback((req: RequisitionDef) => {
    setSelectedReq(req);
    setConfirmOpen(true);
  }, []);

  const recordHistory = useCallback(
    (reqName: string, cost: number, unitName?: string) => {
      const entry: RequisitionHistoryEntry = {
        id: crypto.randomUUID(),
        requisitionName: reqName,
        unitName,
        cost,
        date: new Date().toISOString(),
      };
      saveHistoryEntry(entry);
      setHistory(loadHistory());
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (!selectedReq) return;

    // Special flow: Repair and Recuperate needs unit picker
    if (selectedReq.id === "repair-recuperate") {
      if (unitsWithScars.length === 0) {
        toast.info("No units have Battle Scars to remove.");
        setConfirmOpen(false);
        setSelectedReq(null);
        return;
      }
      const success = spendRequisition(selectedReq.cost);
      if (!success) {
        toast.error("Not enough RP");
        setConfirmOpen(false);
        setSelectedReq(null);
        return;
      }
      setConfirmOpen(false);
      toast.success("Repair and Recuperate — select a unit");
      setUnitPickerOpen(true);
      return;
    }

    const success = spendRequisition(selectedReq.cost);
    if (!success) {
      toast.error("Not enough RP");
      setConfirmOpen(false);
      setSelectedReq(null);
      return;
    }

    setConfirmOpen(false);
    toast.success(`${selectedReq.name} acquired!`);
    recordHistory(selectedReq.name, selectedReq.cost);

    // Navigate for specific requisitions
    if (selectedReq.id === "fresh-recruits") {
      setTimeout(() => navigate("/add-unit"), 400);
    }

    setSelectedReq(null);
  }, [
    selectedReq,
    unitsWithScars.length,
    spendRequisition,
    recordHistory,
    navigate,
  ]);

  const handleSelectUnit = useCallback(
    (unit: (typeof unitsWithScars)[0]) => {
      setSelectedUnit(unit);
      setUnitPickerOpen(false);
      setScarPickerOpen(true);
    },
    []
  );

  const handleSelectScar = useCallback(
    (scarId: string, scarName: string) => {
      if (!selectedUnit) return;
      removeBattleScar(selectedUnit.id, scarId);
      toast.success(`Removed "${scarName}" from ${selectedUnit.name}`);
      recordHistory("Repair and Recuperate", 1, selectedUnit.name);
      setScarPickerOpen(false);
      setSelectedUnit(null);
      setSelectedReq(null);
    },
    [selectedUnit, removeBattleScar, recordHistory]
  );

  if (!campaign || !currentPlayer) return null;

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden pb-24">
      <div className="relative z-10 w-full max-w-md mx-auto p-6">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-stone-400 hover:text-emerald-500 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] mb-1">
            Requisition Store
          </h1>
          <p className="text-stone-400 text-sm">
            Spend Requisition Points to enhance your crusade force.
          </p>
        </div>

        {/* RP Balance */}
        <div className="rounded-sm border border-stone-700/60 bg-stone-900 p-5 text-center mb-6">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Available Points
          </p>
          <p className="text-5xl font-bold text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]">
            {currentRP}
          </p>
          <p className="text-sm text-stone-400 mt-1">Requisition Points</p>
        </div>

        {/* Requisition Cards */}
        <div className="space-y-3 mb-8">
          {REQUISITIONS.map((req) => {
            const Icon = req.icon;
            const { available, reason } = getEligibility(
              req,
              currentRP,
              playerUnits
            );

            return (
              <div
                key={req.id}
                className="rounded-sm border border-stone-700/60 bg-stone-900 p-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2.5 rounded-sm ${
                      available ? "bg-emerald-500/10" : "bg-stone-800"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        available ? "text-emerald-500" : "text-stone-500"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3
                        className={`font-bold text-sm ${
                          available ? "text-emerald-400" : "text-stone-500"
                        }`}
                      >
                        {req.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-sm text-xs font-bold shrink-0 ${
                          req.cost === 0
                            ? "bg-stone-700/50 text-stone-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {req.cost === 0 ? "Free" : `${req.cost} RP`}
                      </span>
                    </div>

                    <p
                      className={`text-xs leading-relaxed mb-3 ${
                        available ? "text-stone-400" : "text-stone-600"
                      }`}
                    >
                      {req.description}
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Eligibility badge */}
                      {available ? (
                        <span className="text-xs font-medium text-emerald-500">
                          Available
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-stone-500">
                          {reason}
                        </span>
                      )}

                      {/* Spend button */}
                      <button
                        onClick={() => handleSpendClick(req)}
                        disabled={!available}
                        className={`px-4 py-1.5 rounded-sm text-xs font-bold transition-all ${
                          available
                            ? "bg-emerald-600 hover:bg-emerald-500 text-black"
                            : "bg-stone-800 text-stone-600 cursor-not-allowed"
                        }`}
                      >
                        Spend
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Requisition History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Requisition History
            </h2>
            <div className="space-y-2">
              {history.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-sm border border-stone-700/60 bg-stone-900 px-4 py-3 flex items-center justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-300 truncate">
                      {entry.requisitionName}
                      {entry.unitName && (
                        <span className="text-stone-500">
                          {" "}
                          — {entry.unitName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-400 shrink-0 ml-3">
                    {entry.cost === 0 ? "Free" : `${entry.cost} RP`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-stone-700/60 bg-stone-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-stone-100">
              {selectedReq &&
                `Spend ${selectedReq.cost} RP on ${selectedReq.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              {selectedReq?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmOpen(false);
                setSelectedReq(null);
              }}
              className="border-stone-700/60 bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-emerald-600 text-black hover:bg-emerald-500 font-bold"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unit Picker Dialog (Repair and Recuperate) */}
      {unitPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-stone-700/60 bg-stone-900 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-100">
                  Select Unit
                </h2>
                <button
                  onClick={() => {
                    setUnitPickerOpen(false);
                    setSelectedReq(null);
                  }}
                  className="text-stone-400 hover:text-stone-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-400 mt-2">
                Choose a unit to remove a Battle Scar from
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto p-6 space-y-3">
              {unitsWithScars.length === 0 && (
                <p className="text-stone-500 text-sm text-center py-4">
                  No units have Battle Scars.
                </p>
              )}
              {unitsWithScars.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => handleSelectUnit(unit)}
                  className="w-full rounded-sm border border-stone-700/60 bg-stone-900 p-4 text-left hover:border-emerald-500/50 transition-all"
                >
                  <h3 className="font-semibold text-stone-300 mb-2">
                    {unit.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {unit.scars.map((scar) => (
                      <span
                        key={scar.id}
                        className="px-2 py-1 rounded-sm bg-red-500/10 text-red-400 text-xs"
                      >
                        {scar.name}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scar Picker Dialog */}
      {scarPickerOpen && selectedUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-sm border border-stone-700/60 bg-stone-900 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-stone-100">
                  Remove Scar
                </h2>
                <button
                  onClick={() => {
                    setScarPickerOpen(false);
                    setSelectedUnit(null);
                    setSelectedReq(null);
                  }}
                  className="text-stone-400 hover:text-stone-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-stone-400 mt-2">
                Select which scar to remove from {selectedUnit.name}
              </p>
            </div>

            <div className="p-6 space-y-3">
              {selectedUnit.scars.map((scar) => (
                <button
                  key={scar.id}
                  onClick={() => handleSelectScar(scar.id, scar.name)}
                  className="w-full rounded-sm border border-stone-700/60 bg-stone-900 p-4 text-left hover:border-red-500/50 transition-all"
                >
                  <h3 className="font-semibold text-red-400">{scar.name}</h3>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
