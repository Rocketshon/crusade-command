import React, { useState, useEffect } from 'react';
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
import { CORE_RULES, CRUSADE_RULES } from '../data/general';
import { getRulesForFaction } from '../data';
import { getFaction, getFactionName, getDataFactionId } from '../lib/factions';
import { translateText, SUPPORTED_LANGUAGES } from '../lib/apiServices';
import type { RulesSection, DetachmentData, DetachmentEnhancement, DetachmentStratagem, CrusadeRule, FactionId } from '../types';

// --- Helpers ---

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

function getStratagemTypeColor(type: string): { bg: string; text: string; border: string } {
  const t = type.toLowerCase();
  if (t.includes('battle tactic')) return { bg: '#16a34a15', text: '#22c55e', border: '#22c55e40' };
  if (t.includes('strategic ploy')) return { bg: '#3b82f615', text: '#60a5fa', border: '#60a5fa40' };
  if (t.includes('epic deed')) return { bg: '#f59e0b15', text: '#fbbf24', border: '#fbbf2440' };
  if (t.includes('wargear')) return { bg: '#a855f715', text: '#c084fc', border: '#c084fc40' };
  return { bg: '#94a3b815', text: '#94a3b8', border: '#94a3b840' };
}

// --- Faction data types for RuleDetail ---

type FactionData =
  | { type: 'army_rules'; rules: string[] }
  | { type: 'detachment'; detachment: DetachmentData }
  | { type: 'crusade_rules'; rules: CrusadeRule[] | undefined };

