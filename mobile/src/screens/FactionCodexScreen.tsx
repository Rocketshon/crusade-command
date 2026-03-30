import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getUnitsForFaction, getRulesForFaction } from '../data';
import { getFaction, getDataFactionId } from '../lib/factions';
import type { FactionId, DetachmentData, Datasheet } from '../types';

// --- Helpers ---

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function getStratagemTypeColor(type: string): { bg: string; text: string; border: string } {
  const t = type.toLowerCase();
  if (t.includes('battle tactic')) return { bg: '#16a34a15', text: '#22c55e', border: '#22c55e40' };
  if (t.includes('strategic ploy')) return { bg: '#3b82f615', text: '#60a5fa', border: '#60a5fa40' };
  if (t.includes('epic deed')) return { bg: '#f59e0b15', text: '#fbbf24', border: '#fbbf2440' };
  if (t.includes('wargear')) return { bg: '#a855f715', text: '#c084fc', border: '#c084fc40' };
  return { bg: '#94a3b815', text: '#94a3b8', border: '#94a3b840' };
}

// Simple FormattedText: renders text with bold keywords highlighted in gold
function FormattedText({ text, style, accentColor }: { text: string; style?: any; accentColor: string }) {
  if (!text) return null;
  // Bold keywords between ** or ALL_CAPS words
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={[{ fontSize: 13, lineHeight: 20 }, style]}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={{ fontWeight: 'bold', color: accentColor }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

// Faction accent color mapping
const FACTION_BG_ACCENT: Record<string, string> = {
  blue: '#3b82f6', cyan: '#22d3ee', slate: '#94a3b8',
  red: '#ef4444', amber: '#f59e0b', orange: '#f97316',
  green: '#16a34a', yellow: '#ca8a04', purple: '#a855f7',
  zinc: '#a1a1aa', lime: '#84cc16', rose: '#f43f5e',
  stone: '#a8a29e', emerald: '#34d399', violet: '#8b5cf6',
  sky: '#0ea5e9', indigo: '#818cf8',
};

type TabKey = 'army' | 'detachments' | 'datasheets' | 'crusade';

export default function FactionCodexScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const factionId = route.params?.factionId as string | undefined;

  const [activeTab, setActiveTab] = useState<TabKey>('army');
  const [expandedDetachments, setExpandedDetachments] = useState<string[]>([]);
  const [expandedEnhancements, setExpandedEnhancements] = useState<string[]>([]);
  const [expandedStratagems, setExpandedStratagems] = useState<string[]>([]);
  const [datasheetSearch, setDatasheetSearch] = useState('');

  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;
  const dataFaction = factionId ? getDataFactionId(factionId as FactionId) : undefined;
  const rules = dataFaction ? getRulesForFaction(dataFaction) : undefined;
  const units = dataFaction ? getUnitsForFaction(dataFaction) : [];

  const accentColor = factionMeta ? (FACTION_BG_ACCENT[factionMeta.color] ?? colors.accentGold) : colors.accentGold;

  useEffect(() => {
    if (!factionMeta || !rules?.detachments?.length) return;
    if (expandedDetachments.length === 0) {
      setExpandedDetachments([rules.detachments[0].name]);
    }
  }, [rules?.detachments]);

  const filteredDatasheets = useMemo(() => {
    const q = datasheetSearch.toLowerCase();
    if (!q) return units;
    return units.filter(
      (ds) => ds.name.toLowerCase().includes(q) || ds.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [units, datasheetSearch]);

  const toggleDetachment = (name: string) =>
    setExpandedDetachments((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  const toggleEnhancements = (name: string) =>
    setExpandedEnhancements((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  const toggleStratagems = (name: string) =>
    setExpandedStratagems((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const handleDatasheetClick = (unit: Datasheet) =>
    navigation.navigate('DatasheetView', { factionId, datasheetName: unit.name });

  const styles = makeStyles(colors);

  if (!factionMeta) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Codex Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'army', label: 'Army Rule', icon: '\uD83D\uDEE1' },
    { key: 'detachments', label: 'Detachments', icon: '\u2694' },
    { key: 'datasheets', label: 'Datasheets', icon: '\uD83D\uDCD6' },
    { key: 'crusade', label: 'Crusade', icon: '\uD83C\uDFC5' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>

        {/* Faction Header */}
        <View style={styles.factionHeader}>
          <View style={styles.factionHeaderRow}>
            <Text style={styles.factionIcon}>{factionMeta.icon}</Text>
            <View style={styles.factionHeaderInfo}>
              <Text style={[styles.factionTitle, { color: colors.textPrimary }]}>{factionMeta.name}</Text>
              <Text style={[styles.factionSubtitle, { color: colors.textSecondary }]}>
                Codex: {rules?.faction ?? factionMeta.name}
              </Text>
            </View>
          </View>
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[
                  styles.tabButton,
                  isActive
                    ? { backgroundColor: colors.accentGold }
                    : { backgroundColor: colors.bgCard, borderColor: colors.borderColor, borderWidth: 1 },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.bgPrimary : colors.textSecondary },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Army Rule Tab */}
        {activeTab === 'army' && (
          <View style={styles.tabContent}>
            <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <Text style={[styles.cardTitle, { color: colors.accentGold }]}>Army Rules</Text>
              {rules?.army_rules && rules.army_rules.length > 0 ? (
                rules.army_rules.map((rule, idx) => (
                  <View key={idx} style={idx < rules.army_rules.length - 1 ? { marginBottom: 12 } : undefined}>
                    <FormattedText text={rule} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No army rules available for this faction.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Detachments Tab */}
        {activeTab === 'detachments' && (
          <View style={styles.tabContent}>
            {rules?.detachments && rules.detachments.length > 0 ? (
              rules.detachments.map((detachment: DetachmentData) => {
                const isExpanded = expandedDetachments.includes(detachment.name);
                return (
                  <View key={detachment.name} style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                    {/* Detachment header toggle */}
                    <TouchableOpacity onPress={() => toggleDetachment(detachment.name)} style={styles.accordionHeader} activeOpacity={0.7}>
                      <Text style={[styles.detachmentName, { color: colors.textPrimary }]}>{detachment.name}</Text>
                      <Text style={[styles.chevronIcon, { color: colors.accentGold }]}>{isExpanded ? '\u25BC' : '\u203A'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.accordionBody, { borderTopColor: colors.accentGold + '1a' }]}>
                        {/* Detachment Rule */}
                        <View style={{ marginBottom: 12 }}>
                          <Text style={[styles.subSectionTitle, { color: colors.accentGold }]}>{detachment.rule.name}</Text>
                          <FormattedText text={detachment.rule.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
                        </View>

                        {/* Enhancements */}
                        {detachment.enhancements.length > 0 && (
                          <View style={{ marginBottom: 12 }}>
                            <TouchableOpacity onPress={() => toggleEnhancements(detachment.name)} style={styles.subAccordionHeader} activeOpacity={0.7}>
                              <Text style={[styles.subAccordionLabel, { color: colors.textSecondary }]}>
                                ENHANCEMENTS ({detachment.enhancements.length})
                              </Text>
                              <Text style={[styles.chevronSmall, { color: colors.accentGold }]}>
                                {expandedEnhancements.includes(detachment.name) ? '\u25BC' : '\u203A'}
                              </Text>
                            </TouchableOpacity>
                            {expandedEnhancements.includes(detachment.name) && (
                              <View style={{ marginTop: 8 }}>
                                {detachment.enhancements.map((enh, idx) => (
                                  <View key={idx} style={[styles.enhancementCard, { borderColor: accentColor + '30', backgroundColor: accentColor + '08' }]}>
                                    <View style={styles.enhHeaderRow}>
                                      <Text style={[styles.enhName, { color: accentColor }]}>{enh.name}</Text>
                                      <Text style={[styles.enhCost, { color: accentColor }]}>{enh.cost} pts</Text>
                                    </View>
                                    <FormattedText text={enh.text} style={{ color: colors.textSecondary, fontSize: 12 }} accentColor={colors.accentGold} />
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        )}

                        {/* Stratagems */}
                        {detachment.stratagems.length > 0 && (
                          <View>
                            <TouchableOpacity onPress={() => toggleStratagems(detachment.name)} style={styles.subAccordionHeader} activeOpacity={0.7}>
                              <Text style={[styles.subAccordionLabel, { color: colors.textSecondary }]}>
                                STRATAGEMS ({detachment.stratagems.length})
                              </Text>
                              <Text style={[styles.chevronSmall, { color: colors.accentGold }]}>
                                {expandedStratagems.includes(detachment.name) ? '\u25BC' : '\u203A'}
                              </Text>
                            </TouchableOpacity>
                            {expandedStratagems.includes(detachment.name) && (
                              <View style={{ marginTop: 8 }}>
                                {detachment.stratagems.map((strat, idx) => {
                                  const stratColors = getStratagemTypeColor(strat.type);
                                  return (
                                    <View key={idx} style={[styles.stratagemCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                                      <View style={styles.stratHeaderRow}>
                                        <Text style={{ fontSize: 12, marginRight: 4, color: '#c084fc' }}>{'\u26A1'}</Text>
                                        <Text style={[styles.stratName, { color: '#c084fc' }]}>{strat.name}</Text>
                                        <Text style={[styles.stratCp, { color: '#a855f7' }]}>{strat.cp} CP</Text>
                                      </View>
                                      <View style={[styles.stratTypeBadge, { backgroundColor: stratColors.bg, borderColor: stratColors.border }]}>
                                        <Text style={[styles.stratTypeText, { color: stratColors.text }]}>{strat.type}</Text>
                                      </View>
                                      {strat.when ? (
                                        <Text style={[styles.stratDetail, { color: colors.textSecondary }]}>
                                          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>When: </Text>{strat.when}
                                        </Text>
                                      ) : null}
                                      {strat.target ? (
                                        <Text style={[styles.stratDetail, { color: colors.textSecondary }]}>
                                          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Target: </Text>{strat.target}
                                        </Text>
                                      ) : null}
                                      {strat.effect ? (
                                        <Text style={[styles.stratDetail, { color: colors.textSecondary }]}>
                                          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Effect: </Text>{strat.effect}
                                        </Text>
                                      ) : null}
                                      {strat.restrictions ? (
                                        <Text style={[styles.stratRestriction]}>
                                          <Text style={{ fontWeight: '600' }}>Restrictions: </Text>{strat.restrictions}
                                        </Text>
                                      ) : null}
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }]}>
                No detachments available for this faction.
              </Text>
            )}
          </View>
        )}

        {/* Datasheets Tab */}
        {activeTab === 'datasheets' && (
          <View style={styles.tabContent}>
            {/* Search */}
            <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
              <Text style={[styles.searchIcon, { color: colors.accentGold + '80' }]}>{'\uD83D\uDD0D'}</Text>
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={datasheetSearch}
                onChangeText={setDatasheetSearch}
                placeholder="Search datasheets..."
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {filteredDatasheets.map((unit) => (
              <TouchableOpacity
                key={unit.name}
                onPress={() => handleDatasheetClick(unit)}
                style={[styles.datasheetCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}
                activeOpacity={0.7}
              >
                <View style={styles.datasheetRow}>
                  <View style={styles.datasheetInfo}>
                    <View style={styles.datasheetNameRow}>
                      <Text style={[styles.datasheetName, { color: colors.textPrimary }]}>{unit.name}</Text>
                      {unit.legends && (
                        <View style={styles.legendsBadge}>
                          <Text style={styles.legendsText}>Legends</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.keywordRow}>
                      {unit.keywords.slice(0, 4).map((kw, kwIdx) => (
                        <View key={kwIdx} style={[styles.keywordBadge, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor + '80' }]}>
                          <Text style={[styles.keywordText, { color: colors.textSecondary }]}>{toTitleCase(kw)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.datasheetRight}>
                    {unit.points.length > 0 && (
                      <Text style={[styles.datasheetPoints, { color: colors.accentGold }]}>{unit.points[0].cost} pts</Text>
                    )}
                    <Text style={[styles.chevronIcon, { color: colors.textSecondary }]}>{'\u203A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {filteredDatasheets.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 }]}>
                No datasheets found
              </Text>
            )}
          </View>
        )}

        {/* Crusade Tab */}
        {activeTab === 'crusade' && (
          <View style={styles.tabContent}>
            {rules?.crusade_rules && rules.crusade_rules.length > 0 ? (
              <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[styles.cardTitle, { color: colors.accentGold }]}>Crusade Rules</Text>
                {rules.crusade_rules.map((cr, idx) => (
                  <View key={idx} style={idx < rules.crusade_rules!.length - 1 ? { marginBottom: 12 } : undefined}>
                    {cr.name ? <Text style={[styles.crusadeRuleName, { color: colors.textPrimary }]}>{cr.name}</Text> : null}
                    {cr.text ? <FormattedText text={cr.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} /> : null}
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.card, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 }]}>
                  No crusade rules available for this faction.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backArrow: { fontSize: 18, marginRight: 6 },
    backText: { fontSize: 14 },
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold' },
    factionHeader: { marginBottom: 16 },
    factionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    factionIcon: { fontSize: 36, marginRight: 12 },
    factionHeaderInfo: { flex: 1 },
    factionTitle: { fontSize: 26, fontWeight: 'bold', letterSpacing: 1 },
    factionSubtitle: { fontSize: 13, marginTop: 2 },
    accentBar: { height: 3, borderRadius: 2, width: '100%' },
    tabBar: { marginBottom: 16, flexGrow: 0 },
    tabBarContent: { gap: 8 },
    tabButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    tabLabel: { fontSize: 13, fontWeight: '600' },
    tabContent: {},
    card: { borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 12 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    emptyText: { fontSize: 14 },
    // Detachments
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    detachmentName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
    chevronIcon: { fontSize: 18, marginLeft: 8 },
    accordionBody: { borderTopWidth: 1, padding: 14 },
    subSectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    subAccordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    subAccordionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
    chevronSmall: { fontSize: 14 },
    enhancementCard: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
    enhHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    enhName: { fontSize: 13, fontWeight: '600', flex: 1 },
    enhCost: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
    stratagemCard: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8 },
    stratHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    stratName: { fontSize: 13, fontWeight: '600', flex: 1 },
    stratCp: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
    stratTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, marginBottom: 6 },
    stratTypeText: { fontSize: 11, fontWeight: '600' },
    stratDetail: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
    stratRestriction: { fontSize: 12, color: '#fbbf24', marginTop: 4 },
    // Datasheets
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 12,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    datasheetCard: { borderWidth: 1, borderRadius: 10, marginBottom: 8 },
    datasheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    datasheetInfo: { flex: 1, marginRight: 8 },
    datasheetNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    datasheetName: { fontSize: 14, fontWeight: '600' },
    legendsBadge: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: '#ef444433', borderWidth: 1, borderColor: '#ef444450' },
    legendsText: { fontSize: 10, color: '#f87171' },
    keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    keywordBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
    keywordText: { fontSize: 10 },
    datasheetRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    datasheetPoints: { fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
    crusadeRuleName: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  });
}
