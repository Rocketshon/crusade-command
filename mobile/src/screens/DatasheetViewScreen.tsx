import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getUnitsForFaction } from '../data';
import { getFaction, getDataFactionId } from '../lib/factions';
import { translateText, SUPPORTED_LANGUAGES } from '../lib/apiServices';
import type { FactionId, Datasheet, WeaponProfile } from '../types';

// --- Helpers ---

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

function FormattedText({ text, style, accentColor }: { text: string; style?: any; accentColor: string }) {
  if (!text) return null;
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

// --- Weapon Stat Table ---

function WeaponStatTable({
  weapons,
  type,
  colors,
}: {
  weapons: WeaponProfile[];
  type: 'ranged' | 'melee';
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const headerColor = type === 'ranged' ? '#ef4444' : '#f59e0b';
  const statKeys: (keyof WeaponProfile)[] = type === 'ranged'
    ? ['range', 'A', 'skill', 'S', 'AP', 'D']
    : ['A', 'skill', 'S', 'AP', 'D'];
  const statLabels: Record<string, string> = {
    range: 'Range', A: 'A', skill: 'WS/BS', S: 'S', AP: 'AP', D: 'D',
  };

  return (
    <View style={[wStyles.tableContainer, { borderColor: headerColor + '40' }]}>
      {/* Header */}
      <View style={[wStyles.tableHeaderRow, { backgroundColor: headerColor + '15' }]}>
        <Text style={[wStyles.tableHeaderName, { color: headerColor }]}>
          {type === 'ranged' ? 'Ranged Weapons' : 'Melee Weapons'}
        </Text>
        {statKeys.map((key) => (
          <Text key={key} style={[wStyles.tableHeaderStat, { color: headerColor }]}>
            {statLabels[key] ?? key}
          </Text>
        ))}
      </View>
      {/* Rows */}
      {weapons.map((weapon, idx) => (
        <View key={idx}>
          <View style={[wStyles.tableRow, idx < weapons.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderColor + '40' }]}>
            <View style={wStyles.weaponNameCol}>
              <Text style={[wStyles.weaponName, { color: colors.textPrimary }]} numberOfLines={2}>
                {weapon.name}
              </Text>
              {weapon.traits.length > 0 && (
                <View style={wStyles.traitsRow}>
                  {weapon.traits.map((trait, tIdx) => (
                    <View key={tIdx} style={[wStyles.traitBadge, { backgroundColor: colors.accentGold + '15', borderColor: colors.accentGold + '30' }]}>
                      <Text style={[wStyles.traitText, { color: colors.accentGold }]}>{trait}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            {statKeys.map((key) => (
              <Text key={key} style={[wStyles.statCell, { color: colors.textPrimary }]}>
                {weapon[key] as string}
              </Text>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const wStyles = StyleSheet.create({
  tableContainer: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderName: { flex: 3, fontSize: 12, fontWeight: 'bold' },
  tableHeaderStat: { flex: 1, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  weaponNameCol: { flex: 3 },
  weaponName: { fontSize: 12, fontWeight: '500' },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 3 },
  traitBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, borderWidth: 1 },
  traitText: { fontSize: 9, fontWeight: '600' },
  statCell: { flex: 1, fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
});

// --- Main Screen ---

export default function DatasheetViewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();

  const factionId = route.params?.factionId as string | undefined;
  const datasheetName = route.params?.datasheetName as string | undefined;

  const units = factionId ? getUnitsForFaction(getDataFactionId(factionId as FactionId)) : [];
  const datasheet: Datasheet | undefined = datasheetName
    ? units.find((u) => u.name === datasheetName || u.name === decodeURIComponent(datasheetName))
    : undefined;
  const factionMeta = factionId ? getFaction(factionId as FactionId) : undefined;

  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const handleTranslate = async (langCode: string, langName: string) => {
    setSelectedLang(langName);
    setTranslating(true);
    setShowTranslateModal(false);

    // Collect all ability text
    const allText = (datasheet?.abilities?.other ?? [])
      .map(([name, text]) => `${name}: ${text}`)
      .join('\n\n');

    if (!allText) {
      setTranslatedText('No ability text to translate.');
      setTranslating(false);
      return;
    }

    const result = await translateText(allText, langCode);
    setTranslatedText(result ?? 'Translation failed. The service may be unavailable.');
    setTranslating(false);
  };

  const styles = makeStyles(colors);

  if (!datasheet) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Datasheet Not Found</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statEntries = datasheet.stats ? Object.entries(datasheet.stats) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back + Translate */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Codex</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowTranslateModal(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: colors.borderColor,
              borderRadius: 6,
              backgroundColor: colors.bgCard,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{'\uD83C\uDF10'}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Translate</Text>
          </TouchableOpacity>
        </View>

        {/* Translate Modal */}
        <Modal visible={showTranslateModal} animationType="slide" transparent onRequestClose={() => setShowTranslateModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: colors.bgPrimary, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '60%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Translate Abilities</Text>
                <TouchableOpacity onPress={() => setShowTranslateModal(false)}>
                  <Text style={{ fontSize: 20, color: colors.textSecondary }}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleTranslate(lang.code, lang.name)}
                    style={{
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderColor,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 15, color: colors.textPrimary }}>{lang.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Translation Result */}
        {translating && (
          <View style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 12 }}>
            <ActivityIndicator size="small" color={colors.accentGold} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>Translating to {selectedLang}...</Text>
          </View>
        )}
        {translatedText && !translating && (
          <View style={{ borderWidth: 1, borderColor: colors.borderColor, borderRadius: 8, padding: 12, marginBottom: 16, backgroundColor: colors.bgCard }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.accentGold }}>Translated ({selectedLang})</Text>
              <TouchableOpacity onPress={() => setTranslatedText(null)}>
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>{translatedText}</Text>
          </View>
        )}

        {/* Unit Header */}
        <Text style={[styles.unitName, { color: colors.textPrimary }]}>{datasheet.name}</Text>
        <Text style={[styles.unitFaction, { color: colors.accentGold }]}>{datasheet.faction}</Text>

        {/* Points */}
        {datasheet.points.length > 0 && (
          <View style={styles.pointsRow}>
            {datasheet.points.map((tier, idx) => (
              <View key={idx} style={[styles.pointsBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[styles.pointsModels, { color: colors.textSecondary }]}>{tier.models} models:</Text>
                <Text style={[styles.pointsCost, { color: colors.accentGold }]}>{tier.cost} pts</Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats Grid */}
        {statEntries.length > 0 && (
          <View style={[styles.statsGrid, { borderColor: colors.accentGold + '4d' }]}>
            <View style={styles.statsHeaderRow}>
              {statEntries.map(([stat]) => (
                <View key={stat} style={[styles.statHeaderCell, { backgroundColor: colors.accentGold + '15' }]}>
                  <Text style={[styles.statHeaderText, { color: colors.accentGold }]}>{stat}</Text>
                </View>
              ))}
            </View>
            <View style={styles.statsValueRow}>
              {statEntries.map(([stat, value]) => (
                <View key={stat} style={[styles.statValueCell, { backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Invuln Save */}
        {datasheet.invuln && (
          <View style={styles.invulnRow}>
            <Text style={{ fontSize: 14, color: '#60a5fa', marginRight: 4 }}>{'\uD83D\uDEE1\uFE0F'}</Text>
            <Text style={[styles.invulnLabel, { color: colors.textSecondary }]}>Invulnerable Save:</Text>
            <Text style={[styles.invulnValue, { color: '#60a5fa' }]}>{datasheet.invuln}</Text>
          </View>
        )}

        {/* Weapons */}
        {datasheet.ranged_weapons.length > 0 && (
          <WeaponStatTable weapons={datasheet.ranged_weapons} type="ranged" colors={colors} />
        )}
        {datasheet.melee_weapons.length > 0 && (
          <WeaponStatTable weapons={datasheet.melee_weapons} type="melee" colors={colors} />
        )}

        {/* Abilities */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {'\u26A1'} Abilities
          </Text>

          {datasheet.abilities.core.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.abilityCategory, { color: colors.textSecondary }]}>CORE</Text>
              <View style={styles.abilityBadgeRow}>
                {datasheet.abilities.core.map((ability, idx) => (
                  <View key={idx} style={[styles.coreAbilityBadge, { borderColor: colors.accentGold + '4d', backgroundColor: colors.accentGold + '15' }]}>
                    <Text style={[styles.coreAbilityText, { color: colors.accentGold }]}>{ability}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {datasheet.abilities.faction.length > 0 && (
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.abilityCategory, { color: colors.textSecondary }]}>FACTION</Text>
              <View style={styles.abilityBadgeRow}>
                {datasheet.abilities.faction.map((fa, idx) => (
                  <View key={idx} style={[styles.factionAbilityBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                    <Text style={[styles.factionAbilityText, { color: colors.accentGold }]}>{fa}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {datasheet.abilities.other.map((ability, idx) => (
            <View key={idx} style={[styles.abilityCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <Text style={[styles.abilityName, { color: colors.accentGold }]}>{ability[0]}</Text>
              <FormattedText text={ability[1]} style={{ color: colors.textSecondary, fontSize: 12 }} accentColor={colors.accentGold} />
            </View>
          ))}
        </View>

        {/* Unit Composition */}
        {datasheet.unit_composition ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Unit Composition</Text>
            <View style={[styles.textCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <Text style={[styles.compositionText, { color: colors.textTertiary }]}>{datasheet.unit_composition}</Text>
            </View>
          </View>
        ) : null}

        {/* Wargear Options */}
        {datasheet.wargear_options.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Wargear Options</Text>
            <View style={[styles.textCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              {datasheet.wargear_options.map((opt, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <Text style={[styles.bullet, { color: colors.textTertiary }]}>{'\u2022'}</Text>
                  <Text style={[styles.bulletText, { color: colors.textTertiary }]}>{opt}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Wargear Abilities */}
        {datasheet.wargear_abilities.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Wargear Abilities</Text>
            {datasheet.wargear_abilities.map((ability, idx) => {
              if (typeof ability === 'string') {
                return <Text key={idx} style={[{ fontSize: 12, color: colors.textTertiary, marginBottom: 4 }]}>{ability}</Text>;
              }
              return (
                <View key={idx} style={[styles.abilityCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                  <Text style={[styles.abilityName, { color: colors.accentGold }]}>{ability[0]}</Text>
                  <Text style={[{ fontSize: 12, color: colors.textTertiary }]}>{ability[1]}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Damaged Profile */}
        {datasheet.damaged ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Damaged Profile</Text>
            <View style={[styles.textCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <FormattedText text={datasheet.damaged} style={{ color: '#fbbf24', fontSize: 13 }} accentColor={colors.accentGold} />
            </View>
          </View>
        ) : null}

        {/* Keywords */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Keywords</Text>
          <View style={styles.abilityBadgeRow}>
            {datasheet.keywords.map((keyword, idx) => (
              <View key={idx} style={[styles.keywordBadge, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[styles.keywordText, { color: colors.textTertiary }]}>{toTitleCase(keyword)}</Text>
              </View>
            ))}
          </View>
          {datasheet.faction_keywords.length > 0 && (
            <View style={[styles.abilityBadgeRow, { marginTop: 8 }]}>
              {datasheet.faction_keywords.map((keyword, idx) => (
                <View key={idx} style={[styles.keywordBadge, { borderColor: colors.accentGold + '33', backgroundColor: colors.accentGold + '0d' }]}>
                  <Text style={[styles.keywordText, { color: colors.accentGold }]}>{toTitleCase(keyword)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Leader */}
        {datasheet.leader ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Leader</Text>
            <View style={[styles.textCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <FormattedText text={datasheet.leader} style={{ color: '#c084fc', fontSize: 13 }} accentColor={colors.accentGold} />
            </View>
          </View>
        ) : null}
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
    unitName: { fontSize: 26, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
    unitFaction: { fontSize: 13, marginBottom: 12 },
    pointsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    pointsBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
    pointsModels: { fontSize: 12, marginRight: 6 },
    pointsCost: { fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },
    statsGrid: { borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
    statsHeaderRow: { flexDirection: 'row' },
    statHeaderCell: { flex: 1, paddingVertical: 4, alignItems: 'center' },
    statHeaderText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    statsValueRow: { flexDirection: 'row' },
    statValueCell: { flex: 1, paddingVertical: 8, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold' },
    invulnRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
    invulnLabel: { fontSize: 13, marginRight: 6 },
    invulnValue: { fontSize: 16, fontWeight: 'bold' },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 10 },
    abilityCategory: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    abilityBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    coreAbilityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    coreAbilityText: { fontSize: 12, fontWeight: '600' },
    factionAbilityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    factionAbilityText: { fontSize: 12, fontWeight: '600' },
    abilityCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
    abilityName: { fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
    textCard: { borderWidth: 1, borderRadius: 8, padding: 12 },
    compositionText: { fontSize: 13, lineHeight: 20 },
    bulletRow: { flexDirection: 'row', marginBottom: 4 },
    bullet: { fontSize: 14, marginRight: 6 },
    bulletText: { fontSize: 13, flex: 1, lineHeight: 20 },
    keywordBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    keywordText: { fontSize: 12, fontWeight: '600' },
  });
}
