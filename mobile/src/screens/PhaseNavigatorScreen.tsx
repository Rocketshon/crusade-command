import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy } from '../contexts/ArmyContext';
import { getRulesForFaction, getUnitsForFaction } from '../data';
import { getDataFactionId } from '../lib/factions';
import type { FactionId, DetachmentStratagem, Datasheet } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GamePhase = 'command' | 'movement' | 'shooting' | 'charge' | 'fight';

interface CoreStratagem {
  name: string;
  cp: string;
  type: string;
  when: string;
  target: string;
  effect: string;
  phases: GamePhase[];
}

interface PhaseConfig {
  key: GamePhase;
  label: string;
  color: string;
  activeColor: string;
  activeBg: string;
  borderTopColor: string;
}

const PHASE_LIST: PhaseConfig[] = [
  { key: 'command',  label: 'Command',  color: '#b8860b', activeColor: '#0a0a0a', activeBg: '#b8860b', borderTopColor: '#b8860b' },
  { key: 'movement', label: 'Movement', color: '#60a5fa', activeColor: '#ffffff', activeBg: '#2563eb', borderTopColor: '#3b82f6' },
  { key: 'shooting', label: 'Shooting', color: '#f87171', activeColor: '#ffffff', activeBg: '#dc2626', borderTopColor: '#ef4444' },
  { key: 'charge',   label: 'Charge',   color: '#fb923c', activeColor: '#ffffff', activeBg: '#ea580c', borderTopColor: '#f97316' },
  { key: 'fight',    label: 'Fight',    color: '#c084fc', activeColor: '#ffffff', activeBg: '#9333ea', borderTopColor: '#a855f7' },
];

// ---------------------------------------------------------------------------
// Core stratagems (10th edition universal)
// ---------------------------------------------------------------------------

