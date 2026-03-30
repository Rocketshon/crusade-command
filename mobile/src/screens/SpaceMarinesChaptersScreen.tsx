import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACE_MARINE_CHAPTERS, getDataFactionId } from '../lib/factions';
import { getUnitsForFaction, getRulesForFaction } from '../data';
import type { FactionId } from '../types';

const CHAPTER_ACCENT: Record<string, string> = {
  space_wolves: '#22d3ee',
  blood_angels: '#ef4444',
  dark_angels: '#15803d',
  black_templars: '#a8a29e',
  deathwatch: '#94a3b8',
  ultramarines: '#3b82f6',
  imperial_fists: '#ca8a04',
  iron_hands: '#64748b',
  salamanders: '#f97316',
  raven_guard: '#475569',
  white_scars: '#f87171',
};

export default function SpaceMarinesChaptersScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const chapters = useMemo(() =>
    SPACE_MARINE_CHAPTERS.map((ch) => {
      const dataId = getDataFactionId(ch.id as FactionId);
      const datasheets = getUnitsForFaction(dataId)?.length ?? ch.uniqueDatasheets;
      const detachments = getRulesForFaction(dataId)?.detachments?.length ?? ch.detachments;
      const accent = CHAPTER_ACCENT[ch.id] ?? '#3b82f6';
      return { ...ch, datasheets, detachments, accent };
    }), []);

  const handleChapterClick = (chapter: typeof chapters[0]) => {
    navigation.navigate('FactionCodex', { factionId: chapter.id });
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Codex Library</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerIcon, { color: '#3b82f6' }]}>{'\uD83D\uDEE1\uFE0F'}</Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Space Marines</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Choose Your Chapter
          </Text>
        </View>

        {/* Chapter List */}
        {chapters.map((chapter) => (
          <TouchableOpacity
            key={chapter.id}
            onPress={() => handleChapterClick(chapter)}
            style={[styles.chapterCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}
            activeOpacity={0.7}
          >
            <View style={[styles.chapterGlow, { backgroundColor: chapter.accent + '10' }]} />
            <View style={styles.chapterRow}>
              <Text style={styles.chapterIcon}>{chapter.icon}</Text>
              <View style={styles.chapterInfo}>
                <Text style={[styles.chapterName, { color: colors.textPrimary }]}>
                  {chapter.name}
                </Text>
                <View style={styles.chapterMeta}>
                  <Text style={[styles.chapterMetaText, { color: colors.textSecondary }]}>
                    {chapter.datasheets} datasheets
                  </Text>
                  <Text style={[styles.chapterMetaDot, { color: colors.textSecondary }]}>{'\u2022'}</Text>
                  <Text style={[styles.chapterMetaText, { color: colors.textSecondary }]}>
                    {chapter.detachments} detachments
                  </Text>
                </View>
              </View>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>{'\u203A'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Footer Note */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Each chapter has access to their own unique datasheets, detachments, and rules.
            Select a chapter to view its full codex.
          </Text>
        </View>
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
    header: { alignItems: 'center', marginBottom: 24 },
    headerIcon: { fontSize: 40, marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    headerSubtitle: { fontSize: 14 },
    chapterCard: {
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 10,
    },
    chapterGlow: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.3,
    },
    chapterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
    },
    chapterIcon: { fontSize: 28, marginRight: 14 },
    chapterInfo: { flex: 1 },
    chapterName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    chapterMeta: { flexDirection: 'row', alignItems: 'center' },
    chapterMetaText: { fontSize: 12 },
    chapterMetaDot: { fontSize: 12, marginHorizontal: 6 },
    chevron: { fontSize: 24, marginLeft: 8 },
    footer: { marginTop: 24, alignItems: 'center', paddingHorizontal: 16 },
    footerText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  });
}
