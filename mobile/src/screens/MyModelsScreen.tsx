import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  StyleSheet,
  FlatList,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useCollection, PAINTING_STAGES } from '../contexts/CollectionContext';
import { searchUnits } from '../data';
import { getFactionName } from '../lib/factions';
import { pixelaGetGraph } from '../lib/apiServices';
import type { CollectionItem, PaintingStage, Datasheet, FactionId } from '../types';

// ---------------------------------------------------------------------------
// Painting stage config
// ---------------------------------------------------------------------------

const STAGE_CONFIG: Record<PaintingStage, { label: string; color: string; dotColor: string }> = {
  unassembled: { label: 'Unassembled', color: '#9ca3af', dotColor: '#6b7280' },
  assembled:   { label: 'Assembled',   color: '#60a5fa', dotColor: '#3b82f6' },
  primed:      { label: 'Primed',      color: '#c084fc', dotColor: '#a855f7' },
  basecoated:  { label: 'Base Coated', color: '#facc15', dotColor: '#eab308' },
  painted:     { label: 'Painted',     color: '#fb923c', dotColor: '#f97316' },
  based:       { label: 'Based',       color: '#a3e635', dotColor: '#84cc16' },
  complete:    { label: 'Complete',    color: '#4ade80', dotColor: '#22c55e' },
};

// ---------------------------------------------------------------------------
// Add Model Modal
// ---------------------------------------------------------------------------

