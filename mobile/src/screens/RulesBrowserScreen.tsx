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
import { CORE_RULES, CRUSADE_RULES } from '../data/general';
import type { RulesSection } from '../types';

// --- Helpers ---

function stripSectionNumber(name: string): string {
  return name.replace(/^\d+\.\s+/, '');
}

interface RuleItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  originalName: string;
}

function buildRuleItems(sections: RulesSection[], category: string): RuleItem[] {
  return sections.map((section, idx) => ({
    id: `${category}-${idx}`,
    title: stripSectionNumber(section.name),
    subtitle: section.subsections.length > 0 ? `${section.subsections.length} subsections` : undefined,
    category,
    originalName: section.name,
  }));
}

const CORE_RULE_GROUPS: { label: string; sectionNames: string[] }[] = [
  { label: 'Getting Started', sectionNames: ['Introduction', 'Books'] },
  { label: 'Army Building', sectionNames: ['Armies', 'Muster Your Army'] },
  { label: 'Battlefield Setup', sectionNames: ['Battlefield', 'Measuring Distances', 'Determining Visibility', 'Objective Markers', 'Mission Map Key', 'Example Battlefields', 'Missions'] },
  { label: 'Game Phases', sectionNames: ['Sequencing', '1. Command', '2. Battle-shock', '1. Move Units', '2. Reinforcements', 'Transports'] },
  { label: 'Shooting Phase', sectionNames: ['1. Hit Roll', '2. Wound Roll', '3. Allocate Attack', '4. Saving Throw', '5. Inflict Damage'] },
  { label: 'Fight Phase', sectionNames: ['1. Fights First', '2. Remaining Combats', '1. Pile In', '2. Make Melee Attacks', '3. Consolidate'] },
  { label: 'Terrain', sectionNames: ['Craters and Rubble', 'Barricades and Fuel Pipes', 'Battlefield Debris and Statuary', 'Hills, Industrial Structures, Sealed Buildings and Armoured Containers', 'Woods', 'Ruins'] },
  { label: 'Dice & Sequencing', sectionNames: ['Dice'] },
];

function groupCoreRules(items: RuleItem[]): { label: string; items: RuleItem[] }[] {
  const assigned = new Set<string>();
  const groups: { label: string; items: RuleItem[] }[] = [];
  for (const group of CORE_RULE_GROUPS) {
    const matching = items.filter((item) => group.sectionNames.includes(item.originalName));
    if (matching.length > 0) {
      groups.push({ label: group.label, items: matching });
      matching.forEach((m) => assigned.add(m.id));
    }
  }
  const remaining = items.filter((item) => !assigned.has(item.id));
  if (remaining.length > 0) groups.push({ label: 'Other', items: remaining });
  return groups;
}