function lookupRule(
  ruleId: string,
  factionId?: string
): { title: string; source: string; sourceType: string; section: RulesSection | null; factionData?: FactionData } | null {
  if (ruleId.startsWith('core-') && CORE_RULES) {
    const idx = parseInt(ruleId.replace('core-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CORE_RULES.sections[idx];
    if (section) return { title: section.name, source: 'Core Rules', sourceType: 'core', section };
  }
  if (ruleId.startsWith('crusade-') && CRUSADE_RULES) {
    const idx = parseInt(ruleId.replace('crusade-', ''), 10);
    if (isNaN(idx)) return null;
    const section = CRUSADE_RULES.sections[idx];
    if (section) return { title: section.name, source: 'Crusade Rules', sourceType: 'crusade', section };
  }
  if (ruleId.startsWith('faction-') && factionId) {
    const factionRules = getRulesForFaction(getDataFactionId(factionId as FactionId));
    if (!factionRules) return null;
    const factionName = getFactionName(factionId as FactionId);
    if (ruleId === 'faction-army-rules') {
      return { title: 'Army Rules', source: factionName, sourceType: 'faction', section: null, factionData: { type: 'army_rules', rules: factionRules.army_rules } };
    }
    if (ruleId.startsWith('faction-det-')) {
      const idx = parseInt(ruleId.replace('faction-det-', ''), 10);
      if (isNaN(idx)) return null;
      const det = factionRules.detachments[idx];
      if (det) return { title: det.name, source: factionName, sourceType: 'faction', section: null, factionData: { type: 'detachment', detachment: det } };
    }
    if (ruleId === 'faction-crusade') {
      return { title: 'Faction Crusade Rules', source: factionName, sourceType: 'faction', section: null, factionData: { type: 'crusade_rules', rules: factionRules.crusade_rules } };
    }
  }
  return null;
}

function parseTextWithSectionHeaders(text: string): { header?: string; text: string }[] {
  if (!text) return [];
  const parts = text.split(/\[([A-Za-z0-9][A-Za-z0-9\s&,.'()\-\u2013]+)\]/);
  const result: { header?: string; text: string }[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    if (i % 2 === 1) {
      const nextText = i + 1 < parts.length ? parts[i + 1].trim() : '';
      if (nextText) {
        result.push({ header: part, text: nextText });
        i++;
      } else {
        result.push({ header: part, text: '' });
      }
    } else {
      result.push({ text: part });
    }
  }
  return result;
}

function extractSubsectionText(fullText: string, subsectionName: string): string | null {
  if (!fullText || !subsectionName) return null;
  const escaped = subsectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const markerPattern = new RegExp(`\\[${escaped}\\]`, 'i');
  const match = fullText.match(markerPattern);
  if (!match || match.index === undefined) return null;
  const startIdx = match.index + match[0].length;
  const remaining = fullText.slice(startIdx);
  const nextMarker = remaining.match(/\[(?:TABLE:|[A-Z][A-Za-z\s&,]+\])/);
  const endIdx = nextMarker && nextMarker.index !== undefined ? nextMarker.index : remaining.length;
  let extracted = remaining.slice(0, endIdx).trim();
  extracted = extracted.replace(/\[|\]/g, '');
  extracted = extracted.replace(/\s{2,}/g, ' ').trim();
  return extracted || null;
}

// --- Main Screen ---

export default function RuleDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors } = useTheme();
  const ruleId = route.params?.ruleId as string | undefined;
  const factionId = route.params?.factionId as string | undefined;

  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const rule = ruleId ? lookupRule(ruleId, factionId) : null;

  const handleTranslate = async (langCode: string, langName: string) => {
    setSelectedLang(langName);
    setTranslating(true);
    setShowTranslateModal(false);

    // Collect rule text
    let textToTranslate = '';
    if (rule?.section) {
      textToTranslate = rule.section.text || '';
    } else if (rule?.factionData) {
      if (rule.factionData.type === 'army_rules') {
        textToTranslate = rule.factionData.rules.join('\n\n');
      } else if (rule.factionData.type === 'detachment') {
        textToTranslate = rule.factionData.detachment.rule.text || '';
      } else if (rule.factionData.type === 'crusade_rules') {
        textToTranslate = (rule.factionData.rules ?? []).map((r) => `${r.name || ''}: ${r.text || ''}`).join('\n\n');
      }
    }

    if (!textToTranslate.trim()) {
      setTranslatedText('No text to translate.');
      setTranslating(false);
      return;
    }

    // Truncate if very long
    const truncated = textToTranslate.slice(0, 3000);
    const result = await translateText(truncated, langCode);
    setTranslatedText(result ?? 'Translation failed. The service may be unavailable.');
    setTranslating(false);
  };

  useEffect(() => {
    setExpandedSubsections(new Set());
  }, [ruleId]);

  const toggleSubsection = (key: string) => {
    setExpandedSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const styles = makeStyles(colors);

  const getSourceBadgeStyle = () => {
    switch (rule?.sourceType) {
      case 'core':
        return { bg: colors.accentGold + '1a', border: colors.accentGold + '4d', text: colors.accentGold };
      case 'crusade':
        return { bg: '#f59e0b1a', border: '#f59e0b4d', text: '#f59e0b' };
      case 'faction':
        return { bg: '#3b82f61a', border: '#3b82f64d', text: '#3b82f6' };
      default:
        return { bg: colors.accentGold + '1a', border: colors.accentGold + '4d', text: colors.accentGold };
    }
  };

  if (!rule) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={{ padding: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{'\uD83D\uDCD6'}</Text>
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>Rule Not Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              The requested rule could not be found.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const sourceBadge = getSourceBadgeStyle();

  // Render a core/crusade rule section with accordion items
  const renderSection = (section: RulesSection) => {
    const items =
      section.accordion && section.accordion.length > 0
        ? section.accordion
        : section.subsections.length > 0
        ? section.subsections.map((sub) => ({
            title: sub,
            text: extractSubsectionText(section.text, sub) || '',
          }))
        : [
            {
              title: section.name,
              text: (section.text || '')
                .replace(/\[TABLE:\s*\[[\s\S]*?\]\]\s*/g, '')
                .replace(/\[[A-Za-z][^\]]*\]/g, '')
                .trim(),
            },
          ];
    const validItems = items.filter((item) => item.text && item.text.trim().length > 0);
    if (validItems.length === 0) {
      return (
        <Text style={[styles.emptyContentText, { color: colors.textSecondary }]}>
          No content available for this section.
        </Text>
      );
    }

    return (
      <View style={[styles.accordionCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
        {validItems.map((item, idx) => {
          const key = `acc-${idx}`;
          const isExpanded = expandedSubsections.has(key);
          return (
            <View key={idx} style={idx < validItems.length - 1 ? { borderBottomWidth: 1, borderBottomColor: colors.borderColor + '99' } : undefined}>
              <TouchableOpacity
                onPress={() => toggleSubsection(key)}
                style={styles.accordionItemHeader}
                activeOpacity={0.7}
              >
                <Text style={[styles.accordionItemTitle, { color: colors.accentGold }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.accordionChevron, { color: isExpanded ? colors.accentGold : colors.textSecondary }]}>
                  {isExpanded ? '\u25BC' : '\u203A'}
                </Text>
              </TouchableOpacity>
              {isExpanded && (
                <View style={[styles.accordionItemBody, { borderTopColor: colors.borderColor + '4d' }]}>
                  <FormattedText text={item.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Render faction-specific data
  const renderFactionData = () => {
    if (!rule.factionData) return null;

    if (rule.factionData.type === 'army_rules') {
      return (
        <View>
          {rule.factionData.rules.map((ruleText, idx) => (
            <View key={idx} style={[styles.contentCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
              <FormattedText text={ruleText} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
            </View>
          ))}
        </View>
      );
    }

    if (rule.factionData.type === 'detachment') {
      const det = rule.factionData.detachment;
      return (
        <View>
          {/* Detachment Rule */}
          <Text style={[styles.detSectionTitle, { color: colors.textPrimary }]}>{det.rule.name}</Text>
          <View style={[styles.contentCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
            <FormattedText text={det.rule.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
          </View>

          {/* Enhancements */}
          {det.enhancements.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.detSectionTitle, { color: colors.textPrimary }]}>Enhancements</Text>
              {det.enhancements.map((enh: DetachmentEnhancement, idx: number) => (
                <View key={idx} style={[styles.enhCard, { borderColor: '#34d39940', backgroundColor: '#34d39910' }]}>
                  <View style={styles.enhHeaderRow}>
                    <Text style={[styles.enhName, { color: '#34d399' }]}>{enh.name}</Text>
                    <Text style={[styles.enhCost, { color: '#34d399' }]}>{enh.cost} pts</Text>
                  </View>
                  <FormattedText text={enh.text} style={{ color: colors.textSecondary, fontSize: 13 }} accentColor={colors.accentGold} />
                </View>
              ))}
            </View>
          )}

          {/* Stratagems */}
          {det.stratagems.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.detSectionTitle, { color: colors.textPrimary }]}>Stratagems</Text>
              {det.stratagems.map((strat: DetachmentStratagem, idx: number) => {
                const stratColors = getStratagemTypeColor(strat.type);
                return (
                  <View key={idx} style={[styles.stratCard, { borderColor: '#a855f733', backgroundColor: '#a855f70d' }]}>
                    <View style={styles.stratHeaderRow}>
                      <Text style={[styles.stratName, { color: '#c084fc' }]}>{strat.name}</Text>
                      <Text style={[styles.stratCp, { color: '#a855f7' }]}>{strat.cp} CP</Text>
                    </View>
                    <View style={[styles.stratTypeBadge, { backgroundColor: stratColors.bg, borderColor: stratColors.border }]}>
                      <Text style={[styles.stratTypeText, { color: stratColors.text }]}>{strat.type}</Text>
                    </View>
                    {strat.when ? (
                      <Text style={[styles.stratDetail, { color: colors.textTertiary }]}>
                        <Text style={{ fontWeight: '600' }}>When: </Text>{strat.when}
                      </Text>
                    ) : null}
                    {strat.target ? (
                      <Text style={[styles.stratDetail, { color: colors.textTertiary }]}>
                        <Text style={{ fontWeight: '600' }}>Target: </Text>{strat.target}
                      </Text>
                    ) : null}
                    {strat.effect ? (
                      <Text style={[styles.stratDetail, { color: colors.textTertiary }]}>
                        <Text style={{ fontWeight: '600' }}>Effect: </Text>{strat.effect}
                      </Text>
                    ) : null}
                    {strat.restrictions ? (
                      <View style={{ marginTop: 4 }}>
                        <Text style={styles.stratRestriction}>
                          <Text style={{ fontWeight: '600' }}>Restrictions: </Text>{strat.restrictions}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (rule.factionData.type === 'crusade_rules') {
      return (
        <View>
          {rule.factionData.rules?.map((cr: CrusadeRule, idx: number) => (
            <View key={idx} style={[styles.crusadeCard, { borderColor: '#f59e0b33', backgroundColor: colors.bgCard }]}>
              {cr.name ? <Text style={[styles.crusadeRuleName, { color: colors.accentGold }]}>{cr.name}</Text> : null}
              {cr.sub_sections && cr.sub_sections.length > 0 ? (
                <View>
                  {cr.text ? (
                    <View style={{ marginBottom: 10 }}>
                      <FormattedText text={cr.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
                    </View>
                  ) : null}
                  {cr.sub_sections.map((sub: { name: string; text: string }, subIdx: number) => (
                    <View key={subIdx}>
                      {subIdx > 0 && <View style={[styles.crusadeDivider, { borderTopColor: '#f59e0b1a' }]} />}
                      <Text style={[styles.crusadeSubName, { color: colors.accentGold }]}>{sub.name}</Text>
                      <FormattedText text={sub.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />
                    </View>
                  ))}
                </View>
              ) : cr.text ? (
                renderCrusadeText(cr.text)
              ) : null}
            </View>
          ))}
        </View>
      );
    }

    return null;
  };

  const renderCrusadeText = (text: string) => {
    if (!text) return null;
    const hasSectionHeaders = /\[([A-Z][A-Za-z\s&,'-]+)\]/.test(text);
    if (!hasSectionHeaders) {
      return <FormattedText text={text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} />;
    }
    const sections = parseTextWithSectionHeaders(text);
    return (
      <View>
        {sections.map((section, idx) => (
          <View key={idx}>
            {idx > 0 && section.header && <View style={[styles.crusadeDivider, { borderTopColor: '#f59e0b1a' }]} />}
            {section.header && <Text style={[styles.crusadeSubName, { color: colors.accentGold }]}>{section.header}</Text>}
            {section.text ? <FormattedText text={section.text} style={{ color: colors.textSecondary }} accentColor={colors.accentGold} /> : null}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back + Translate */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to Rules</Text>
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
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>Translate Rule</Text>
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

        {/* Source Badge */}
        <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bg, borderColor: sourceBadge.border }]}>
          <Text style={[styles.sourceBadgeText, { color: sourceBadge.text }]}>{rule.source}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.ruleTitle, { color: colors.textPrimary }]}>{rule.title}</Text>

        {/* Content */}
        <View style={styles.contentArea}>
          {rule.section && renderSection(rule.section)}
          {rule.factionData && renderFactionData()}
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
    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, opacity: 0.4, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
    emptySubtitle: { fontSize: 14 },
    sourceBadge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 10,
    },
    sourceBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    ruleTitle: { fontSize: 26, fontWeight: 'bold', letterSpacing: 1, marginBottom: 20 },
    contentArea: {},
    // Accordion
    accordionCard: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
    accordionItemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    accordionItemTitle: { fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },
    accordionChevron: { fontSize: 16 },
    accordionItemBody: { paddingHorizontal: 14, paddingBottom: 10, borderTopWidth: 1 },
    emptyContentText: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },
    // Faction content
    contentCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
    detSectionTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 10 },
    enhCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
    enhHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    enhName: { fontSize: 14, fontWeight: 'bold', flex: 1 },
    enhCost: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
    stratCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
    stratHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    stratName: { fontSize: 14, fontWeight: 'bold', flex: 1 },
    stratCp: { fontSize: 12, fontWeight: 'bold', fontFamily: 'monospace' },
    stratTypeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    stratTypeText: { fontSize: 11, fontWeight: '600' },
    stratDetail: { fontSize: 13, lineHeight: 19, marginBottom: 2 },
    stratRestriction: { fontSize: 12, color: '#ef4444' },
    crusadeCard: { borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 12 },
    crusadeRuleName: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
    crusadeDivider: { borderTopWidth: 1, marginVertical: 10 },
    crusadeSubName: { fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 6 },
  });
}
