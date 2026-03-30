import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy } from '../contexts/ArmyContext';
import { getUnitsForFaction, getRulesForFaction } from '../data';
import { getRank, getXPProgress } from '../data/crusadeRules';
import { getDataFactionId } from '../lib/factions';
import type { Datasheet, FactionId } from '../types';

export default function ArmyUnitDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { unitId } = route.params as { unitId: string };
  const { colors } = useTheme();

  const {
    army, mode, factionId: armyFactionId,
    updateUnit, removeUnit, awardXP,
    addBattleHonour, addBattleScar, removeBattleScar,
  } = useArmy();
  const factionId: FactionId | null = (armyFactionId as FactionId) ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = useState(false);
  const [showSpendXP, setShowSpendXP] = useState(false);
  const [xpAmount, setXpAmount] = useState(1);
  const [editName, setEditName] = useState('');
  const [editPoints, setEditPoints] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [showEnhancementPicker, setShowEnhancementPicker] = useState(false);
  const [showStratagems, setShowStratagems] = useState(false);

  const unit = army.find(u => u.id === unitId);

  // Load matching datasheet from faction data
  const datasheet: Datasheet | undefined = useMemo(() => {
    if (!factionId || !unit) return undefined;
    const factionUnits = getUnitsForFaction(getDataFactionId(factionId));
    return factionUnits.find(ds => ds.name === unit.datasheet_name);
  }, [factionId, unit]);

  // Load faction enhancements from all detachments
  const factionEnhancements = useMemo(() => {
    if (!factionId) return [];
    const rules = getRulesForFaction(getDataFactionId(factionId));
    if (!rules) return [];
    const enhancements: { detachment: string; name: string; cost: string; text: string }[] = [];
    for (const det of rules.detachments) {
      for (const enh of det.enhancements) {
        enhancements.push({ detachment: det.name, ...enh });
      }
    }
    return enhancements;
  }, [factionId]);

  // Filter enhancements by unit keyword eligibility
  const filteredEnhancements = useMemo(() => {
    if (!datasheet) return factionEnhancements;
    const unitKeywords = [...(datasheet.keywords || []), ...(datasheet.faction_keywords || [])].map(k => k.toUpperCase());
    return factionEnhancements.filter(enh => {
      const match = enh.text.match(/^(.+?)\s+model only\b/i);
      if (!match) return true;
      const restrictions = match[1].split(/\s*(?:,\s*|\bor\b)\s*/i).map(s => s.trim().toUpperCase()).filter(Boolean);
      return restrictions.some(restriction => {
        if (unitKeywords.includes(restriction)) return true;
        const parts = restriction.split(/\s+/);
        if (parts.length > 1) return parts.every(part => unitKeywords.some(kw => kw.includes(part)));
        return unitKeywords.some(kw => kw === restriction);
      });
    });
  }, [factionEnhancements, datasheet]);

  // Match stratagems
  const matchingStratagems = useMemo(() => {
    if (!factionId || !datasheet) return [];
    const rules = getRulesForFaction(getDataFactionId(factionId));
    if (!rules) return [];
    const unitKeywords = [...datasheet.keywords, datasheet.name].map(k => k.toUpperCase());
    const genericKeywords = new Set(['IMPERIUM', 'CHAOS', 'XENOS', 'TYRANIDS', 'ORKS', 'AELDARI', 'DRUKHARI', 'NECRONS', "T'AU EMPIRE", 'LEAGUES OF VOTANN']);
    const results: { detachment: string; name: string; cp: string; type: string; when: string; target: string; effect: string; restrictions?: string }[] = [];
    for (const det of rules.detachments) {
      for (const strat of det.stratagems) {
        const targetUpper = strat.target.toUpperCase();
        const matched = unitKeywords.some(kw => {
          if (genericKeywords.has(kw)) return false;
          if (kw.length < 3) return false;
          return targetUpper.includes(kw);
        });
        if (matched) results.push({ detachment: det.name, ...strat });
      }
    }
    return results;
  }, [factionId, datasheet]);

  if (!unit) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, padding: 24 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{'< Back to Army'}</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 48, fontSize: 14 }}>Unit not found.</Text>
      </SafeAreaView>
    );
  }

  const factionName = factionId ? factionId.replace(/_/g, ' ') : '';
  const stats = datasheet?.stats ?? {};
  const invulnSave = datasheet?.invuln ?? null;
  const rangedWeapons = datasheet?.ranged_weapons ?? [];
  const meleeWeapons = datasheet?.melee_weapons ?? [];

  const abilities = datasheet ? (() => {
    const list: { name: string; description: string }[] = [];
    for (const core of datasheet.abilities.core) list.push({ name: core, description: 'Core ability' });
    for (const faction of datasheet.abilities.faction) list.push({ name: faction, description: 'Faction ability' });
    for (const [name, desc] of datasheet.abilities.other) list.push({ name, description: desc });
    return list;
  })() : [];

  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const xpProgress = getXPProgress(unit.experience_points, unit.is_character, unit.legendary_veterans);

  const handleAddBattleHonor = () => {
    addBattleHonour(unitId, { name: 'Battle Honour', type: 'Honour' });
    Alert.alert('Success', 'Battle Honour added!');
  };

  const handleAssignEnhancement = (enh: { name: string }) => {
    addBattleHonour(unitId, { name: enh.name, type: 'Enhancement' });
    setShowEnhancementPicker(false);
    Alert.alert('Success', `${enh.name} assigned!`);
  };

  const handleAddBattleScar = () => {
    addBattleScar(unitId, { name: 'Battle Scar', effect: 'No effect assigned' });
    Alert.alert('Success', 'Battle Scar added!');
  };

  const handleSpendXP = () => {
    if (xpAmount < 1) return;
    awardXP(unitId, xpAmount);
    Alert.alert('Success', `+${xpAmount} XP awarded!`);
    setShowSpendXP(false);
    setXpAmount(1);
  };

  const handleStartEdit = () => {
    setEditName(unit.custom_name);
    setEditPoints(unit.points_cost);
    setEditNotes('');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateUnit(unitId, { custom_name: editName, points_cost: editPoints });
    setIsEditing(false);
    Alert.alert('Success', 'Unit updated!');
  };

  const handleMarkDestroyed = () => {
    updateUnit(unitId, { is_destroyed: true });
    setShowDestroyConfirm(false);
    Alert.alert('Destroyed', 'Unit marked as destroyed');
    setTimeout(() => navigation.goBack(), 500);
  };

  const handleRemove = () => {
    removeUnit(unitId);
    setShowDeleteConfirm(false);
    Alert.alert('Removed', 'Unit removed from army');
    setTimeout(() => navigation.goBack(), 500);
  };

  // Weapon row renderer
  const renderWeapon = (w: any, type: 'ranged' | 'melee') => (
    <View key={w.name} style={[st.weaponRow, { borderColor: colors.borderColor }]}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 }}>{w.name}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {type === 'ranged' && <Text style={{ fontSize: 11, color: colors.textSecondary }}>Range: {w.range}</Text>}
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>A: {w.A}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>{type === 'ranged' ? 'BS' : 'WS'}: {w.skill}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>S: {w.S}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>AP: {w.AP}</Text>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>D: {w.D}</Text>
      </View>
      {w.traits.length > 0 && (
        <Text style={{ fontSize: 10, color: colors.accentGold, marginTop: 2 }}>{w.traits.join(', ')}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 96 }}>
        {/* Back button */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 24 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{'< Back to Army'}</Text>
        </TouchableOpacity>

        {/* Unit Header */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={{ color: '#3b82f6', fontSize: 16 }}>{'🛡'}</Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  {factionName}
                </Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, letterSpacing: 1, marginBottom: 4 }}>
                {unit.custom_name}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 8 }}>
                {unit.datasheet_name}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accentGold, fontFamily: 'monospace' }}>
                {unit.points_cost} pts
              </Text>
              <TouchableOpacity onPress={handleStartEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: colors.accentGold + 'B3' }}>{'✎'} Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* XP Bar (crusade) */}
        {mode === 'crusade' && (
          <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{rank.name}</Text>
              <Text style={{ fontSize: 12, color: colors.accentGold }}>{unit.experience_points} XP</Text>
            </View>
            <View style={{ height: 6, backgroundColor: colors.borderColor, borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 3, width: `${Math.round(xpProgress * 100)}%`, backgroundColor: rank.color }} />
            </View>
          </View>
        )}

        {/* Stats */}
        {Object.keys(stats).length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>UNIT STATISTICS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(stats).map(([key, value]) => (
                <View key={key} style={[st.statBox, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{key}</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, fontFamily: 'monospace' }}>{value}</Text>
                </View>
              ))}
            </View>
            {invulnSave && (
              <View style={[st.statBox, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginTop: 8 }]}>
                <Text style={{ fontSize: 10, color: '#a855f7', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Invulnerable Save</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#9333ea', fontFamily: 'monospace' }}>{invulnSave}</Text>
              </View>
            )}
          </View>
        )}

        {/* Ranged Weapons */}
        {rangedWeapons.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>RANGED WEAPONS</Text>
            {rangedWeapons.map(w => renderWeapon(w, 'ranged'))}
          </View>
        )}

        {/* Melee Weapons */}
        {meleeWeapons.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>MELEE WEAPONS</Text>
            {meleeWeapons.map(w => renderWeapon(w, 'melee'))}
          </View>
        )}

        {/* Wargear Options */}
        {datasheet?.wargear_options && datasheet.wargear_options.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>WARGEAR OPTIONS</Text>
            <View style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              {datasheet.wargear_options.map((opt, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: colors.textTertiary, marginBottom: 4 }}>
                  {'•'} {opt}
                </Text>
              ))}
            </View>
          </View>
        )}

        {/* Abilities - Collapsible */}
        {abilities.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setShowAbilities(!showAbilities)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={[st.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>
                ABILITIES ({abilities.length})
              </Text>
              <Text style={{ color: colors.accentGold, fontSize: 14 }}>{showAbilities ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showAbilities && abilities.map((ability, idx) => (
              <View key={idx} style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginBottom: 8 }]}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.accentGold, marginBottom: 4 }}>{ability.name}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>{ability.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stratagems - Collapsible */}
        {matchingStratagems.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <TouchableOpacity
              onPress={() => setShowStratagems(!showStratagems)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}
            >
              <Text style={[st.sectionTitle, { color: colors.textTertiary, marginBottom: 0 }]}>
                STRATAGEMS ({matchingStratagems.length})
              </Text>
              <Text style={{ color: colors.accentGold, fontSize: 14 }}>{showStratagems ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showStratagems && matchingStratagems.map((strat, idx) => (
              <View key={idx} style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#d97706', flex: 1 }}>{strat.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase' }}>{strat.type}</Text>
                    <View style={{ backgroundColor: '#d97706' + '1A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#d97706', fontFamily: 'monospace' }}>{strat.cp}</Text>
                    </View>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>{strat.detachment}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                  <Text style={{ fontWeight: '500', color: colors.textTertiary }}>When: </Text>{strat.when}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                  <Text style={{ fontWeight: '500', color: colors.textTertiary }}>Target: </Text>{strat.target}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }}>
                  <Text style={{ fontWeight: '500', color: colors.textTertiary }}>Effect: </Text>{strat.effect}
                </Text>
                {strat.restrictions && (
                  <Text style={{ fontSize: 12, color: '#ef4444' + 'B3', lineHeight: 16 }}>
                    <Text style={{ fontWeight: '500' }}>Restrictions: </Text>{strat.restrictions}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Crusade Progression */}
        {mode === 'crusade' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={[st.sectionTitle, { color: colors.textTertiary }]}>CRUSADE PROGRESSION</Text>

            {/* XP and Rank */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[st.statBox, { flex: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Crusade Points</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.accentGold, fontFamily: 'monospace' }}>{unit.experience_points}</Text>
              </View>
              <View style={[st.statBox, { flex: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Rank</Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.accentGold }}>{unit.rank}</Text>
              </View>
            </View>

            {/* Battles */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[st.statBox, { flex: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Battles Fought</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: 'monospace' }}>{unit.battles_played}</Text>
              </View>
              <View style={[st.statBox, { flex: 1, borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Battles Survived</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, fontFamily: 'monospace' }}>{unit.battles_survived}</Text>
              </View>
            </View>

            {/* Battle Honours */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Battle Honours
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  {filteredEnhancements.length > 0 && (
                    <TouchableOpacity onPress={() => setShowEnhancementPicker(true)}>
                      <Text style={{ fontSize: 12, color: '#a855f7' }}>Enhancement</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={handleAddBattleHonor}>
                    <Text style={{ fontSize: 12, color: colors.accentGold }}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {unit.battle_honours.map((honor, idx) => (
                <View key={honor.id || idx} style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginBottom: 8 }]}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#d97706', marginBottom: 4 }}>
                    {'★'} {honor.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{honor.type}</Text>
                </View>
              ))}
              {unit.battle_honours.length === 0 && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>No battle honours yet.</Text>
              )}
            </View>

            {/* Battle Scars */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  Battle Scars
                </Text>
                <TouchableOpacity onPress={handleAddBattleScar}>
                  <Text style={{ fontSize: 12, color: colors.accentGold }}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {unit.battle_scars.map((scar, idx) => (
                <View key={scar.id || idx} style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginBottom: 8 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#ef4444', marginBottom: 4 }}>{scar.name}</Text>
                    <TouchableOpacity onPress={() => removeBattleScar(unitId, scar.id)}>
                      <Text style={{ color: '#ef4444', fontSize: 12 }}>{'✕'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{scar.effect}</Text>
                </View>
              ))}
              {unit.battle_scars.length === 0 && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic' }}>No battle scars yet.</Text>
              )}
            </View>

            {/* Award XP Button */}
            <TouchableOpacity
              onPress={() => setShowSpendXP(true)}
              style={{
                backgroundColor: colors.accentGold,
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>{'★'} Award XP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.accentGold + '33', marginVertical: 16 }} />

        {/* Destructive Actions */}
        {mode === 'crusade' && (
          <TouchableOpacity
            onPress={() => setShowDestroyConfirm(true)}
            style={[st.destructiveBtn, { borderColor: '#ef444450', backgroundColor: '#ef44441A' }]}
          >
            <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 14 }}>{'💀'} Mark as Destroyed</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowDeleteConfirm(true)}
          style={[st.destructiveBtn, { borderColor: '#ef444450', backgroundColor: '#ef44441A', marginTop: 12 }]}
        >
          <Text style={{ color: '#ef4444', fontWeight: '600', fontSize: 14 }}>{'🗑'} Remove from Army</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Unit Modal */}
      <Modal visible={isEditing} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 }}>Edit Unit</Text>
            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Custom Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[st.modalInput, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
                />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Points Cost</Text>
                <TextInput
                  value={String(editPoints)}
                  onChangeText={t => setEditPoints(Number(t) || 0)}
                  keyboardType="numeric"
                  style={[st.modalInput, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
                />
              </View>
              <View>
                <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Notes</Text>
                <TextInput
                  value={editNotes}
                  onChangeText={setEditNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="Battle notes, lore, etc."
                  placeholderTextColor={colors.textSecondary}
                  style={[st.modalInput, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary, textAlignVertical: 'top', minHeight: 72 }]}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={[st.modalBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, flex: 1 }]}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveEdit} style={[st.modalBtn, { backgroundColor: colors.accentGold, flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhancement Picker Modal */}
      <Modal visible={showEnhancementPicker} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', flexGrow: 1 }}>
            <View style={[st.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>Assign Enhancement</Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>Select from your detachment</Text>
              {filteredEnhancements.map((enh, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleAssignEnhancement(enh)}
                  style={[st.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginBottom: 8, padding: 12 }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#9333ea' }}>{enh.name}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9333ea', fontFamily: 'monospace' }}>{enh.cost} pts</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 4 }}>{enh.detachment}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 16 }} numberOfLines={4}>{enh.text}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setShowEnhancementPicker(false)} style={[st.modalBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, marginTop: 8 }]}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Award XP Modal */}
      <Modal visible={showSpendXP} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>Award Experience</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }}>
              Current XP: <Text style={{ color: colors.accentGold, fontFamily: 'monospace' }}>{unit.experience_points}</Text>
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setXpAmount(Math.max(1, xpAmount - 1))}
                style={[st.xpBtn, { borderColor: colors.accentGold + '4D', backgroundColor: colors.bgCard }]}
              >
                <Text style={{ color: colors.accentGold, fontSize: 18, fontWeight: '700' }}>-</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 32, fontWeight: '700', color: colors.accentGold, fontFamily: 'monospace', width: 64, textAlign: 'center' }}>{xpAmount}</Text>
              <TouchableOpacity
                onPress={() => setXpAmount(xpAmount + 1)}
                style={[st.xpBtn, { borderColor: colors.accentGold + '4D', backgroundColor: colors.bgCard }]}
              >
                <Text style={{ color: colors.accentGold, fontSize: 18, fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setShowSpendXP(false); setXpAmount(1); }}
                style={[st.modalBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, flex: 1 }]}
              >
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSpendXP} style={[st.modalBtn, { backgroundColor: colors.accentGold, flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Award +{xpAmount} XP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Destroy Confirmation */}
      <Modal visible={showDestroyConfirm} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
            <Text style={{ fontSize: 30, textAlign: 'center', marginBottom: 16 }}>{'💀'}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>Mark as Destroyed?</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              This unit will be marked as destroyed but remain in your army for record keeping.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowDestroyConfirm(false)} style={[st.modalBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, flex: 1 }]}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMarkDestroyed} style={[st.modalBtn, { backgroundColor: '#dc2626', flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={[st.modalCard, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
            <Text style={{ fontSize: 30, textAlign: 'center', marginBottom: 16 }}>{'🗑'}</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>Remove from Army?</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              This will permanently remove this unit from your army. This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => setShowDeleteConfirm(false)} style={[st.modalBtn, { borderColor: colors.borderColor, backgroundColor: colors.bgCard, flex: 1 }]}>
                <Text style={{ color: colors.textTertiary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRemove} style={[st.modalBtn, { backgroundColor: '#dc2626', flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 4, padding: 12 },
  statBox: { borderWidth: 1, borderRadius: 4, padding: 12, minWidth: 90, alignItems: 'center' },
  weaponRow: { borderBottomWidth: 1, paddingBottom: 8, marginBottom: 8 },
  destructiveBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  modalBtn: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  xpBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