const CORE_STRATAGEMS: CoreStratagem[] = [
  { name: 'Command Re-roll', cp: '1CP', type: 'Core Stratagem', when: 'Any phase, just after you have made a Hit roll, a Wound roll, a Damage roll, a saving throw, an Advance roll, a Charge roll, a Desperate Escape test, a Hazardous test, or just after you have rolled the dice to determine the number of attacks made with a weapon, for an attack, model or unit from your army.', target: 'N/A', effect: 'You re-roll that roll, test or saving throw.', phases: ['command', 'movement', 'shooting', 'charge', 'fight'] },
  { name: 'Counter-offensive', cp: '2CP', type: 'Core Stratagem', when: 'Fight phase, just after an enemy unit has fought.', target: 'One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.', effect: 'Your unit fights next.', phases: ['fight'] },
  { name: 'Epic Challenge', cp: '1CP', type: 'Core Stratagem', when: 'Fight phase, when a CHARACTER unit from your army that is within Engagement Range of one or more Attached units is selected to fight.', target: 'One CHARACTER model in your unit.', effect: 'Until the end of the phase, all melee attacks made by that model have the [PRECISION] ability.', phases: ['fight'] },
  { name: 'Fire Overwatch', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance, Fall Back or Charge move.", target: 'One unit from your army that is within 24" of that enemy unit and that would be eligible to shoot.', effect: 'Your unit can shoot that enemy unit as if it were your Shooting phase, but its models can only make Hit rolls on unmodified 6s.', phases: ['movement', 'charge'] },
  { name: 'Go to Ground', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.", target: "One INFANTRY unit from your army that was selected as the target of one or more of the attacking unit's attacks.", effect: 'Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the Benefit of Cover.', phases: ['shooting'] },
  { name: 'Grenade', cp: '1CP', type: 'Core Stratagem', when: 'Your Shooting phase.', target: 'One GRENADES unit from your army that is not within Engagement Range of any enemy units and has not been selected to shoot this phase.', effect: 'Select one enemy unit that is not within Engagement Range of any units from your army and is within 8" of and visible to your GRENADES unit. Roll six D6: for each 4+, that enemy unit suffers 1 mortal wound.', phases: ['shooting'] },
  { name: 'Heroic Intervention', cp: '2CP', type: 'Core Stratagem', when: "Your opponent's Charge phase, just after an enemy unit ends a Charge move.", target: 'One unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge in your turn.', effect: 'Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase.', phases: ['charge'] },
  { name: 'Insane Bravery', cp: '1CP', type: 'Core Stratagem', when: 'Any phase, just after you fail a Battle-shock test taken for a unit from your army.', target: 'The unit from your army that just failed that Battle-shock test.', effect: 'Your unit is treated as having passed that test instead, and is not Battle-shocked as a result.', phases: ['command', 'movement', 'shooting', 'charge', 'fight'] },
  { name: 'Rapid Ingress', cp: '1CP', type: 'Core Stratagem', when: "End of your opponent's Movement phase.", target: 'One unit from your army that is in Reserves.', effect: 'Your unit can be set up on the battlefield as described in the rules for the ability that placed it into Reserves.', phases: ['movement'] },
  { name: 'Smokescreen', cp: '1CP', type: 'Core Stratagem', when: "Your opponent's Shooting phase, just after an enemy unit has selected its targets.", target: "One SMOKE unit from your army that was selected as the target of one or more of the attacking unit's attacks.", effect: 'Until the end of the phase, all models in your unit have the Benefit of Cover and the Stealth ability.', phases: ['shooting'] },
  { name: 'Tank Shock', cp: '1CP', type: 'Core Stratagem', when: 'Your Charge phase.', target: 'One VEHICLE unit from your army that has not declared a charge this phase.', effect: 'In this phase, after your unit ends a Charge move, select one enemy unit within Engagement Range of it, then roll a number of D6 equal to the Toughness characteristic of your VEHICLE model that is closest to that enemy unit. For each 5+, that enemy unit suffers 1 mortal wound.', phases: ['charge'] },
];

// ---------------------------------------------------------------------------
// Phase parsing helpers
// ---------------------------------------------------------------------------

function parseStratagemPhases(when: string): GamePhase[] {
  const text = when.toLowerCase();
  const phases: GamePhase[] = [];
  if (/any\s*phase/i.test(text)) return ['command', 'movement', 'shooting', 'charge', 'fight'];
  if (/command\s*phase/i.test(text)) phases.push('command');
  if (/movement\s*phase/i.test(text) || /advance/i.test(text) || /fall\s*back/i.test(text)) phases.push('movement');
  if (/shooting\s*phase/i.test(text) || /overwatch/i.test(text)) phases.push('shooting');
  if (/charge\s*phase/i.test(text)) phases.push('charge');
  if (/fight\s*phase/i.test(text) || /pile\s*in/i.test(text) || /consolidat/i.test(text)) phases.push('fight');
  return phases.length > 0 ? phases : ['command'];
}

function parseAbilityPhases(text: string): GamePhase[] {
  const lower = text.toLowerCase();
  const phases: GamePhase[] = [];
  if (/command\s*phase/i.test(lower)) phases.push('command');
  if (/movement\s*phase/i.test(lower) || /advance/i.test(lower) || /fall\s*back/i.test(lower)) phases.push('movement');
  if (/shooting\s*phase/i.test(lower) || /shoot/i.test(lower) || /ranged/i.test(lower)) phases.push('shooting');
  if (/charge\s*phase/i.test(lower) || /charge/i.test(lower)) phases.push('charge');
  if (/fight\s*phase/i.test(lower) || /melee/i.test(lower) || /pile\s*in/i.test(lower)) phases.push('fight');
  return phases;
}

// ---------------------------------------------------------------------------
// Stratagem Card
// ---------------------------------------------------------------------------

function StratagemCard({
  strat,
  badge,
  phase,
  colors,
}: {
  strat: { name: string; cp?: string; type?: string; when?: string; target?: string; effect?: string; restrictions?: string };
  badge?: string;
  phase: GamePhase;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  const phaseConfig = PHASE_LIST.find((p) => p.key === phase)!;

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      style={[
        styles.stratCard,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.borderColor,
          borderTopColor: phaseConfig.borderTopColor,
        },
      ]}
    >
      <View style={styles.stratHeader}>
        <Text style={[styles.stratName, { color: colors.textPrimary }]} numberOfLines={expanded ? undefined : 1}>
          {strat.name}
        </Text>
        <View style={styles.stratBadges}>
          {badge && (
            <View style={[styles.badgePill, { backgroundColor: `${colors.borderColor}60` }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{badge}</Text>
            </View>
          )}
          {strat.cp && (
            <View style={[styles.cpPill, { backgroundColor: `${colors.accentGold}20`, borderColor: `${colors.accentGold}40` }]}>
              <Text style={[styles.cpText, { color: colors.accentGold }]}>{strat.cp}</Text>
            </View>
          )}
        </View>
      </View>
      {strat.type && (
        <Text style={[styles.stratType, { color: colors.textSecondary }]}>{strat.type}</Text>
      )}
      {expanded && (
        <View style={styles.stratDetails}>
          {strat.when && (
            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>When: </Text>
              {strat.when}
            </Text>
          )}
          {strat.target && (
            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Target: </Text>
              {strat.target}
            </Text>
          )}
          {strat.effect && (
            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Effect: </Text>
              {strat.effect}
            </Text>
          )}
          {strat.restrictions && (
            <Text style={[styles.detailText, { color: colors.textTertiary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Restrictions: </Text>
              {strat.restrictions}
            </Text>
          )}
        </View>
      )}
      {!expanded && strat.effect && (
        <Text style={[styles.stratEffectPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {strat.effect}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Unit Ability Row
// ---------------------------------------------------------------------------

function UnitAbilityRow({
  unitName,
  abilityName,
  abilityText,
  colors,
}: {
  unitName: string;
  abilityName: string;
  abilityText: string;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      style={[styles.abilityRow, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
    >
      <View style={styles.abilityHeader}>
        <Text style={[styles.abilityUnitName, { color: colors.accentGold }]}>{unitName}</Text>
        <Text style={[styles.abilityName, { color: colors.textPrimary }]} numberOfLines={expanded ? undefined : 1}>
          {abilityName}
        </Text>
      </View>
      {expanded && (
        <Text style={[styles.abilityText, { color: colors.textTertiary }]}>{abilityText}</Text>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function PhaseNavigatorScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { factionId, detachmentName, army } = useArmy();
  const [activePhase, setActivePhase] = useState<GamePhase>('command');

  const detachment = useMemo(() => {
    if (!factionId || !detachmentName) return null;
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const factionRules = getRulesForFaction(dataFactionId);
    return factionRules?.detachments?.find((d) => d.name === detachmentName) ?? null;
  }, [factionId, detachmentName]);

  const armyDatasheets = useMemo(() => {
    if (!factionId) return [];
    const dataFactionId = getDataFactionId(factionId as FactionId);
    const allUnits = getUnitsForFaction(dataFactionId);
    const datasheetMap = new Map<string, Datasheet>();
    for (const u of allUnits) datasheetMap.set(u.name, u);
    return army
      .map((unit) => ({ armyUnit: unit, datasheet: datasheetMap.get(unit.datasheet_name) }))
      .filter(
        (entry): entry is { armyUnit: typeof entry.armyUnit; datasheet: Datasheet } =>
          !!entry.datasheet,
      );
  }, [factionId, army]);

  const detachmentStratagems = useMemo(() => {
    if (!detachment) return [];
    return detachment.stratagems.filter((strat: DetachmentStratagem) => {
      const phases = parseStratagemPhases(strat.when);
      return phases.includes(activePhase);
    });
  }, [detachment, activePhase]);

  const coreStratagems = useMemo(
    () => CORE_STRATAGEMS.filter((s) => s.phases.includes(activePhase)),
    [activePhase],
  );

  const unitAbilities = useMemo(() => {
    const results: { unitName: string; abilityName: string; abilityText: string }[] = [];
    for (const { armyUnit, datasheet } of armyDatasheets) {
      const unitName = armyUnit.custom_name || armyUnit.datasheet_name;
      for (const [abilName, abilText] of datasheet.abilities.other) {
        const phases = parseAbilityPhases(`${abilName} ${abilText}`);
        if (phases.includes(activePhase)) {
          results.push({ unitName, abilityName: abilName, abilityText: abilText });
        }
      }
    }
    return results;
  }, [armyDatasheets, activePhase]);

  // No army selected
  if (!factionId) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Set up your army first to use the phase navigator.
        </Text>
        <TouchableOpacity
          style={[styles.goToArmyBtn, { backgroundColor: colors.accentGold }]}
          onPress={() => navigation.navigate('Army')}
          activeOpacity={0.8}
        >
          <Text style={[styles.goToArmyText, { color: colors.bgPrimary }]}>Go to Army</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textSecondary, fontSize: 11, letterSpacing: 1, marginTop: 24, marginBottom: 8 }}>TOOLS</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('DiceCalculator')}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Dice Calculator</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('LoreQuiz')}
            style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }}
            activeOpacity={0.7}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 13 }}>Lore Quiz</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.mainContainer, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'<'}</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Battle Aid</Text>
            {detachmentName && (
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {detachmentName}
              </Text>
            )}
          </View>
        </View>

        {/* Phase tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseTabsContent}
          style={styles.phaseTabs}
        >
          {PHASE_LIST.map((phase) => {
            const isActive = activePhase === phase.key;
            return (
              <TouchableOpacity
                key={phase.key}
                onPress={() => setActivePhase(phase.key)}
                style={[
                  styles.phaseTab,
                  {
                    backgroundColor: isActive ? phase.activeBg : colors.bgCard,
                    borderColor: isActive ? phase.activeBg : `${phase.color}50`,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.phaseTabText,
                    { color: isActive ? phase.activeColor : phase.color },
                  ]}
                >
                  {phase.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tools */}
      <View style={styles.toolsRow}>
        <TouchableOpacity
          style={[styles.toolCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
          onPress={() => navigation.navigate('DiceCalculator')}
          activeOpacity={0.7}
        >
          <Text style={styles.toolIcon}>{'\uD83C\uDFB2'}</Text>
          <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Dice Calculator</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
          onPress={() => navigation.navigate('LoreQuiz')}
          activeOpacity={0.7}
        >
          <Text style={styles.toolIcon}>{'\uD83E\uDDE0'}</Text>
          <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>Lore Quiz</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {detachmentStratagems.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.accentGold }]}>YOUR STRATAGEMS</Text>
            <View style={styles.sectionCards}>
              {detachmentStratagems.map((strat, idx) => (
                <StratagemCard key={`det-${idx}`} strat={strat} phase={activePhase} colors={colors} />
              ))}
            </View>
          </View>
        )}

        {coreStratagems.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CORE STRATAGEMS</Text>
            <View style={styles.sectionCards}>
              {coreStratagems.map((strat, idx) => (
                <StratagemCard
                  key={`core-${idx}`}
                  strat={strat}
                  badge="Core"
                  phase={activePhase}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {unitAbilities.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              YOUR UNITS' ABILITIES
            </Text>
            <View style={styles.sectionCards}>
              {unitAbilities.map((ability, idx) => (
                <UnitAbilityRow
                  key={`ability-${idx}`}
                  unitName={ability.unitName}
                  abilityName={ability.abilityName}
                  abilityText={ability.abilityText}
                  colors={colors}
                />
              ))}
            </View>
          </View>
        )}

        {detachmentStratagems.length === 0 &&
          coreStratagems.length === 0 &&
          unitAbilities.length === 0 && (
            <View style={styles.noContent}>
              <Text style={[styles.noContentText, { color: colors.textSecondary }]}>
                No content for this phase.
              </Text>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Empty / no-army state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 16,
  },
  goToArmyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goToArmyText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Main layout
  mainContainer: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
  },

  // Phase tabs
  phaseTabs: {
    marginHorizontal: -16,
  },
  phaseTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  phaseTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  phaseTabText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Content
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 24,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  sectionCards: {
    gap: 8,
  },

  // Stratagem card
  stratCard: {
    padding: 16,
    borderWidth: 2,
    borderTopWidth: 4,
    borderRadius: 8,
  },
  stratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  stratName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  stratBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cpPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  cpText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stratType: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stratDetails: {
    marginTop: 8,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailLabel: {
    fontWeight: '600',
  },
  stratEffectPreview: {
    fontSize: 12,
    marginTop: 4,
  },

  // Ability row
  abilityRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
  },
  abilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  abilityUnitName: {
    fontSize: 12,
    fontWeight: '600',
  },
  abilityName: {
    fontSize: 12,
    flex: 1,
  },
  abilityText: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  // Tools row
  toolsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toolCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 8,
  },
  toolIcon: {
    fontSize: 18,
  },
  toolLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // No content
  noContent: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  noContentText: {
    fontSize: 14,
  },
});
