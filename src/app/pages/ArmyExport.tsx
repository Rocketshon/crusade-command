import { useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Copy, Share2, Printer, Image, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { useArmy } from '../../lib/ArmyContext';
import { FACTIONS, getDataFactionId } from '../../lib/factions';
import { getUnitsForFaction } from '../../data';
import type { FactionId, Datasheet } from '../../types';

// ---------------------------------------------------------------------------
// Role classification
// ---------------------------------------------------------------------------

const ROLE_ORDER = [
  'CHARACTER',
  'EPIC HERO',
  'BATTLELINE',
  'DEDICATED TRANSPORT',
  'FAST ATTACK',
  'HEAVY SUPPORT',
  'ELITES',
  'LORD OF WAR',
  'FORTIFICATION',
] as const;

function classifyRole(keywords: string[]): string {
  const upper = keywords.map(k => k.toUpperCase());
  for (const role of ROLE_ORDER) {
    if (upper.includes(role)) return role;
  }
  return 'OTHER';
}

function roleName(role: string): string {
  switch (role) {
    case 'CHARACTER': return 'HQ';
    case 'EPIC HERO': return 'Epic Heroes';
    case 'BATTLELINE': return 'Troops';
    case 'DEDICATED TRANSPORT': return 'Dedicated Transports';
    case 'FAST ATTACK': return 'Fast Attack';
    case 'HEAVY SUPPORT': return 'Heavy Support';
    case 'ELITES': return 'Elites';
    case 'LORD OF WAR': return 'Lord of War';
    case 'FORTIFICATION': return 'Fortifications';
    default: return 'Other';
  }
}

// ITC/GT section headers
function tournamentSection(role: string): string {
  switch (role) {
    case 'CHARACTER': return 'HQ';
    case 'EPIC HERO': return 'HQ';
    case 'BATTLELINE': return 'Troops';
    case 'DEDICATED TRANSPORT': return 'Dedicated Transports';
    case 'FAST ATTACK': return 'Fast Attack';
    case 'HEAVY SUPPORT': return 'Heavy Support';
    case 'ELITES': return 'Elites';
    case 'LORD OF WAR': return 'Lord of War';
    case 'FORTIFICATION': return 'Fortifications';
    default: return 'Other';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ArmyExport() {
  const navigate = useNavigate();
  const { mode, factionId, detachmentName, supplyLimit, army } = useArmy();
  const textRef = useRef<HTMLPreElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tournamentFormat, setTournamentFormat] = useState(false);

  const factionMeta = factionId ? FACTIONS.find(f => f.id === factionId) : null;
  const cap = supplyLimit;
  const totalPoints = army.reduce((sum, u) => sum + u.points_cost, 0);

  // Look up datasheets for keyword / weapon info
  const datasheetMap = useMemo(() => {
    if (!factionId) return new Map<string, Datasheet>();
    const units = getUnitsForFaction(getDataFactionId(factionId as FactionId));
    const map = new Map<string, Datasheet>();
    for (const u of units) map.set(u.name, u);
    return map;
  }, [factionId]);

  // Group army units by role
  const groupedUnits = useMemo(() => {
    const groups = new Map<string, typeof army>();
    for (const unit of army) {
      const ds = datasheetMap.get(unit.datasheet_name);
      const role = ds ? classifyRole(ds.keywords) : 'OTHER';
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(unit);
    }
    return groups;
  }, [army, datasheetMap]);

  // -------------------------------------------------------------------------
  // Standard export text
  // -------------------------------------------------------------------------
  const standardExportText = useMemo(() => {
    const lines: string[] = [];
    const armyName = factionMeta?.name ?? factionId ?? 'Unknown';
    const modeLabel = mode === 'crusade' ? 'Crusade' : 'Standard';

    lines.push(`++ Army: ${armyName} ${totalPoints}/${cap}pts ++`);
    lines.push(`++ Faction: ${factionMeta?.name ?? factionId ?? 'Unknown'} ++`);
    if (detachmentName) {
      lines.push(`++ Detachment: ${detachmentName} ++`);
    }
    lines.push(`++ Mode: ${modeLabel} ++`);
    lines.push('');

    const roleKeys = [...ROLE_ORDER, 'OTHER'];
    for (const role of roleKeys) {
      const units = groupedUnits.get(role);
      if (!units || units.length === 0) continue;

      lines.push(`= ${roleName(role)} =`);
      for (const unit of units) {
        const ds = datasheetMap.get(unit.datasheet_name);
        lines.push(`- ${unit.custom_name} ${unit.points_cost}pts`);
        if (ds) {
          const weaponNames = [
            ...ds.ranged_weapons.map(w => w.name),
            ...ds.melee_weapons.map(w => w.name),
          ];
          if (weaponNames.length > 0) {
            lines.push(`  - ${weaponNames.join(', ')}`);
          }
        }
      }
      lines.push('');
    }

    lines.push(`++ Total: ${totalPoints}pts / ${cap}pts ++`);
    return lines.join('\n');
  }, [army, groupedUnits, datasheetMap, factionMeta, factionId, detachmentName, mode, totalPoints, cap]);

  // -------------------------------------------------------------------------
  // Tournament (ITC/GT) format text
  // -------------------------------------------------------------------------
  const tournamentExportText = useMemo(() => {
    const lines: string[] = [];

    lines.push(`Player: ${''}`);
    lines.push(`Faction: ${factionMeta?.name ?? factionId ?? 'Unknown'}`);
    if (detachmentName) {
      lines.push(`Detachment: ${detachmentName}`);
    }
    lines.push(`Total Points: ${totalPoints} / ${cap}`);
    lines.push('');

    // Merge roles into ITC sections (CHARACTER + EPIC HERO => HQ)
    const sectionMap = new Map<string, typeof army>();
    const roleKeys = [...ROLE_ORDER, 'OTHER'];
    for (const role of roleKeys) {
      const units = groupedUnits.get(role);
      if (!units || units.length === 0) continue;
      const section = tournamentSection(role);
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(...units);
    }

    // Ordered ITC sections
    const sectionOrder = ['HQ', 'Troops', 'Elites', 'Fast Attack', 'Heavy Support', 'Dedicated Transports', 'Lord of War', 'Fortifications', 'Other'];
    for (const section of sectionOrder) {
      const units = sectionMap.get(section);
      if (!units || units.length === 0) continue;

      lines.push(`== ${section} ==`);
      for (const unit of units) {
        const ds = datasheetMap.get(unit.datasheet_name);
        const modelCount = ds?.unit_composition ? extractModelCount(ds.unit_composition) : null;
        const modelSuffix = modelCount ? ` (x${modelCount} models)` : '';
        lines.push(`${unit.custom_name}${modelSuffix} [${unit.points_cost}pts]`);

        // Enhancements (from battle_honours of type 'weapon_enhancement' or 'crusade_relic')
        for (const honour of unit.battle_honours) {
          if (honour.type === 'weapon_enhancement' || honour.type === 'crusade_relic') {
            lines.push(`  - Enhancement: ${honour.name}`);
          }
        }

        // Wargear
        if (ds) {
          const wargear = [
            ...ds.ranged_weapons.map(w => w.name),
            ...ds.melee_weapons.map(w => w.name),
          ];
          if (wargear.length > 0) {
            lines.push(`  - Wargear: ${wargear.join(', ')}`);
          }
        }
      }
      lines.push('');
    }

    lines.push(`Total: ${totalPoints}pts`);
    return lines.join('\n');
  }, [army, groupedUnits, datasheetMap, factionMeta, factionId, detachmentName, totalPoints, cap]);

  const exportText = tournamentFormat ? tournamentExportText : standardExportText;

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      toast.success('Copied to clipboard!');
    } catch {
      if (textRef.current) {
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      toast.info('Text selected \u2014 press Ctrl+C to copy');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${factionMeta?.name ?? 'Army'} List`,
          text: exportText,
        });
      } catch {
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = exportText.split('\n');
    const padding = 40;
    const lineHeight = 22;
    const fontSize = 14;
    const headerFontSize = 18;
    const titleFontSize = 24;

    // Calculate canvas dimensions
    const canvasWidth = 600;
    const canvasHeight = padding * 2 + titleFontSize + 20 + lines.length * lineHeight + 60;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Gold border
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, canvasWidth - 16, canvasHeight - 16);

    // Inner border
    ctx.strokeStyle = '#c9a84c40';
    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, canvasWidth - 28, canvasHeight - 28);

    // Title
    let y = padding + titleFontSize;
    ctx.fillStyle = '#c9a84c';
    ctx.font = `bold ${titleFontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(factionMeta?.name ?? 'Army List', canvasWidth / 2, y);

    // Faction icon
    if (factionMeta?.icon) {
      ctx.font = `${titleFontSize + 4}px serif`;
      ctx.fillText(factionMeta.icon, canvasWidth / 2 - ctx.measureText(factionMeta.name).width / 2 - 30, y);
    }

    y += 10;

    // Divider line
    ctx.strokeStyle = '#c9a84c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvasWidth - padding, y);
    ctx.stroke();

    y += 20;
    ctx.textAlign = 'left';

    // Render lines
    for (const line of lines) {
      const isSection = line.startsWith('==') || line.startsWith('= ') || line.startsWith('++');
      if (isSection) {
        ctx.fillStyle = '#c9a84c';
        ctx.font = `bold ${headerFontSize}px "Courier New", monospace`;
      } else if (line.startsWith('  -')) {
        ctx.fillStyle = '#8a8690';
        ctx.font = `${fontSize - 1}px "Courier New", monospace`;
      } else {
        ctx.fillStyle = '#e8e4de';
        ctx.font = `${fontSize}px "Courier New", monospace`;
      }
      ctx.fillText(line, padding, y);
      y += lineHeight;
    }

    // "WARCASTER" watermark
    ctx.fillStyle = '#c9a84c20';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('WARCASTER', canvasWidth / 2, canvasHeight - 30);

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(factionMeta?.name ?? 'army').replace(/\s+/g, '-').toLowerCase()}-list.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Image saved!');
    }, 'image/png');
  }, [exportText, factionMeta]);

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
            font-size: 12pt !important;
          }
          #print-area pre {
            color: black !important;
            font-size: 10pt !important;
            white-space: pre-wrap !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#8a8690] hover:text-[#c9a84c] transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        {/* Header */}
        <h1 className="font-serif text-xl font-bold text-[#c9a84c] mb-4">Export Army List</h1>

        {/* Tournament format toggle */}
        <button
          onClick={() => setTournamentFormat(!tournamentFormat)}
          className="flex items-center gap-2 mb-6 px-4 py-2.5 bg-[var(--bg-card)] border border-[#2a2a35] rounded-lg
                     hover:border-[#c9a84c] transition-colors w-full"
        >
          {tournamentFormat ? (
            <ToggleRight className="w-5 h-5 text-[#c9a84c]" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-[#8a8690]" />
          )}
          <span className={`text-sm font-medium ${tournamentFormat ? 'text-[#c9a84c]' : 'text-[#8a8690]'}`}>
            Tournament Format (ITC/GT)
          </span>
        </button>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#c9a84c] text-[#0a0a0f] font-semibold rounded-lg hover:bg-[#b8960f] transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-card)] border border-[#2a2a35] text-[#e8e4de] font-semibold rounded-lg hover:border-[#c9a84c] transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-card)] border border-[#2a2a35] text-[#e8e4de] font-semibold rounded-lg hover:border-[#c9a84c] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleGenerateImage}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--bg-card)] border border-[#2a2a35] text-[#e8e4de] font-semibold rounded-lg hover:border-[#c9a84c] transition-colors"
          >
            <Image className="w-4 h-4" />
            Save Image
          </button>
        </div>

        {/* Export text preview */}
        <div id="print-area" className="bg-[var(--bg-card)] border border-[#2a2a35] rounded-lg p-4 overflow-x-auto">
          <pre
            ref={textRef}
            className="text-xs text-[#e8e4de] font-mono whitespace-pre-wrap leading-relaxed"
          >
            {exportText}
          </pre>
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractModelCount(unitComposition: string): string | null {
  // Try to extract model count from strings like "10 Intercessors" or "5-10 models"
  const match = unitComposition.match(/(\d+)\s*(?:model|Model)/i);
  if (match) return match[1];
  const rangeMatch = unitComposition.match(/(\d+)-(\d+)/);
  if (rangeMatch) return rangeMatch[2];
  const singleMatch = unitComposition.match(/^(\d+)\s/);
  if (singleMatch) return singleMatch[1];
  return null;
}
