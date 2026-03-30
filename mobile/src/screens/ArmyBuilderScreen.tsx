import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy, type ArmyUnit } from '../contexts/ArmyContext';
import { useCollection } from '../contexts/CollectionContext';
import { searchUnits } from '../data';
import { getRank, getHonourSlots, getXPProgress } from '../data/crusadeRules';
import type { Datasheet } from '../types';

// ---------------------------------------------------------------------------
// XP progress bar (crusade)
// ---------------------------------------------------------------------------

function XPBar({ unit, colors }: { unit: ArmyUnit; colors: any }) {
  const progress = getXPProgress(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  return (
    <View style={{ height: 4, backgroundColor: colors.borderColor, borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
      <View
        style={{
          height: '100%',
          borderRadius: 2,
          width: `${Math.round(progress * 100)}%`,
          backgroundColor: rank.color,
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Crusade campaign dashboard
// ---------------------------------------------------------------------------

function CrusadeDashboard({ colors }: { colors: any }) {
  const {
    crusade, factionId, detachmentName, supplyLimit, army,
    spendRP, gainRP, updateFactionPoints, setCampaignRecord, setSupplyLimit,
  } = useArmy();
  const [editingRecord, setEditingRecord] = useState(false);
  const [draftWins, setDraftWins] = useState(0);
  const [draftLosses, setDraftLosses] = useState(0);
  const [draftDraws, setDraftDraws] = useState(0);

  if (!crusade) return null;

  const supplyUsed = army.filter(u => !u.is_destroyed).reduce((s, u) => s + u.points_cost, 0);
  const supplyPct = Math.min(100, Math.round((supplyUsed / supplyLimit) * 100));

  const openEdit = () => {
    setDraftWins(crusade.wins);
    setDraftLosses(crusade.losses);
    setDraftDraws(crusade.draws);
    setEditingRecord(true);
  };
  const saveEdit = () => {
    setCampaignRecord(draftWins, draftLosses, draftDraws);
    setEditingRecord(false);
  };

  return (
    <View style={[ds.dashCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
      {/* Faction + detachment */}
      <View style={ds.dashHeader}>
        <View>
          <Text style={[ds.factionLabel, { color: colors.textSecondary }]}>
            {factionId?.replace(/_/g, ' ')}
          </Text>
          {detachmentName ? (
            <Text style={{ fontSize: 10, color: colors.textSecondary + '99' }}>{detachmentName}</Text>
          ) : null}
        </View>
        {/* W/L/D */}
        {editingRecord ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {([
              ['W', draftWins, setDraftWins, '#16a34a'],
              ['L', draftLosses, setDraftLosses, '#ef4444'],
              ['D', draftDraws, setDraftDraws, '#9ca3af'],
            ] as [string, number, (v: number) => void, string][]).map(([l, v, setter, c]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: c }}>{l}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <TouchableOpacity onPress={() => setter(Math.max(0, v - 1))}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: c, fontSize: 12, fontWeight: '700', width: 16, textAlign: 'center' }}>{v}</Text>
                  <TouchableOpacity onPress={() => setter(v + 1)}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity
              onPress={saveEdit}
              style={{ marginLeft: 4, width: 24, height: 24, borderRadius: 4, backgroundColor: colors.accentGold + '33', borderWidth: 1, borderColor: colors.accentGold + '66', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: colors.accentGold, fontSize: 12, fontWeight: '700' }}>{'✓'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[['W', crusade.wins, '#16a34a'], ['L', crusade.losses, '#ef4444'], ['D', crusade.draws, '#9ca3af']].map(([l, v, c]) => (
                <View key={String(l)} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: String(c) }}>{String(v)}</Text>
                  <Text style={{ fontSize: 9, color: colors.textSecondary }}>{l}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={openEdit}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{'✎'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* RP pips */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[ds.sectionLabel, { color: colors.textSecondary }]}>REQUISITION POINTS</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => spendRP(1)} style={[ds.rpBtn, { borderColor: colors.borderColor }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>-1</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accentGold }}>{crusade.rp} / 10</Text>
            <TouchableOpacity onPress={() => gainRP(1)} style={[ds.rpBtn, { borderColor: colors.borderColor }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>+1</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 2,
                backgroundColor: i < crusade.rp ? colors.accentGold : colors.borderColor,
              }}
            />
          ))}
        </View>
      </View>

      {/* Supply gauge */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[ds.sectionLabel, { color: colors.textSecondary }]}>SUPPLY</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: supplyUsed > supplyLimit ? '#ef4444' : colors.accentGold }}>
              {supplyUsed} / {supplyLimit} pts
            </Text>
            <TouchableOpacity
              onPress={() => { spendRP(1); setSupplyLimit(supplyLimit + 200); }}
              disabled={crusade.rp < 1}
              style={[ds.rpBtn, { borderColor: colors.borderColor, opacity: crusade.rp < 1 ? 0.4 : 1 }]}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>+200</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ height: 6, backgroundColor: colors.borderColor, borderRadius: 3, overflow: 'hidden' }}>
          <View
            style={{
              height: '100%',
              borderRadius: 3,
              width: `${supplyPct}%`,
              backgroundColor: supplyUsed > supplyLimit ? '#ef4444' : colors.accentGold,
            }}
          />
        </View>
      </View>

      {/* Faction mechanic */}
      {crusade.factionPointsLabel !== 'Points' && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[ds.sectionLabel, { color: colors.textSecondary }]}>{crusade.factionPointsLabel.toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={() => updateFactionPoints(-1)} style={[ds.rpBtn, { borderColor: colors.borderColor }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>-1</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{crusade.factionPoints}</Text>
            <TouchableOpacity onPress={() => updateFactionPoints(1)} style={[ds.rpBtn, { borderColor: colors.borderColor }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>+1</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const ds = StyleSheet.create({
  dashCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  dashHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  factionLabel: { fontSize: 12, textTransform: 'capitalize' },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },
  rpBtn: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
});

// ---------------------------------------------------------------------------
// Unit card — Normal mode
// ---------------------------------------------------------------------------

function NormalUnitCard({
  unit, colors, onRemove, onEdit,
}: {
  unit: ArmyUnit; colors: any; onRemove: () => void; onEdit: () => void;
}) {
  return (
    <View style={[ns.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
      <TouchableOpacity style={{ flex: 1 }} onPress={onEdit}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {unit.is_character && <Text style={{ color: '#3b82f6', fontSize: 12 }}>{'🛡'}</Text>}
          <Text style={[ns.name, { color: colors.textPrimary }]} numberOfLines={1}>{unit.custom_name}</Text>
        </View>
        {unit.wargear_notes ? (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
            {unit.wargear_notes}
          </Text>
        ) : null}
        {unit.faction_id !== '' && (
          <Text style={{ fontSize: 10, color: colors.textSecondary + '99', marginTop: 2 }}>
            {unit.faction_id.replace(/_/g, ' ')}
          </Text>
        )}
      </TouchableOpacity>
      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.accentGold, marginHorizontal: 8 }}>
        {unit.points_cost} pts
      </Text>
      <TouchableOpacity onPress={onRemove}>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{'🗑'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const ns = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '500' },
});

// ---------------------------------------------------------------------------
// Unit card — Crusade mode
// ---------------------------------------------------------------------------

function CrusadeUnitCard({ unit, colors, onPress }: { unit: ArmyUnit; colors: any; onPress: () => void }) {
  const rank = getRank(unit.experience_points, unit.is_character, unit.legendary_veterans);
  const slots = getHonourSlots(unit.experience_points, unit.is_character, unit.legendary_veterans);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={unit.is_destroyed}
      style={[
        cs.card,
        {
          borderColor: unit.is_destroyed
            ? colors.borderColor
            : unit.battle_scars.length > 0
            ? '#ef444450'
            : colors.borderColor,
          backgroundColor: colors.bgCard,
          opacity: unit.is_destroyed ? 0.5 : 1,
        },
      ]}
      activeOpacity={0.7}
    >
      {/* Rank dot */}
      <View style={[cs.rankDot, { backgroundColor: rank.color }]} />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {unit.is_warlord && <Text style={{ color: colors.accentGold, fontSize: 10 }}>{'★'}</Text>}
          {unit.is_character && <Text style={{ color: '#3b82f6', fontSize: 10 }}>{'🛡'}</Text>}
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }} numberOfLines={1}>
            {unit.custom_name}
          </Text>
          {unit.is_destroyed && <Text style={{ color: '#ef4444', fontSize: 10 }}>{'💀'}</Text>}
        </View>
        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
          {rank.name} · {unit.experience_points} XP · {unit.points_cost} pts
        </Text>
        <XPBar unit={unit} colors={colors} />
      </View>

      {/* Honour slots */}
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {slots > 0 && (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {Array.from({ length: slots }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: i < unit.battle_honours.length ? colors.accentGold : colors.borderColor,
                  backgroundColor: i < unit.battle_honours.length ? colors.accentGold : 'transparent',
                }}
              />
            ))}
          </View>
        )}
        {unit.battle_scars.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {unit.battle_scars.map(s => (
              <View key={s.id} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
            ))}
          </View>
        )}
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{'>'}</Text>
    </TouchableOpacity>
  );
}

const cs = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  rankDot: { width: 10, height: 10, borderRadius: 5 },
});