function AddModelModal({
  visible,
  onClose,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const { addItem } = useCollection();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Datasheet | null>(null);
  const [quantity, setQuantity] = useState(1);

  const results = useMemo(
    () => (query.length >= 2 ? searchUnits(query).slice(0, 10) : []),
    [query],
  );

  const handleSelect = (unit: Datasheet) => {
    setSelected(unit);
    setQuery(unit.name);
  };

  const handleAdd = () => {
    if (!selected) return;
    addItem(selected.name, selected.faction_id, selected.name, quantity);
    setQuery('');
    setSelected(null);
    setQuantity(1);
    onClose();
  };

  const handleClose = () => {
    setQuery('');
    setSelected(null);
    setQuantity(1);
    onClose();
  };

  const s = modalStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>Add to Collection</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={[s.closeText, { color: colors.textSecondary }]}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled">
            {/* Search */}
            <View style={[s.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
              <Text style={[s.searchIcon, { color: colors.textSecondary }]}>{'\u2315'}</Text>
              <TextInput
                value={query}
                onChangeText={(t) => {
                  setQuery(t);
                  setSelected(null);
                }}
                placeholder="Search any unit..."
                placeholderTextColor={colors.textSecondary}
                style={[s.searchInput, { color: colors.textPrimary }]}
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setSelected(null); }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{'\u2715'}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Results dropdown */}
            {!selected && results.length > 0 && (
              <View style={[s.resultsList, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
                {results.map((u) => (
                  <TouchableOpacity
                    key={`${u.faction_id}-${u.name}`}
                    style={[s.resultItem, { borderBottomColor: colors.borderColor }]}
                    onPress={() => handleSelect(u)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={[s.resultName, { color: colors.textPrimary }]}>{u.name}</Text>
                      <Text style={[s.resultFaction, { color: colors.textSecondary }]}>{u.faction}</Text>
                    </View>
                    {u.points.length > 0 && (
                      <Text style={[s.resultPoints, { color: colors.accentGold }]}>{u.points[0].cost} pts</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected unit */}
            {selected && (
              <View style={[s.selectedCard, { borderColor: `${colors.accentGold}40`, backgroundColor: `${colors.accentGold}08` }]}>
                <Text style={[s.selectedName, { color: colors.textPrimary }]}>{selected.name}</Text>
                <Text style={[s.selectedFaction, { color: colors.textSecondary }]}>{selected.faction}</Text>
              </View>
            )}

            {/* Quantity */}
            {selected && (
              <View style={s.quantitySection}>
                <Text style={[s.quantityLabel, { color: colors.textSecondary }]}>QUANTITY (UNITS / SQUADS)</Text>
                <View style={s.quantityRow}>
                  <TouchableOpacity
                    style={[s.quantityBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Text style={[s.quantityBtnText, { color: colors.textPrimary }]}>{'\u2212'}</Text>
                  </TouchableOpacity>
                  <Text style={[s.quantityValue, { color: colors.textPrimary }]}>{quantity}</Text>
                  <TouchableOpacity
                    style={[s.quantityBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setQuantity((q) => q + 1)}
                  >
                    <Text style={[s.quantityBtnText, { color: colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom buttons */}
          <View style={[s.sheetFooter, { borderTopColor: colors.borderColor }]}>
            <TouchableOpacity
              style={[s.footerBtn, { borderColor: colors.borderColor }]}
              onPress={handleClose}
            >
              <Text style={[s.footerBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.footerBtn,
                {
                  borderColor: colors.accentGold,
                  backgroundColor: `${colors.accentGold}15`,
                  opacity: selected ? 1 : 0.4,
                },
              ]}
              onPress={handleAdd}
              disabled={!selected}
            >
              <Text style={[s.footerBtnText, { color: colors.accentGold, fontWeight: '600' }]}>
                Add to Collection
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Model Card
// ---------------------------------------------------------------------------

function ModelCard({ item, colors }: { item: CollectionItem; colors: any }) {
  const { updateItem, updateStage, removeItem } = useCollection();
  const [showStage, setShowStage] = useState(false);
  const cfg = STAGE_CONFIG[item.stage] ?? STAGE_CONFIG.unassembled;
  const factionName = getFactionName(item.factionId as FactionId) || item.factionId;

  const s = cardStyles(colors);

  return (
    <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
      <View style={s.cardRow}>
        {/* Quantity badge */}
        <View style={[s.qtyBadge, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor }]}>
          <Text style={[s.qtyNumber, { color: colors.accentGold }]}>{item.quantity}</Text>
          <Text style={[s.qtyLabel, { color: colors.textSecondary }]}>units</Text>
        </View>

        {/* Info */}
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[s.cardFaction, { color: colors.textSecondary }]}>{factionName}</Text>

          {/* Stage pill */}
          <TouchableOpacity
            style={s.stagePill}
            onPress={() => setShowStage((v) => !v)}
            activeOpacity={0.7}
          >
            <View style={[s.stageDot, { backgroundColor: cfg.dotColor }]} />
            <Text style={[s.stageText, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={[s.stageChevron, { color: cfg.color }]}>
              {showStage ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>

          {/* Stage selector */}
          {showStage && (
            <View style={s.stageSelector}>
              {PAINTING_STAGES.map((stage) => {
                const sc = STAGE_CONFIG[stage];
                const isActive = item.stage === stage;
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      s.stagePillOption,
                      {
                        borderColor: isActive ? sc.color : colors.borderColor,
                      },
                    ]}
                    onPress={() => {
                      updateStage(item.id, stage);
                      setShowStage(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[s.stageDotSmall, { backgroundColor: sc.dotColor }]} />
                    <Text
                      style={[
                        s.stagePillText,
                        { color: isActive ? sc.color : colors.textSecondary, fontWeight: isActive ? '700' : '400' },
                      ]}
                    >
                      {sc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Qty controls + remove */}
        <View style={s.cardActions}>
          <View style={s.qtyControls}>
            <TouchableOpacity
              style={[s.qtyControlBtn, { borderColor: colors.borderColor }]}
              onPress={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
            >
              <Text style={[s.qtyControlText, { color: colors.textSecondary }]}>{'\u2212'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.qtyControlBtn, { borderColor: colors.borderColor }]}
              onPress={() => updateItem(item.id, { quantity: item.quantity + 1 })}
            >
              <Text style={[s.qtyControlText, { color: colors.textSecondary }]}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => removeItem(item.id)} style={s.removeBtn}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{'\u2717'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function MyModelsScreen() {
  const { colors } = useTheme();
  const { items, totalModels, paintedCount } = useCollection();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pixelaUrl, setPixelaUrl] = useState<string | null>(null);

  useEffect(() => {
    pixelaGetGraph().then((url) => setPixelaUrl(url));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.factionId.toLowerCase().includes(q),
    );
  }, [items, search]);

  const completePct = totalModels === 0 ? 0 : Math.round((paintedCount / totalModels) * 100);

  const s = mainStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.borderColor }]}>
        <View style={s.headerTop}>
          <Text style={[s.title, { color: colors.textPrimary }]}>My Models</Text>
          <Text style={[s.headerStats, { color: colors.textSecondary }]}>
            {totalModels} units {'\u00B7'} {completePct}% painted
          </Text>
        </View>

        {/* Progress bar */}
        {totalModels > 0 && (
          <View style={[s.progressTrack, { backgroundColor: colors.borderColor }]}>
            <View style={[s.progressFill, { width: `${completePct}%` as any }]} />
          </View>
        )}

        {/* Search */}
        <View style={[s.searchContainer, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <Text style={[s.searchIcon, { color: colors.textSecondary }]}>{'\u2315'}</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search models..."
            placeholderTextColor={colors.textSecondary}
            style={[s.searchInput, { color: colors.textPrimary }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{'\u2715'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Pixela Painting Activity */}
      {pixelaUrl ? (
        <View style={[s.pixelaSection, { borderBottomColor: colors.borderColor }]}>
          <Text style={[s.pixelaSectionTitle, { color: colors.accentGold }]}>PAINTING ACTIVITY</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(pixelaUrl)}
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: pixelaUrl }}
              style={s.pixelaImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={[s.pixelaHint, { color: colors.textSecondary }]}>Tap to view full graph</Text>
        </View>
      ) : (
        <View style={[s.pixelaSection, { borderBottomColor: colors.borderColor }]}>
          <Text style={[s.pixelaSectionTitle, { color: colors.accentGold }]}>PAINTING ACTIVITY</Text>
          <Text style={[s.pixelaNotConfigured, { color: colors.textSecondary }]}>
            Set up Pixela in Settings to track your painting streak
          </Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => <ModelCard item={item} colors={colors} />}
        ListEmptyComponent={
          items.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={[s.emptyIcon, { color: colors.textSecondary }]}>{'\u{1F4E6}'}</Text>
              <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No models yet</Text>
              <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
                Tap + to add units to your collection
              </Text>
            </View>
          ) : (
            <Text style={[s.noResults, { color: colors.textSecondary }]}>
              No models match "{search}"
            </Text>
          )
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.accentGold }]}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.85}
      >
        <Text style={[s.fabText, { color: colors.bgPrimary }]}>+</Text>
      </TouchableOpacity>

      <AddModelModal visible={showAdd} onClose={() => setShowAdd(false)} colors={colors} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

function mainStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
    headerStats: { fontSize: 12 },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 12,
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#22c55e',
      borderRadius: 2,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
    },
    searchIcon: { fontSize: 16, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    pixelaSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
    },
    pixelaSectionTitle: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    pixelaImage: {
      width: '100%',
      height: 80,
      borderRadius: 6,
    },
    pixelaHint: {
      fontSize: 10,
      textAlign: 'center',
      marginTop: 4,
    },
    pixelaNotConfigured: {
      fontSize: 12,
      textAlign: 'center',
      paddingVertical: 12,
    },
    listContent: { padding: 16, gap: 8, paddingBottom: 100 },
    emptyState: { alignItems: 'center', paddingVertical: 64 },
    emptyIcon: { fontSize: 40, marginBottom: 12 },
    emptyTitle: { fontSize: 14, fontWeight: '500' },
    emptySubtitle: { fontSize: 12, marginTop: 4 },
    noResults: { textAlign: 'center', fontSize: 14, paddingVertical: 32 },
    fab: {
      position: 'absolute',
      bottom: 96,
      right: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    fabText: { fontSize: 28, fontWeight: '300', marginTop: -2 },
  });
}

function cardStyles(colors: any) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
    },
    cardRow: { flexDirection: 'row', gap: 12 },
    qtyBadge: {
      width: 40,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyNumber: { fontSize: 12, fontWeight: '700', lineHeight: 14 },
    qtyLabel: { fontSize: 9, lineHeight: 10 },
    cardInfo: { flex: 1, minWidth: 0 },
    cardName: { fontSize: 14, fontWeight: '600' },
    cardFaction: { fontSize: 12 },
    stagePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
    },
    stageDot: { width: 6, height: 6, borderRadius: 3 },
    stageText: { fontSize: 12 },
    stageChevron: { fontSize: 8 },
    stageSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 8,
    },
    stagePillOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
    },
    stageDotSmall: { width: 6, height: 6, borderRadius: 3 },
    stagePillText: { fontSize: 10 },
    cardActions: {
      alignItems: 'flex-end',
      gap: 4,
    },
    qtyControls: { flexDirection: 'row', gap: 4 },
    qtyControlBtn: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qtyControlText: { fontSize: 14, fontWeight: '700' },
    removeBtn: { marginTop: 4 },
  });
}

function modalStyles(colors: any) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      maxHeight: '80%',
    },
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    sheetTitle: { fontSize: 16, fontWeight: '700' },
    closeText: { fontSize: 20 },
    sheetBody: { paddingHorizontal: 20, paddingBottom: 12 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 6,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 4,
    },
    searchIcon: { fontSize: 16, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, padding: 0 },
    resultsList: {
      borderWidth: 1,
      borderRadius: 6,
      maxHeight: 208,
      marginBottom: 12,
      overflow: 'hidden',
    },
    resultItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    resultName: { fontSize: 14 },
    resultFaction: { fontSize: 12 },
    resultPoints: { fontSize: 12, fontWeight: '600' },
    selectedCard: {
      borderWidth: 1,
      borderRadius: 6,
      padding: 12,
      marginBottom: 16,
    },
    selectedName: { fontSize: 14, fontWeight: '600' },
    selectedFaction: { fontSize: 12 },
    quantitySection: { marginBottom: 8 },
    quantityLabel: { fontSize: 11, letterSpacing: 1 },
    quantityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    quantityBtn: {
      width: 32,
      height: 32,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityBtnText: { fontSize: 18, fontWeight: '700' },
    quantityValue: { fontSize: 18, fontWeight: '700', width: 32, textAlign: 'center' },
    sheetFooter: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
    },
    footerBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 6,
    },
    footerBtnText: { fontSize: 14 },
  });
}