export default function RulesBrowserScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const coreRuleItems = useMemo(() => (CORE_RULES ? buildRuleItems(CORE_RULES.sections, 'core') : []), []);
  const crusadeRuleItems = useMemo(() => (CRUSADE_RULES ? buildRuleItems(CRUSADE_RULES.sections, 'crusade') : []), []);

  const toggleSection = (section: string) =>
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]));

  const filterBySearch = useCallback(
    (items: RuleItem[]) => {
      if (!searchQuery) return items;
      const q = searchQuery.toLowerCase();
      return items.filter((item) => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q));
    },
    [searchQuery]
  );

  const filteredCoreRules = useMemo(() => filterBySearch(coreRuleItems), [filterBySearch, coreRuleItems]);
  const filteredCrusadeRules = useMemo(() => filterBySearch(crusadeRuleItems), [filterBySearch, crusadeRuleItems]);
  const coreRuleGroups = useMemo(() => groupCoreRules(filteredCoreRules), [filteredCoreRules]);

  const handleRuleClick = (ruleId: string) => navigation.navigate('RuleDetail', { ruleId });

  const styles = makeStyles(colors);

  const renderRuleList = (rules: RuleItem[]) =>
    rules.map((rule, idx) => (
      <TouchableOpacity
        key={rule.id}
        onPress={() => handleRuleClick(rule.id)}
        style={[styles.ruleItem, idx < rules.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderColor + '99' }]}
        activeOpacity={0.7}
      >
        <View style={styles.ruleItemRow}>
          <View style={styles.ruleItemInfo}>
            <Text style={[styles.ruleItemTitle, { color: colors.textPrimary }]}>{rule.title}</Text>
            {rule.subtitle && (
              <Text style={[styles.ruleItemSubtitle, { color: colors.textSecondary }]}>{rule.subtitle}</Text>
            )}
          </View>
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'\u203A'}</Text>
        </View>
      </TouchableOpacity>
    ));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{'\uD83D\uDCD6'}</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Rules Browser</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Quick reference for all game rules
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <Text style={[styles.searchIcon, { color: colors.accentGold + '80' }]}>{'\uD83D\uDD0D'}</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search rules..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Core Rules */}
        <View style={[styles.sectionCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
          <TouchableOpacity onPress={() => toggleSection('core')} style={styles.sectionHeader} activeOpacity={0.7}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={{ fontSize: 16, color: colors.accentGold, marginRight: 10 }}>{'\uD83D\uDCD6'}</Text>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Core Rules</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{filteredCoreRules.length} sections</Text>
              </View>
            </View>
            <Text style={[styles.chevronLarge, { color: colors.accentGold }]}>
              {expandedSections.includes('core') ? '\u25BC' : '\u203A'}
            </Text>
          </TouchableOpacity>

          {expandedSections.includes('core') && (
            <View style={[styles.sectionBody, { borderTopColor: colors.accentGold + '1a' }]}>
              {coreRuleGroups.map((group) => (
                <View key={group.label}>
                  <View style={[styles.groupHeader, { backgroundColor: colors.bgPrimary, borderBottomColor: colors.borderColor + '66' }]}>
                    <Text style={[styles.groupLabel, { color: colors.accentGold + 'cc' }]}>{group.label}</Text>
                  </View>
                  {renderRuleList(group.items)}
                </View>
              ))}
              {filteredCoreRules.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No rules found</Text>
              )}
            </View>
          )}
        </View>

        {/* Crusade Rules */}
        <View style={[styles.sectionCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
          <TouchableOpacity onPress={() => toggleSection('crusade')} style={styles.sectionHeader} activeOpacity={0.7}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={{ fontSize: 16, color: colors.accentGold, marginRight: 10 }}>{'\uD83D\uDCD6'}</Text>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Crusade Rules</Text>
                <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{filteredCrusadeRules.length} sections</Text>
              </View>
            </View>
            <Text style={[styles.chevronLarge, { color: colors.accentGold }]}>
              {expandedSections.includes('crusade') ? '\u25BC' : '\u203A'}
            </Text>
          </TouchableOpacity>

          {expandedSections.includes('crusade') && (
            <View style={[styles.sectionBody, { borderTopColor: colors.accentGold + '1a' }]}>
              {renderRuleList(filteredCrusadeRules)}
              {filteredCrusadeRules.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No rules found</Text>
              )}
            </View>
          )}
        </View>

        {/* Global empty state */}
        {filteredCoreRules.length === 0 && filteredCrusadeRules.length === 0 && searchQuery.trim().length > 0 && (
          <View style={styles.globalEmpty}>
            <Text style={styles.globalEmptyIcon}>{'\uD83D\uDCD6'}</Text>
            <Text style={[styles.globalEmptyText, { color: colors.textSecondary }]}>
              No rules found matching "{searchQuery}"
            </Text>
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
    header: { alignItems: 'center', marginBottom: 20 },
    headerIcon: { fontSize: 40, marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    headerSubtitle: { fontSize: 14 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 16,
    },
    searchIcon: { fontSize: 14, marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    sectionCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '600' },
    sectionCount: { fontSize: 12, marginTop: 1 },
    chevronLarge: { fontSize: 18 },
    sectionBody: { borderTopWidth: 1 },
    groupHeader: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderBottomWidth: 1,
    },
    groupLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5 },
    ruleItem: { paddingVertical: 10, paddingHorizontal: 14 },
    ruleItemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    ruleItemInfo: { flex: 1, marginRight: 8 },
    ruleItemTitle: { fontSize: 14 },
    ruleItemSubtitle: { fontSize: 12, marginLeft: 8 },
    chevron: { fontSize: 18 },
    emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 16 },
    globalEmpty: { alignItems: 'center', paddingTop: 40 },
    globalEmptyIcon: { fontSize: 48, opacity: 0.3, marginBottom: 12 },
    globalEmptyText: { fontSize: 14 },
  });
}
