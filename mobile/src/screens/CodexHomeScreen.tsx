import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { FACTIONS, getDataFactionId } from '../lib/factions';
import { getUnitsForFaction, getRulesForFaction } from '../data';
import type { FactionId, FactionMeta } from '../types';

// Faction accent color mapping for glow-like tinting
const FACTION_ACCENT: Record<string, string> = {
  blue: '#3b82f6',
  cyan: '#22d3ee',
  slate: '#94a3b8',
  red: '#ef4444',
  amber: '#f59e0b',
  orange: '#f97316',
  green: '#16a34a',
  yellow: '#ca8a04',
  purple: '#a855f7',
  zinc: '#a1a1aa',
  lime: '#84cc16',
  rose: '#f43f5e',
  stone: '#a8a29e',
  emerald: '#34d399',
  violet: '#8b5cf6',
  sky: '#0ea5e9',
  indigo: '#818cf8',
};

function getFactionAccent(colorKey: string): string {
  return FACTION_ACCENT[colorKey] ?? '#b8860b';
}

interface FactionListItem {
  id: FactionId;
  name: string;
  icon: string;
  category: 'imperium' | 'chaos' | 'xenos';
  color: string;
  hasChapters: boolean;
  datasheets: number;
  detachments: number;
}

export default function CodexHomeScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const factionList = useMemo<FactionListItem[]>(() =>
    FACTIONS.map((f) => {
      const dataId = getDataFactionId(f.id);
      const datasheets = getUnitsForFaction(dataId).length;
      const detachments = getRulesForFaction(dataId)?.detachments?.length ?? 0;
      return {
        id: f.id,
        name: f.name,
        icon: f.icon,
        category: f.category,
        color: f.color,
        hasChapters: f.hasChapters ?? false,
        datasheets,
        detachments,
      };
    }), []);

  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: { name: string; factionId: string; factionName: string; factionIcon: string; keywords: string[] }[] = [];
    for (const f of FACTIONS) {
      const dataId = getDataFactionId(f.id);
      const units = getUnitsForFaction(dataId);
      for (const unit of units) {
        if (results.length >= 30) break;
        if (
          unit.name.toLowerCase().includes(q) ||
          unit.keywords?.some((k: string) => k.toLowerCase().includes(q))
        ) {
          results.push({
            name: unit.name,
            factionId: f.id,
            factionName: f.name,
            factionIcon: f.icon,
            keywords: unit.keywords ?? [],
          });
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [searchQuery]);

  const handleFactionClick = useCallback((faction: FactionListItem) => {
    if (faction.hasChapters) {
      navigation.navigate('SpaceMarinesChapters');
    } else {
      navigation.navigate('FactionCodex', { factionId: faction.id });
    }
  }, [navigation]);

  const imperiumFactions = useMemo(() => factionList.filter((f) => f.category === 'imperium'), [factionList]);
  const chaosFactions = useMemo(() => factionList.filter((f) => f.category === 'chaos'), [factionList]);
  const xenosFactions = useMemo(() => factionList.filter((f) => f.category === 'xenos'), [factionList]);

  const styles = makeStyles(colors);

  const renderFactionGroup = (label: string, emoji: string, factions: FactionListItem[]) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionLabel}>{label}</Text>
      </View>
      {factions.map((faction) => (
        <TouchableOpacity
          key={faction.id}
          onPress={() => handleFactionClick(faction)}
          style={[styles.factionCard, { borderColor: colors.borderColor }]}
          activeOpacity={0.7}
        >
          <View style={[styles.factionGlow, { backgroundColor: getFactionAccent(faction.color) + '10' }]} />
          <View style={styles.factionRow}>
            <Text style={styles.factionIcon}>{faction.icon}</Text>
            <View style={styles.factionInfo}>
              <View style={styles.factionNameRow}>
                <Text style={[styles.factionName, { color: colors.textPrimary }]}>
                  {faction.name}
                </Text>
                {faction.hasChapters && (
                  <Text style={[styles.chaptersHint, { color: colors.accentGold + 'b3' }]}>
                    View Chapters
                  </Text>
                )}
              </View>
              <View style={styles.factionMeta}>
                <Text style={[styles.factionMetaText, { color: colors.textSecondary }]}>
                  {faction.datasheets} datasheets
                </Text>
                <Text style={[styles.factionMetaDot, { color: colors.textSecondary }]}>{'\u2022'}</Text>
                <Text style={[styles.factionMetaText, { color: colors.textSecondary }]}>
                  {faction.detachments} detachments
                </Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'\u203A'}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{'\uD83D\uDCD6'}</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Codex Library</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Browse all faction codexes
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputWrapper, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
            <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>{'\uD83D\uDD0D'}</Text>
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search units across all factions..."
              placeholderTextColor={colors.textSecondary + '66'}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.clearButton, { color: colors.textSecondary }]}>{'\u2715'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </Text>
              {searchResults.map((result, idx) => (
                <TouchableOpacity
                  key={`${result.factionId}-${result.name}-${idx}`}
                  onPress={() => navigation.navigate('DatasheetView', { factionId: result.factionId, datasheetName: result.name })}
                  style={[styles.searchResultCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resultIcon}>{result.factionIcon}</Text>
                  <View style={styles.resultInfo}>
                    <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text style={[styles.resultFaction, { color: colors.textSecondary }]}>
                      {result.factionName}
                    </Text>
                  </View>
                  <Text style={[styles.chevronSmall, { color: colors.textSecondary }]}>{'\u203A'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <Text style={[styles.noResults, { color: colors.textSecondary }]}>
              No units found for "{searchQuery}"
            </Text>
          )}
        </View>

        {/* 40K News Card */}
        <TouchableOpacity
          style={[styles.newsCard, { backgroundColor: colors.bgCard, borderColor: colors.accentGold + '40' }]}
          onPress={() => navigation.navigate('News')}
          activeOpacity={0.7}
        >
          <Text style={styles.newsIcon}>{'\uD83D\uDCF0'}</Text>
          <View style={styles.newsInfo}>
            <Text style={[styles.newsTitle, { color: colors.textPrimary }]}>Latest 40K News</Text>
            <Text style={[styles.newsSubtitle, { color: colors.textSecondary }]}>
              Warhammer community updates
            </Text>
          </View>
          <Text style={[styles.chevron, { color: colors.accentGold }]}>{'\u203A'}</Text>
        </TouchableOpacity>

        {renderFactionGroup('Imperium', '\u269C\uFE0F', imperiumFactions)}
        {renderFactionGroup('Chaos', '\uD83D\uDD25', chaosFactions)}
        {renderFactionGroup('Xenos', '\uD83D\uDC7D', xenosFactions)}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    header: { alignItems: 'center', marginBottom: 24 },
    headerIcon: { fontSize: 40, marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    headerSubtitle: { fontSize: 14 },
    searchContainer: { marginBottom: 16 },
    searchInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    clearButton: { fontSize: 14, paddingHorizontal: 4 },
    searchResults: { marginTop: 12 },
    resultCount: { fontSize: 12, marginBottom: 8 },
    searchResultCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    resultIcon: { fontSize: 20, marginRight: 12 },
    resultInfo: { flex: 1, minWidth: 0 },
    resultName: { fontSize: 14, fontWeight: '600' },
    resultFaction: { fontSize: 12, marginTop: 2 },
    chevronSmall: { fontSize: 22, marginLeft: 8 },
    noResults: { textAlign: 'center', fontSize: 14, marginTop: 12 },
    newsCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      marginBottom: 20,
    },
    newsIcon: { fontSize: 28, marginRight: 14 },
    newsInfo: { flex: 1 },
    newsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    newsSubtitle: { fontSize: 12 },
    sectionContainer: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionEmoji: { fontSize: 14, marginRight: 6 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.textSecondary,
    },
    factionCard: {
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 10,
      backgroundColor: colors.bgCard,
    },
    factionGlow: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.3,
    },
    factionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    factionIcon: { fontSize: 28, marginRight: 14 },
    factionInfo: { flex: 1 },
    factionNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    factionName: { fontSize: 16, fontWeight: '600' },
    chaptersHint: { fontSize: 12, fontStyle: 'italic', marginLeft: 8 },
    factionMeta: { flexDirection: 'row', alignItems: 'center' },
    factionMetaText: { fontSize: 12 },
    factionMetaDot: { fontSize: 12, marginHorizontal: 6 },
    chevron: { fontSize: 24, marginLeft: 8 },
  });
}
