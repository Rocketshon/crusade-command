import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy } from '../contexts/ArmyContext';
import {
  CRUSADE_FACTIONS,
  SW_OATHSWORN_CAMPAIGNS,
  type CrusadeFaction,
} from '../data/crusadeRules';
import { getRulesForFaction } from '../data';
import type { FactionId } from '../types';

type Step = 'faction' | 'detachment' | 'supply' | 'saga' | 'name';

export default function ArmyCrusadeSetupScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { initCrusadeCampaign, renameArmy, activeArmyId } = useArmy();

  const [step, setStep] = useState<Step>('faction');
  const [faction, setFaction] = useState<CrusadeFaction | null>(null);
  const [detachment, setDetachment] = useState('');
  const [supplyLimit, setSupplyLimitLocal] = useState(1000);
  const [startingRP, setStartingRP] = useState(5);
  const [startingWins, setStartingWins] = useState(0);
  const [startingLosses, setStartingLosses] = useState(0);
  const [startingDraws, setStartingDraws] = useState(0);
  const [oathswornId, setOathswornId] = useState('');
  const [armyName, setArmyName] = useState('');
  const [detachmentSearch, setDetachmentSearch] = useState('');

  const steps: Step[] = faction?.hasOathswornCampaigns
    ? ['faction', 'detachment', 'supply', 'saga', 'name']
    : ['faction', 'detachment', 'supply', 'name'];
  const idx = steps.indexOf(step);

  const canNext = () => {
    if (step === 'faction') return faction !== null;
    if (step === 'detachment') return detachment !== '';
    if (step === 'supply') return supplyLimit >= 500;
    return true;
  };

  const goNext = () => {
    const ni = idx + 1;
    if (ni < steps.length) setStep(steps[ni]);
  };
  const goBack = () => {
    if (idx === 0) {
      navigation.goBack();
      return;
    }
    setStep(steps[idx - 1]);
  };

  const handleFinish = () => {
    if (!faction) return;
    initCrusadeCampaign({
      factionId: faction.id,
      detachmentName: detachment,
      supplyLimit,
      startingRP,
      startingWins,
      startingLosses,
      startingDraws,
      oathswornCampaignId: oathswornId || undefined,
      factionPointsLabel:
        faction.mechanic === 'honour_points'
          ? 'Honour Points'
          : faction.mechanic === 'skulls'
          ? 'Skull Points'
          : faction.mechanic === 'virulence'
          ? 'Virulence Points'
          : faction.mechanic === 'glory'
          ? 'Glory Points'
          : faction.mechanic === 'commendations'
          ? 'Commendations'
          : 'Points',
    });
    const name = armyName.trim() || `${faction.name} Crusade`;
    if (activeArmyId) renameArmy(activeArmyId, name);
    navigation.navigate('ArmyBuilder');
  };

  // Get detachment names
  const detachmentNames: string[] = (() => {
    if (!faction) return [];
    const rulesData = getRulesForFaction(faction.id as FactionId);
    return rulesData?.detachments.map(d => d.name) ?? faction.detachments;
  })();

  const filteredDetachments = detachmentSearch
    ? detachmentNames.filter(n => n.toLowerCase().includes(detachmentSearch.toLowerCase()))
    : detachmentNames;

  const s = createStyles(colors);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          {/* Back */}
          <TouchableOpacity onPress={goBack} style={s.backBtn}>
            <Text style={[s.backText, { color: colors.textSecondary }]}>{'< Back'}</Text>
          </TouchableOpacity>

          {/* Progress */}
          <View style={s.progressRow}>
            {steps.map((st, i) => (
              <View
                key={st}
                style={[
                  s.progressBar,
                  { backgroundColor: i <= idx ? colors.accentGold : colors.borderColor },
                ]}
              />
            ))}
          </View>

          {/* FACTION STEP */}
          {step === 'faction' && (
            <View>
              <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Choose Faction</Text>
              <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
                Select your Crusade faction
              </Text>
              {CRUSADE_FACTIONS.map(f => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    s.optionCard,
                    {
                      borderColor: faction?.id === f.id ? colors.accentGold : colors.borderColor,
                      backgroundColor: faction?.id === f.id ? colors.accentGold + '1A' : colors.bgCard,
                    },
                  ]}
                  onPress={() => {
                    setFaction(f);
                    setDetachment('');
                  }}
                >
                  <View style={s.optionRow}>
                    <View style={s.optionTextWrap}>
                      <Text style={[s.optionName, { color: colors.textPrimary }]}>{f.name}</Text>
                      <Text style={[s.optionMeta, { color: colors.textSecondary }]}>
                        {f.mechanicLabel}
                      </Text>
                    </View>
                    {faction?.id === f.id && (
                      <View style={[s.selectedDot, { backgroundColor: colors.accentGold }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* DETACHMENT STEP */}
          {step === 'detachment' && faction && (
            <View>
              <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Detachment</Text>
              <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>{faction.name}</Text>
              <TextInput
                value={detachmentSearch}
                onChangeText={setDetachmentSearch}
                placeholder="Search..."
                placeholderTextColor={colors.textSecondary}
                style={[
                  s.searchInput,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.borderColor,
                    color: colors.textPrimary,
                  },
                ]}
              />
              {filteredDetachments.map(det => (
                <TouchableOpacity
                  key={det}
                  style={[
                    s.optionCard,
                    {
                      borderColor: detachment === det ? colors.accentGold : colors.borderColor,
                      backgroundColor: detachment === det ? colors.accentGold + '1A' : colors.bgCard,
                    },
                  ]}
                  onPress={() => setDetachment(det)}
                >
                  <View style={s.optionRow}>
                    <Text style={[s.optionName, { color: colors.textPrimary }]}>{det}</Text>
                    {detachment === det && (
                      <View style={[s.selectedDot, { backgroundColor: colors.accentGold }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {filteredDetachments.length === 0 && (
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                  No results for "{detachmentSearch}"
                </Text>
              )}
            </View>
          )}

          {/* SUPPLY STEP */}
          {step === 'supply' && (
            <View>
              <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Campaign State</Text>
              <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
                New campaign or continuing an existing one?
              </Text>

              {/* Supply Limit */}
              <View style={[s.fieldCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>SUPPLY LIMIT (PTS)</Text>
                <View style={s.chipRow}>
                  {[500, 750, 1000, 1250, 1500, 2000].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[
                        s.chip,
                        {
                          borderColor: supplyLimit === v ? colors.accentGold : colors.borderColor,
                          backgroundColor: supplyLimit === v ? colors.accentGold + '1A' : 'transparent',
                        },
                      ]}
                      onPress={() => setSupplyLimitLocal(v)}
                    >
                      <Text
                        style={[
                          s.chipText,
                          { color: supplyLimit === v ? colors.accentGold : colors.textSecondary, fontWeight: supplyLimit === v ? '700' : '400' },
                        ]}
                      >
                        {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.fieldHint, { color: colors.textSecondary }]}>Standard start: 1000 pts</Text>
              </View>

              {/* RP Counter */}
              <View style={[s.fieldCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>CURRENT REQUISITION POINTS</Text>
                <View style={s.counterRow}>
                  <TouchableOpacity
                    style={[s.counterBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setStartingRP(v => Math.max(0, v - 1))}
                  >
                    <Text style={[s.counterBtnText, { color: colors.textSecondary }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[s.counterValue, { color: colors.accentGold }]}>{startingRP}</Text>
                  <TouchableOpacity
                    style={[s.counterBtn, { borderColor: colors.borderColor }]}
                    onPress={() => setStartingRP(v => Math.min(10, v + 1))}
                  >
                    <Text style={[s.counterBtnText, { color: colors.textSecondary }]}>+</Text>
                  </TouchableOpacity>
                  <Text style={[s.fieldHint, { color: colors.textSecondary, marginLeft: 8 }]}>
                    / 10 RP · Standard start: 5
                  </Text>
                </View>
              </View>

              {/* W/L/D */}
              <View style={[s.fieldCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>EXISTING BATTLE RECORD</Text>
                <Text style={[s.fieldHint, { color: colors.textSecondary, marginBottom: 12 }]}>
                  Already in a campaign? Enter your current record.
                </Text>
                <View style={s.wldRow}>
                  {([
                    ['Wins', startingWins, setStartingWins, '#16a34a'],
                    ['Losses', startingLosses, setStartingLosses, '#ef4444'],
                    ['Draws', startingDraws, setStartingDraws, '#9ca3af'],
                  ] as [string, number, (v: number) => void, string][]).map(([label, val, setter, color]) => (
                    <View key={label} style={s.wldItem}>
                      <Text style={[s.wldLabel, { color }]}>{label.toUpperCase()}</Text>
                      <View style={s.counterRow}>
                        <TouchableOpacity
                          style={[s.smallCounterBtn, { borderColor: colors.borderColor }]}
                          onPress={() => setter(Math.max(0, val - 1))}
                        >
                          <Text style={[s.counterBtnText, { color: colors.textSecondary, fontSize: 12 }]}>-</Text>
                        </TouchableOpacity>
                        <Text style={[s.wldValue, { color }]}>{val}</Text>
                        <TouchableOpacity
                          style={[s.smallCounterBtn, { borderColor: colors.borderColor }]}
                          onPress={() => setter(val + 1)}
                        >
                          <Text style={[s.counterBtnText, { color: colors.textSecondary, fontSize: 12 }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* SAGA STEP */}
          {step === 'saga' && (
            <View>
              <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Oathsworn Campaign</Text>
              <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>
                Choose your Saga -- optional bonus agendas throughout the campaign.
              </Text>
              <TouchableOpacity
                style={[
                  s.optionCard,
                  {
                    borderColor: oathswornId === '' ? colors.accentGold : colors.borderColor,
                    backgroundColor: oathswornId === '' ? colors.accentGold + '1A' : colors.bgCard,
                  },
                ]}
                onPress={() => setOathswornId('')}
              >
                <View style={s.optionRow}>
                  <View style={s.optionTextWrap}>
                    <Text style={[s.optionName, { color: colors.textPrimary }]}>No Saga</Text>
                    <Text style={[s.optionMeta, { color: colors.textSecondary }]}>Standard Crusade</Text>
                  </View>
                  {oathswornId === '' && (
                    <View style={[s.selectedDot, { backgroundColor: colors.accentGold }]} />
                  )}
                </View>
              </TouchableOpacity>
              {SW_OATHSWORN_CAMPAIGNS.map(saga => (
                <TouchableOpacity
                  key={saga.id}
                  style={[
                    s.optionCard,
                    {
                      borderColor: oathswornId === saga.id ? colors.accentGold : colors.borderColor,
                      backgroundColor: oathswornId === saga.id ? colors.accentGold + '1A' : colors.bgCard,
                    },
                  ]}
                  onPress={() => setOathswornId(saga.id)}
                >
                  <View style={s.optionRow}>
                    <View style={s.optionTextWrap}>
                      <Text style={[s.optionName, { color: colors.textPrimary }]}>{saga.name}</Text>
                      <Text style={[s.optionMeta, { color: colors.textSecondary }]}>{saga.description}</Text>
                      {!saga.verified && (
                        <Text style={[s.warningText, { color: '#fbbf24' }]}>Verify with codex</Text>
                      )}
                    </View>
                    {oathswornId === saga.id && (
                      <View style={[s.selectedDot, { backgroundColor: colors.accentGold }]} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* NAME STEP */}
          {step === 'name' && faction && (
            <View>
              <Text style={[s.stepTitle, { color: colors.textPrimary }]}>Name Your Force</Text>
              <Text style={[s.stepSubtitle, { color: colors.textSecondary }]}>Give your warband a name</Text>

              <View style={[s.fieldCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>WARBAND NAME</Text>
                <TextInput
                  value={armyName}
                  onChangeText={setArmyName}
                  placeholder={`${faction.name} Crusade`}
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  style={[
                    s.textInput,
                    {
                      backgroundColor: colors.bgPrimary,
                      borderColor: colors.borderColor,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              {/* Summary */}
              <View style={[s.fieldCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}>
                <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 12 }]}>SUMMARY</Text>
                {[
                  ['Faction', faction.name],
                  ['Detachment', detachment],
                  ['Supply Limit', `${supplyLimit} pts`],
                  ['Starting RP', `${startingRP} RP`],
                  ...(oathswornId
                    ? [['Saga', SW_OATHSWORN_CAMPAIGNS.find(sg => sg.id === oathswornId)?.name ?? '']]
                    : []),
                ].map(([label, value]) => (
                  <View key={label} style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[s.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Nav buttons */}
          <View style={s.navRow}>
            {step !== 'faction' && (
              <TouchableOpacity
                style={[s.navBtn, { borderColor: colors.borderColor, flex: 1 }]}
                onPress={goBack}
              >
                <Text style={[s.navBtnText, { color: colors.textSecondary }]}>{'< Back'}</Text>
              </TouchableOpacity>
            )}
            {step !== 'name' ? (
              <TouchableOpacity
                style={[
                  s.navBtn,
                  {
                    borderColor: colors.accentGold,
                    backgroundColor: colors.accentGold + '1A',
                    flex: 1,
                    opacity: canNext() ? 1 : 0.4,
                  },
                ]}
                onPress={goNext}
                disabled={!canNext()}
              >
                <Text style={[s.navBtnText, { color: colors.accentGold, fontWeight: '600' }]}>
                  Continue {'>'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  s.navBtn,
                  {
                    borderColor: colors.accentGold,
                    backgroundColor: colors.accentGold,
                    flex: 1,
                  },
                ]}
                onPress={handleFinish}
              >
                <Text style={[s.navBtnText, { color: colors.bgPrimary, fontWeight: '700' }]}>
                  Begin Crusade
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 96 },
    inner: { maxWidth: 448, alignSelf: 'center', width: '100%' },
    backBtn: { marginBottom: 24 },
    backText: { fontSize: 14 },
    progressRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
    progressBar: { flex: 1, height: 4, borderRadius: 2 },
    stepTitle: { fontSize: 22, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    stepSubtitle: { fontSize: 14, marginBottom: 24 },
    optionCard: { borderWidth: 1, borderRadius: 4, padding: 16, marginBottom: 8 },
    optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    optionTextWrap: { flex: 1 },
    optionName: { fontSize: 14, fontWeight: '600' },
    optionMeta: { fontSize: 12, marginTop: 2 },
    selectedDot: { width: 16, height: 16, borderRadius: 8 },
    searchInput: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      marginBottom: 16,
    },
    fieldCard: { borderWidth: 1, borderRadius: 4, padding: 16, marginBottom: 20 },
    fieldLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginBottom: 12 },
    fieldHint: { fontSize: 12, marginTop: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flex: 1, minWidth: 55, borderWidth: 1, borderRadius: 4, paddingVertical: 8, alignItems: 'center' },
    chipText: { fontSize: 12 },
    counterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    counterBtn: {
      width: 36,
      height: 36,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterBtnText: { fontSize: 18, fontWeight: '700' },
    counterValue: { fontSize: 24, fontWeight: '700', width: 40, textAlign: 'center' },
    wldRow: { flexDirection: 'row', justifyContent: 'space-around' },
    wldItem: { alignItems: 'center' },
    wldLabel: { fontSize: 10, letterSpacing: 1, marginBottom: 8 },
    wldValue: { fontSize: 18, fontWeight: '700', width: 24, textAlign: 'center' },
    smallCounterBtn: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningText: { fontSize: 12, marginTop: 4 },
    textInput: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      marginTop: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    summaryLabel: { fontSize: 14 },
    summaryValue: { fontSize: 14, fontWeight: '500' },
    emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 16 },
    navRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
    navBtn: {
      borderWidth: 1,
      borderRadius: 4,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtnText: { fontSize: 14 },
  });
}
