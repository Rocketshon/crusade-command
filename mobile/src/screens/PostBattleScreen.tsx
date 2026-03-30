import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy, type ArmyUnit } from '../contexts/ArmyContext';
import { OFFICIAL_BATTLE_SCARS } from '../data/crusadeRules';
import { bggSearchGame, bggGameUrl } from '../lib/apiServices';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BattleResult = 'win' | 'loss' | 'draw';

interface UnitResult {
  unitId: string;
  survived: boolean;
  kills: number;
  xpGained: number;
  markedForGreatness: boolean;
}

type OATOutcome = 'pass' | 'devastating_blow' | 'battle_scar' | null;

interface OATState {
  unitId: string;
  roll: number | null;
  outcome: OATOutcome;
  selectedScar: string | null;
}

// ---------------------------------------------------------------------------
// Unit row
// ---------------------------------------------------------------------------

function UnitResultRow({
  unit, result, isMFG, onToggleMFG, onChange, colors,
}: {
  unit: ArmyUnit;
  result: UnitResult;
  isMFG: boolean;
  onToggleMFG: () => void;
  onChange: (updates: Partial<UnitResult>) => void;
  colors: any;
}) {
  const blockedScars = ['Disgraced', 'Mark of Shame'];
  const blocked = unit.battle_scars.some(s => blockedScars.includes(s.name));

  return (
    <View style={[s.unitCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
            {unit.custom_name || unit.datasheet_name}
          </Text>
          {unit.custom_name ? (
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{unit.datasheet_name}</Text>
          ) : null}
        </View>
        {/* MFG star */}
        <TouchableOpacity
          onPress={blocked ? undefined : onToggleMFG}
          disabled={blocked}
          style={[
            s.mfgBtn,
            {
              borderColor: blocked
                ? colors.borderColor
                : isMFG
                ? colors.accentGold
                : colors.borderColor,
              backgroundColor: isMFG ? colors.accentGold + '33' : 'transparent',
              opacity: blocked ? 0.3 : 1,
            },
          ]}
        >
          <Text style={{ color: isMFG ? colors.accentGold : colors.textSecondary, fontSize: 14 }}>{'★'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Survived toggle */}
        <TouchableOpacity
          onPress={() => onChange({ survived: !result.survived })}
          style={[
            s.survivalBtn,
            {
              borderColor: result.survived ? '#16a34a66' : '#ef444466',
              backgroundColor: result.survived ? '#16a34a1A' : '#ef44441A',
            },
          ]}
        >
          <Text style={{ color: result.survived ? '#16a34a' : '#ef4444', fontSize: 12, fontWeight: '500' }}>
            {result.survived ? '✓ Survived' : '💀 Destroyed'}
          </Text>
        </TouchableOpacity>

        {/* Kills */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{'💀'}</Text>
          <TouchableOpacity
            onPress={() => onChange({ kills: Math.max(0, result.kills - 1) })}
            style={[s.smallBtn, { borderColor: colors.borderColor }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>-</Text>
          </TouchableOpacity>
          <Text style={{ width: 20, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{result.kills}</Text>
          <TouchableOpacity
            onPress={() => onChange({ kills: result.kills + 1 })}
            style={[s.smallBtn, { borderColor: colors.borderColor }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>+</Text>
          </TouchableOpacity>
        </View>

        {/* XP */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.accentGold, fontSize: 10 }}>{'⚡'}</Text>
          <TouchableOpacity
            onPress={() => onChange({ xpGained: Math.max(0, result.xpGained - 1) })}
            style={[s.smallBtn, { borderColor: colors.borderColor }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>-</Text>
          </TouchableOpacity>
          <Text style={{ width: 20, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.accentGold }}>{result.xpGained}</Text>
          <TouchableOpacity
            onPress={() => onChange({ xpGained: result.xpGained + 1 })}
            style={[s.smallBtn, { borderColor: colors.borderColor }]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Out of Action section
// ---------------------------------------------------------------------------

function OutOfActionSection({
  destroyedUnits, oatStates, onRoll, onChooseOutcome, onChooseScar, colors,
}: {
  destroyedUnits: ArmyUnit[];
  oatStates: OATState[];
  onRoll: (unitId: string) => void;
  onChooseOutcome: (unitId: string, outcome: 'devastating_blow' | 'battle_scar') => void;
  onChooseScar: (unitId: string, scarId: string) => void;
  colors: any;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Text style={{ color: '#ef4444', fontSize: 14 }}>{'🎲'}</Text>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>Out of Action Tests</Text>
      </View>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
        Roll D6 for each destroyed unit. On a 1: choose Devastating Blow or Battle Scar. On 2+: no effect.
      </Text>
      {destroyedUnits.map(unit => {
        const state = oatStates.find(st => st.unitId === unit.id);
        if (!state) return null;
        return (
          <View key={unit.id} style={[s.unitCard, { backgroundColor: colors.bgCard, borderColor: '#ef444450' }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 }}>
              {unit.custom_name || unit.datasheet_name}
            </Text>
            {state.roll === null ? (
              <TouchableOpacity
                onPress={() => onRoll(unit.id)}
                style={{ paddingVertical: 8, borderWidth: 1, borderColor: '#ef444466', backgroundColor: '#ef44441A', borderRadius: 4, alignItems: 'center' }}
              >
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>{'🎲'} Roll D6</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
                    borderColor: state.roll === 1 ? '#ef4444' : '#16a34a',
                    backgroundColor: state.roll === 1 ? '#ef44441A' : '#16a34a1A',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: state.roll === 1 ? '#ef4444' : '#16a34a' }}>{state.roll}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {state.roll === 1 ? 'Failed -- choose consequence' : 'Passed -- no effect'}
                  </Text>
                </View>
                {state.roll === 1 && state.outcome === null && (() => {
                  const mustDevBlow = unit.battle_scars.length >= 3;
                  if (mustDevBlow) {
                    return (
                      <View>
                        <Text style={{ fontSize: 10, color: '#fbbf24', marginBottom: 6 }}>Unit already has 3 scars -- must take Devastating Blow.</Text>
                        <TouchableOpacity
                          onPress={() => onChooseOutcome(unit.id, 'devastating_blow')}
                          style={{ paddingVertical: 8, borderWidth: 1, borderColor: colors.accentGold + '66', backgroundColor: colors.accentGold + '1A', borderRadius: 4, alignItems: 'center' }}
                        >
                          <Text style={{ color: '#fbbf24', fontSize: 12, fontWeight: '600' }}>Devastating Blow -- Lose a Battle Honour</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }
                  return (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: colors.accentGold + '66', backgroundColor: colors.accentGold + '1A', borderRadius: 4, alignItems: 'center' }}
                        onPress={() => onChooseOutcome(unit.id, 'devastating_blow')}
                      >
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '600' }}>Devastating Blow</Text>
                        <Text style={{ color: '#fbbf24', fontSize: 10 }}>Lose a Battle Honour</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#ef444466', backgroundColor: '#ef44441A', borderRadius: 4, alignItems: 'center' }}
                        onPress={() => onChooseOutcome(unit.id, 'battle_scar')}
                      >
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '600' }}>Battle Scar</Text>
                        <Text style={{ color: '#ef4444', fontSize: 10 }}>Gain a Battle Scar</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
                {state.roll === 1 && state.outcome === 'battle_scar' && state.selectedScar === null && (
                  <View style={{ marginTop: 4, gap: 6 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 }}>Choose Battle Scar</Text>
                    {OFFICIAL_BATTLE_SCARS.filter(sc => !unit.battle_scars.some(us => us.name === sc.name)).map(scar => (
                      <TouchableOpacity
                        key={scar.id}
                        onPress={() => onChooseScar(unit.id, scar.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.borderColor, backgroundColor: colors.bgPrimary, borderRadius: 4 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#fca5a5' }}>{scar.name}</Text>
                        <Text style={{ fontSize: 10, color: colors.textSecondary }}>{scar.effect}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {state.roll === 1 && state.outcome !== null && (state.outcome !== 'battle_scar' || state.selectedScar !== null) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#16a34a', fontSize: 12 }}>
                      {'✓'} {state.outcome === 'devastating_blow' ? 'Devastating Blow noted' : `Battle Scar: ${OFFICIAL_BATTLE_SCARS.find(sc => sc.id === state.selectedScar)?.name ?? 'Unknown'}`}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function PostBattleScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { army, crusade, recordBattle, addBattleScar, removeBattleHonour } = useArmy();

  const [battleResult, setBattleResult] = useState<BattleResult>('win');
  const [opponent, setOpponent] = useState('');
  const [missionName, setMissionName] = useState('');
  const [rpGained, setRpGained] = useState(1);
  const [mfgUnitId, setMfgUnitId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'battle' | 'oat' | 'done'>('battle');
  const [oatStates, setOatStates] = useState<OATState[]>([]);
  const [bggLoading, setBggLoading] = useState(false);

  const activeUnits = army.filter(u => !u.is_destroyed);

  const [unitResults, setUnitResults] = useState<UnitResult[]>(() =>
    activeUnits.map(u => ({
      unitId: u.id,
      survived: true,
      kills: 0,
      xpGained: 1,
      markedForGreatness: false,
    }))
  );

  if (!crusade) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>No active Crusade campaign.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accentGold, fontSize: 14 }}>{'<'} Back to Army</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const updateUnitResult = (unitId: string, updates: Partial<UnitResult>) => {
    setUnitResults(prev => prev.map(r => r.unitId === unitId ? { ...r, ...updates } : r));
  };

  const destroyedUnits = activeUnits.filter(u => {
    const r = unitResults.find(rr => rr.unitId === u.id);
    return r && !r.survived;
  });

  const handleSave = () => {
    recordBattle({
      result: battleResult,
      opponent: opponent.trim() || undefined,
      missionName: missionName.trim() || undefined,
      rpGained,
      unitResults: unitResults.map(r => ({
        ...r,
        markedForGreatness: r.unitId === mfgUnitId,
      })),
    });
    Alert.alert('Success', 'Battle recorded!');
    if (destroyedUnits.length > 0) {
      setOatStates(destroyedUnits.map(u => ({ unitId: u.id, roll: null, outcome: null, selectedScar: null })));
      setPhase('oat');
    } else {
      setPhase('done');
    }
  };

  const handleOATRoll = (unitId: string) => {
    const roll = Math.ceil(Math.random() * 6);
    setOatStates(prev => prev.map(st => st.unitId === unitId ? { ...st, roll, outcome: roll === 1 ? null : 'pass' } : st));
  };

  const handleOATOutcome = (unitId: string, outcome: 'devastating_blow' | 'battle_scar') => {
    if (outcome === 'devastating_blow') {
      const unit = army.find(u => u.id === unitId);
      if (unit && unit.battle_honours.length > 0) {
        removeBattleHonour(unitId, unit.battle_honours[unit.battle_honours.length - 1].id);
      }
    }
    setOatStates(prev => prev.map(st => st.unitId === unitId ? { ...st, outcome } : st));
  };

  const handleOATScar = (unitId: string, scarId: string) => {
    const scar = OFFICIAL_BATTLE_SCARS.find(sc => sc.id === scarId);
    if (scar) addBattleScar(unitId, { name: scar.name, effect: scar.effect });
    setOatStates(prev => prev.map(st => st.unitId === unitId ? { ...st, selectedScar: scarId } : st));
  };

  const allOATResolved = oatStates.every(st =>
    st.roll !== null && (st.outcome === 'pass' || st.outcome === 'devastating_blow' || (st.outcome === 'battle_scar' && st.selectedScar !== null))
  );

  const handleLogToBGG = async () => {
    setBggLoading(true);
    try {
      const game = await bggSearchGame('warhammer 40000');
      if (game) {
        await Linking.openURL(bggGameUrl(game.id));
      } else {
        Alert.alert('Not Found', 'Could not find Warhammer 40,000 on BoardGameGeek.');
      }
    } catch {
      Alert.alert('Error', 'Could not open BoardGameGeek.');
    }
    setBggLoading(false);
  };

  // OAT phase
  if (phase === 'oat') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={[s.headerBar, { borderColor: colors.borderColor }]}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Out of Action</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            {destroyedUnits.length} unit{destroyedUnits.length !== 1 ? 's' : ''} destroyed
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <OutOfActionSection
            destroyedUnits={destroyedUnits}
            oatStates={oatStates}
            onRoll={handleOATRoll}
            onChooseOutcome={handleOATOutcome}
            onChooseScar={handleOATScar}
            colors={colors}
          />
          <TouchableOpacity
            onPress={() => setPhase('done')}
            disabled={!allOATResolved}
            style={{
              paddingVertical: 14, borderWidth: 1, borderColor: colors.accentGold,
              backgroundColor: colors.accentGold + '1A', borderRadius: 8, alignItems: 'center',
              opacity: allOATResolved ? 1 : 0.4,
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>{'✓'} Done</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPhase('done')} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Skip OAT Tests</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Done phase - show BGG logging
  if (phase === 'done') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={[s.headerBar, { borderColor: colors.borderColor }]}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Battle Complete</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
            Battle recorded successfully
          </Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>{'\uD83C\uDFC6'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' }}>
            Battle record saved!
          </Text>

          <TouchableOpacity
            onPress={handleLogToBGG}
            disabled={bggLoading}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 14,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: colors.accentGold + '66',
              backgroundColor: colors.accentGold + '1A',
              borderRadius: 8,
              marginTop: 16,
              opacity: bggLoading ? 0.5 : 1,
            }}
          >
            {bggLoading ? (
              <ActivityIndicator size="small" color="${colors.accentGold}" />
            ) : (
              <Text style={{ fontSize: 18 }}>{'\uD83C\uDFB2'}</Text>
            )}
            <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>Log to BoardGameGeek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderWidth: 1,
              borderColor: colors.accentGold,
              backgroundColor: colors.accentGold + '1A',
              borderRadius: 8,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>Back to Army</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const resultOptions: { value: BattleResult; label: string; emoji: string; style: { border: string; bg: string; text: string } }[] = [
    { value: 'win', label: 'Victory', emoji: '🏆', style: { border: '#16a34a80', bg: '#16a34a1A', text: '#16a34a' } },
    { value: 'draw', label: 'Draw', emoji: '—', style: { border: '#eab30880', bg: '#eab3081A', text: '#eab308' } },
    { value: 'loss', label: 'Defeat', emoji: '💀', style: { border: '#ef444480', bg: '#ef44441A', text: '#ef4444' } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <View style={[s.headerBar, { borderColor: colors.borderColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Record Battle</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
        {/* Battle result */}
        <View>
          <Text style={[s.label, { color: colors.textSecondary }]}>RESULT</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {resultOptions.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setBattleResult(opt.value)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  alignItems: 'center',
                  borderColor: battleResult === opt.value ? opt.style.border : colors.borderColor,
                  backgroundColor: battleResult === opt.value ? opt.style.bg : 'transparent',
                }}
              >
                <Text style={{ fontSize: 18, marginBottom: 4 }}>{opt.emoji}</Text>
                <Text style={{
                  fontSize: 12, fontWeight: '600',
                  color: battleResult === opt.value ? opt.style.text : colors.textSecondary,
                }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Opponent + Mission */}
        <View style={{ gap: 12 }}>
          <View>
            <Text style={[s.label, { color: colors.textSecondary }]}>OPPONENT (OPTIONAL)</Text>
            <TextInput
              value={opponent}
              onChangeText={setOpponent}
              placeholder="Who did you fight?"
              placeholderTextColor={colors.textSecondary}
              style={[s.input, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
            />
          </View>
          <View>
            <Text style={[s.label, { color: colors.textSecondary }]}>MISSION (OPTIONAL)</Text>
            <TextInput
              value={missionName}
              onChangeText={setMissionName}
              placeholder="Mission name"
              placeholderTextColor={colors.textSecondary}
              style={[s.input, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
            />
          </View>
        </View>

        {/* RP Gained */}
        <View>
          <Text style={[s.label, { color: colors.textSecondary }]}>REQUISITION POINTS GAINED</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setRpGained(v => Math.max(0, v - 1))}
              style={[s.counterBtn, { borderColor: colors.borderColor }]}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '700' }}>-</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.accentGold, width: 24, textAlign: 'center' }}>{rpGained}</Text>
            <TouchableOpacity
              onPress={() => setRpGained(v => Math.min(10, v + 1))}
              style={[s.counterBtn, { borderColor: colors.borderColor }]}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 18, fontWeight: '700' }}>+</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>RP</Text>
          </View>
        </View>

        {/* Unit results */}
        {activeUnits.length > 0 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
              <Text style={[s.label, { color: colors.textSecondary, marginBottom: 0 }]}>UNITS</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{'★'} = Marked for Greatness (+3 XP)</Text>
            </View>
            <View style={{ gap: 8 }}>
              {activeUnits.map(unit => {
                const result = unitResults.find(r => r.unitId === unit.id);
                if (!result) return null;
                return (
                  <UnitResultRow
                    key={unit.id}
                    unit={unit}
                    result={result}
                    isMFG={mfgUnitId === unit.id}
                    onToggleMFG={() => setMfgUnitId(prev => prev === unit.id ? null : unit.id)}
                    onChange={updates => updateUnitResult(unit.id, updates)}
                    colors={colors}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          style={{
            paddingVertical: 14, borderWidth: 1, borderColor: colors.accentGold,
            backgroundColor: colors.accentGold + '1A', borderRadius: 8, alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>{'✓'} Save Battle Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  mfgBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  survivalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
  smallBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