// ---------------------------------------------------------------------------
// Add unit modal
// ---------------------------------------------------------------------------

function AddUnitModal({ visible, onClose, mode, colors }: { visible: boolean; onClose: () => void; mode: 'standard' | 'crusade'; colors: any }) {
  const { addUnit } = useArmy();
  const { items: collectionItems } = useCollection();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Datasheet | null>(null);
  const [customName, setCustomName] = useState('');
  const [pointsOverride, setPointsOverride] = useState('');
  const [wargearNotes, setWargearNotes] = useState('');
  const [selectedWargear, setSelectedWargear] = useState<string[]>([]);

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const allResults = searchUnits(query);
    const collectionNames = new Set(collectionItems.map(i => i.name.toLowerCase()));
    return allResults.slice(0, 10).map(u => ({
      ...u,
      inCollection: collectionNames.has(u.name.toLowerCase()),
    }));
  }, [query, collectionItems]);

  const handleSelect = (unit: Datasheet) => {
    setSelected(unit);
    setQuery(unit.name);
    setCustomName('');
    setPointsOverride(unit.points[0]?.cost ?? '0');
    setSelectedWargear([]);
    setWargearNotes('');
  };

  const toggleWargear = (opt: string) => {
    setSelectedWargear(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  const handleAdd = () => {
    if (!selected) return;
    const parts = [...selectedWargear, ...(wargearNotes.trim() ? [wargearNotes.trim()] : [])];
    addUnit({
      datasheetName: selected.name,
      customName: customName.trim(),
      pointsCost: parseInt(pointsOverride, 10) || 0,
      factionId: selected.faction_id,
      isCharacter: selected.keywords.includes('CHARACTER'),
      wargearNotes: parts.join(', '),
    });
    // Reset state
    setQuery('');
    setSelected(null);
    setCustomName('');
    setPointsOverride('');
    setWargearNotes('');
    setSelectedWargear([]);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setSelected(null);
    setCustomName('');
    setPointsOverride('');
    setWargearNotes('');
    setSelectedWargear([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={[am.sheet, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
          {/* Header */}
          <View style={am.sheetHeader}>
            <Text style={[am.sheetTitle, { color: colors.textPrimary }]}>Add Unit</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 20 }}>{'✕'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {/* Search */}
            <TextInput
              value={query}
              onChangeText={t => { setQuery(t); setSelected(null); }}
              placeholder="Search units from your collection..."
              placeholderTextColor={colors.textSecondary}
              style={[am.searchInput, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
            />

            {/* Search results */}
            {!selected && results.length > 0 && (
              <View style={[am.resultsList, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
                {results.map(u => (
                  <TouchableOpacity
                    key={`${u.faction_id}-${u.name}`}
                    style={[am.resultItem, { borderColor: colors.borderColor }]}
                    onPress={() => handleSelect(u)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14, color: colors.textPrimary }}>{u.name}</Text>
                        {u.inCollection && (
                          <View style={{ backgroundColor: colors.accentGold + '33', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
                            <Text style={{ fontSize: 9, color: colors.accentGold }}>Owned</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{u.faction}</Text>
                    </View>
                    {u.points[0] && (
                      <Text style={{ fontSize: 12, color: colors.accentGold }}>{u.points[0].cost} pts</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected unit banner */}
            {selected && (
              <View style={[am.selectedBanner, { borderColor: colors.accentGold + '4D', backgroundColor: colors.accentGold + '0D' }]}>
                <Text style={{ color: colors.accentGold, marginRight: 8, fontSize: 14 }}>{'✓'}</Text>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{selected.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{selected.faction}</Text>
                </View>
              </View>
            )}

            {/* Config fields */}
            {selected && (
              <View style={{ gap: 12, marginTop: 8 }}>
                {/* Points */}
                <View>
                  <Text style={[am.label, { color: colors.textSecondary }]}>POINTS COST</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      value={pointsOverride}
                      onChangeText={setPointsOverride}
                      keyboardType="numeric"
                      style={[am.input, { flex: 1, backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary }]}
                    />
                    {selected.points.length > 1 && (
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        {selected.points.map(p => (
                          <TouchableOpacity
                            key={p.models}
                            onPress={() => setPointsOverride(p.cost)}
                            style={[am.pointChip, { borderColor: pointsOverride === p.cost ? colors.accentGold : colors.borderColor }]}
                          >
                            <Text style={{ fontSize: 12, color: pointsOverride === p.cost ? colors.accentGold : colors.textSecondary }}>
                              {p.models}m
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Wargear options */}
                {selected.wargear_options.length > 0 && (
                  <View>
                    <Text style={[am.label, { color: colors.textSecondary }]}>WARGEAR OPTIONS</Text>
                    {selected.wargear_options.map((opt, i) => (
                      <TouchableOpacity
                        key={i}
                        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8 }}
                        onPress={() => toggleWargear(opt)}
                      >
                        <View
                          style={{
                            width: 18, height: 18, borderRadius: 3, borderWidth: 1,
                            borderColor: selectedWargear.includes(opt) ? colors.accentGold : colors.borderColor,
                            backgroundColor: selectedWargear.includes(opt) ? colors.accentGold + '33' : 'transparent',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {selectedWargear.includes(opt) && (
                            <Text style={{ color: colors.accentGold, fontSize: 11, fontWeight: '700' }}>{'✓'}</Text>
                          )}
                        </View>
                        <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Custom name (crusade) */}
                {mode === 'crusade' && (
                  <View>
                    <Text style={[am.label, { color: colors.textSecondary }]}>CUSTOM NAME (optional)</Text>
                    <TextInput
                      value={customName}
                      onChangeText={setCustomName}
                      placeholder={selected.name}
                      placeholderTextColor={colors.textSecondary}
                      style={[am.input, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary, marginTop: 4 }]}
                    />
                  </View>
                )}

                {/* Wargear notes */}
                <View>
                  <Text style={[am.label, { color: colors.textSecondary }]}>WARGEAR / LOADOUT NOTES (optional)</Text>
                  <TextInput
                    value={wargearNotes}
                    onChangeText={setWargearNotes}
                    placeholder="e.g. Thunder hammer, Storm shield, 5 models..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={2}
                    style={[am.input, { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary, marginTop: 4, textAlignVertical: 'top', minHeight: 56 }]}
                  />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={[am.buttonRow, { borderColor: colors.borderColor }]}>
            <TouchableOpacity style={[am.cancelBtn, { borderColor: colors.borderColor }]} onPress={handleClose}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[am.addBtn, { borderColor: colors.accentGold, backgroundColor: colors.accentGold + '1A', opacity: selected ? 1 : 0.4 }]}
              onPress={handleAdd}
              disabled={!selected}
            >
              <Text style={{ fontSize: 14, color: colors.accentGold, fontWeight: '600' }}>Add to Army</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, maxHeight: '85%', flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  searchInput: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginHorizontal: 20, marginBottom: 4 },
  resultsList: { marginHorizontal: 20, borderWidth: 1, borderRadius: 4, marginBottom: 12, maxHeight: 208, overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  selectedBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderWidth: 1, borderRadius: 4, padding: 12, marginBottom: 16 },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginHorizontal: 20 },
  input: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginHorizontal: 20 },
  pointChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
  addBtn: { flex: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 10, alignItems: 'center' },
});

// ---------------------------------------------------------------------------
// Edit unit modal (normal mode)
// ---------------------------------------------------------------------------

function EditUnitModal({
  unit, visible, onClose, colors,
}: {
  unit: ArmyUnit | null; visible: boolean; onClose: () => void; colors: any;
}) {
  const { updateUnit, removeUnit } = useArmy();
  const [name, setName] = useState('');
  const [pts, setPts] = useState('');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (unit) {
      setName(unit.custom_name);
      setPts(String(unit.points_cost));
      setNotes(unit.wargear_notes);
    }
  }, [unit]);

  if (!unit) return null;

  const save = () => {
    updateUnit(unit.id, {
      custom_name: name.trim() || unit.datasheet_name,
      points_cost: parseInt(pts, 10) || unit.points_cost,
      wargear_notes: notes.trim(),
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <View style={{ backgroundColor: colors.bgPrimary, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: colors.borderColor, padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>{unit.datasheet_name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 20 }}>{'✕'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 12, marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>DISPLAY NAME</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={{ borderWidth: 1, borderRadius: 4, borderColor: colors.borderColor, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginTop: 4 }}
              />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>POINTS</Text>
              <TextInput
                value={pts}
                onChangeText={setPts}
                keyboardType="numeric"
                style={{ borderWidth: 1, borderRadius: 4, borderColor: colors.borderColor, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginTop: 4 }}
              />
            </View>
            <View>
              <Text style={{ fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase' }}>WARGEAR / LOADOUT</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Thunder hammer, Storm shield..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={2}
                style={{ borderWidth: 1, borderRadius: 4, borderColor: colors.borderColor, backgroundColor: colors.bgCard, color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, marginTop: 4, textAlignVertical: 'top', minHeight: 56 }}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => { removeUnit(unit.id); onClose(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#ef444450', borderRadius: 4 }}
            >
              <Text style={{ color: '#ef4444', fontSize: 14 }}>{'🗑'} Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderColor: colors.accentGold, backgroundColor: colors.accentGold + '1A', borderRadius: 4 }}
            >
              <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Army Builder screen
// ---------------------------------------------------------------------------

export default function ArmyBuilderScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const {
    mode, army, supplyLimit, savedArmies, activeArmyId,
    removeUnit, switchArmy, renameArmy,
  } = useArmy();

  const [showAdd, setShowAdd] = useState(false);
  const [editUnit, setEditUnit] = useState<ArmyUnit | null>(null);
  const [search, setSearch] = useState('');
  const [showArmySwitcher, setShowArmySwitcher] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const activeArmy = savedArmies.find(a => a.id === activeArmyId);
  const totalPoints = army.reduce((s, u) => s + u.points_cost, 0);

  const filtered = useMemo(() => {
    if (!search.trim()) return army;
    const q = search.toLowerCase();
    return army.filter(u =>
      u.custom_name.toLowerCase().includes(q) ||
      u.datasheet_name.toLowerCase().includes(q),
    );
  }, [army, search]);

  // No mode -> go to mode picker
  if (!mode) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 30, marginBottom: 16 }}>{'⚔'}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          No army selected yet.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ModeSelect')}
          style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.accentGold }}
        >
          <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>Choose Mode</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Crusade mode — need to set up campaign first
  if (mode === 'crusade' && !activeArmy?.crusade) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: colors.accentGold + '99', fontSize: 30, marginBottom: 16 }}>{'🛡'}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          Set up your Crusade campaign to start.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ArmyCrusadeSetup')}
          style={{ paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: colors.accentGold, backgroundColor: colors.accentGold + '1A' }}
        >
          <Text style={{ color: colors.accentGold, fontSize: 14, fontWeight: '600' }}>Set Up Campaign</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const characters = filtered.filter(u => u.is_character);
  const nonCharacters = filtered.filter(u => !u.is_character);

  const handleSaveName = () => {
    if (activeArmyId && nameInput.trim()) renameArmy(activeArmyId, nameInput.trim());
    setEditingName(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={[ms.header, { borderColor: colors.borderColor }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            {editingName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  onSubmitEditing={handleSaveName}
                  autoFocus
                  style={{ flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, borderBottomWidth: 1, borderColor: colors.accentGold, paddingVertical: 2 }}
                />
                <TouchableOpacity onPress={handleSaveName}>
                  <Text style={{ color: colors.accentGold, fontSize: 14 }}>{'✓'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setEditingName(false)}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setNameInput(activeArmy?.name ?? ''); setEditingName(true); setShowArmySwitcher(false); }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary }}>
                  {activeArmy?.name ?? 'My Army'}
                </Text>
              </TouchableOpacity>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1,
                borderColor: mode === 'crusade' ? colors.accentGold + '66' : colors.borderColor,
              }}>
                <Text style={{ fontSize: 12, color: mode === 'crusade' ? colors.accentGold : colors.textSecondary }}>
                  {mode === 'crusade' ? 'Crusade' : 'Normal'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowArmySwitcher(v => !v)}
                style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Switch</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>
            {army.length} units ·{' '}
            <Text style={{ color: totalPoints > supplyLimit ? '#ef4444' : colors.accentGold }}>
              {totalPoints} pts
            </Text>
            {mode === 'crusade' ? ` / ${supplyLimit} pts supply` : ''}
          </Text>
        </View>

        {/* Army switcher dropdown */}
        {showArmySwitcher && (
          <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, overflow: 'hidden' }}>
            {savedArmies.map(a => (
              <TouchableOpacity
                key={a.id}
                onPress={() => { switchArmy(a.id); setShowArmySwitcher(false); }}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderBottomWidth: 1, borderColor: colors.borderColor,
                  backgroundColor: a.id === activeArmyId ? colors.accentGold + '1A' : 'transparent',
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textPrimary }}>{a.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {a.mode === 'crusade' ? 'Crusade' : 'Normal'} · {a.units.length} units
                  </Text>
                </View>
                {a.id === activeArmyId && <Text style={{ color: colors.accentGold, fontSize: 14 }}>{'✓'}</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => { navigation.navigate('ModeSelect'); setShowArmySwitcher(false); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ color: colors.accentGold, fontSize: 14 }}>+ New Army</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Crusade dashboard */}
          {mode === 'crusade' && <CrusadeDashboard colors={colors} />}

          {/* Search */}
          {army.length > 4 && (
            <View style={{ marginBottom: 16 }}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search units..."
                placeholderTextColor={colors.textSecondary}
                style={{
                  backgroundColor: colors.bgCard,
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: colors.textPrimary,
                }}
              />
            </View>
          )}

          {/* Unit lists */}
          {mode === 'crusade' ? (
            <>
              {characters.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    CHARACTERS
                  </Text>
                  {characters.map(u => (
                    <CrusadeUnitCard
                      key={u.id}
                      unit={u}
                      colors={colors}
                      onPress={() => navigation.navigate('ArmyUnitDetail', { unitId: u.id })}
                    />
                  ))}
                </View>
              )}
              {nonCharacters.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textSecondary, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
                    UNITS
                  </Text>
                  {nonCharacters.map(u => (
                    <CrusadeUnitCard
                      key={u.id}
                      unit={u}
                      colors={colors}
                      onPress={() => navigation.navigate('ArmyUnitDetail', { unitId: u.id })}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View>
              {filtered.map(u => (
                <NormalUnitCard
                  key={u.id}
                  unit={u}
                  colors={colors}
                  onRemove={() => removeUnit(u.id)}
                  onEdit={() => setEditUnit(u)}
                />
              ))}
            </View>
          )}

          {/* Empty state */}
          {army.length === 0 && (
            <View style={{
              alignItems: 'center', paddingVertical: 48,
              borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderColor, borderRadius: 12,
            }}>
              <Text style={{ color: colors.textSecondary, fontSize: 24, marginBottom: 8 }}>{'⚠'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No units yet</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Tap + to add from your collection</Text>
            </View>
          )}

          {/* Crusade actions row */}
          {mode === 'crusade' && army.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PostBattle')}
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: colors.accentGold + '66', borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, color: colors.accentGold, fontWeight: '500' }}>Record Battle</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('BattleHistory')}
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>Battle History</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowAdd(true)}
        style={{
          position: 'absolute',
          bottom: 96,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accentGold,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}
      >
        <Text style={{ fontSize: 28, fontWeight: '300', color: colors.bgPrimary, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      <AddUnitModal visible={showAdd} onClose={() => setShowAdd(false)} mode={mode as 'standard' | 'crusade'} colors={colors} />
      <EditUnitModal unit={editUnit} visible={!!editUnit} onClose={() => setEditUnit(null)} colors={colors} />
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1 },
});
