import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { calculateAttack, type AttackInput, type AttackResult } from '../lib/dicemath';

type RerollMode = undefined | 'ones' | 'all';

function NumericInput({
  label,
  value,
  onChangeText,
  placeholder,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  colors: any;
}) {
  return (
    <View style={inputStyles.wrapper}>
      <Text style={[inputStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={colors.textSecondary + '66'}
        keyboardType="numeric"
        style={[
          inputStyles.input,
          { backgroundColor: colors.bgCard, borderColor: colors.borderColor, color: colors.textPrimary },
        ]}
      />
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 70 },
  label: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

function RerollToggle({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: RerollMode;
  onChange: (v: RerollMode) => void;
  colors: any;
}) {
  const options: { key: RerollMode; text: string }[] = [
    { key: undefined, text: 'Off' },
    { key: 'ones', text: '1s' },
    { key: 'all', text: 'All' },
  ];
  return (
    <View style={rerollStyles.container}>
      <Text style={[rerollStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={rerollStyles.row}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.text}
              onPress={() => onChange(opt.key)}
              style={[
                rerollStyles.btn,
                {
                  backgroundColor: active ? colors.accentGold + '20' : 'transparent',
                  borderColor: active ? colors.accentGold : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  rerollStyles.btnText,
                  { color: active ? colors.accentGold : colors.textSecondary },
                ]}
              >
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const rerollStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  btnText: { fontSize: 12, fontWeight: '600' },
});

function BoolToggle({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={toggleStyles.row}>
      <Text style={[toggleStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.borderColor, true: colors.accentGold }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  label: { fontSize: 14 },
});

function ProbBar({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <View style={barStyles.container}>
      <View style={barStyles.labelRow}>
        <Text style={[barStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[barStyles.value, { color }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={[barStyles.track, { backgroundColor: colors.borderColor }]}>
        <View style={[barStyles.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});

function ResultStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={resultStyles.stat}>
      <Text style={[resultStyles.value, { color }]}>{value.toFixed(2)}</Text>
      <Text style={[resultStyles.label, { color: color + 'b3' }]}>{label}</Text>
    </View>
  );
}

const resultStyles = StyleSheet.create({
  stat: { alignItems: 'center', flex: 1 },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
});

export default function DiceCalculatorScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  // Form state
  const [attacks, setAttacks] = useState('10');
  const [skill, setSkill] = useState('3');
  const [strength, setStrength] = useState('4');
  const [toughness, setToughness] = useState('4');
  const [ap, setAp] = useState('1');
  const [save, setSave] = useState('3');
  const [invuln, setInvuln] = useState('');
  const [damage, setDamage] = useState('1');
  const [fnp, setFnp] = useState('');

  const [rerollHits, setRerollHits] = useState<RerollMode>(undefined);
  const [rerollWounds, setRerollWounds] = useState<RerollMode>(undefined);
  const [lethalHits, setLethalHits] = useState(false);
  const [sustainedHits, setSustainedHits] = useState(false);
  const [devWounds, setDevWounds] = useState(false);

  const [result, setResult] = useState<AttackResult | null>(null);

  const handleCalculate = () => {
    const input: AttackInput = {
      attacks: parseInt(attacks, 10) || 0,
      skill: parseInt(skill, 10) || 3,
      strength: parseInt(strength, 10) || 4,
      toughness: parseInt(toughness, 10) || 4,
      ap: parseInt(ap, 10) || 0,
      save: parseInt(save, 10) || 3,
      invuln: invuln ? parseInt(invuln, 10) : undefined,
      damage: parseInt(damage, 10) || 1,
      fnp: fnp ? parseInt(fnp, 10) : undefined,
      rerollHits,
      rerollWounds,
      lethalHits,
      sustainedHits: sustainedHits ? 1 : undefined,
      devWounds,
    };
    setResult(calculateAttack(input));
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dice Calculator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Attack Profile */}
        <Text style={[styles.sectionLabel, { color: colors.accentGold }]}>ATTACK PROFILE</Text>
        <View style={styles.inputRow}>
          <NumericInput label="Attacks" value={attacks} onChangeText={setAttacks} colors={colors} />
          <NumericInput label="BS/WS" value={skill} onChangeText={setSkill} placeholder="3" colors={colors} />
          <NumericInput label="Strength" value={strength} onChangeText={setStrength} colors={colors} />
        </View>

        {/* Defense Profile */}
        <Text style={[styles.sectionLabel, { color: colors.accentGold }]}>DEFENSE PROFILE</Text>
        <View style={styles.inputRow}>
          <NumericInput label="Toughness" value={toughness} onChangeText={setToughness} colors={colors} />
          <NumericInput label="Save" value={save} onChangeText={setSave} colors={colors} />
          <NumericInput label="Invuln" value={invuln} onChangeText={setInvuln} placeholder="-" colors={colors} />
        </View>
        <View style={styles.inputRow}>
          <NumericInput label="AP" value={ap} onChangeText={setAp} colors={colors} />
          <NumericInput label="Damage" value={damage} onChangeText={setDamage} colors={colors} />
          <NumericInput label="FNP" value={fnp} onChangeText={setFnp} placeholder="-" colors={colors} />
        </View>

        {/* Special Rules */}
        <Text style={[styles.sectionLabel, { color: colors.accentGold }]}>SPECIAL RULES</Text>
        <View style={[styles.rulesCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
          <RerollToggle label="Reroll Hits" value={rerollHits} onChange={setRerollHits} colors={colors} />
          <RerollToggle label="Reroll Wounds" value={rerollWounds} onChange={setRerollWounds} colors={colors} />
          <BoolToggle label="Lethal Hits" value={lethalHits} onChange={setLethalHits} colors={colors} />
          <BoolToggle label="Sustained Hits 1" value={sustainedHits} onChange={setSustainedHits} colors={colors} />
          <BoolToggle label="Devastating Wounds" value={devWounds} onChange={setDevWounds} colors={colors} />
        </View>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calcBtn, { backgroundColor: colors.accentGold }]}
          onPress={handleCalculate}
          activeOpacity={0.8}
        >
          <Text style={[styles.calcBtnText, { color: colors.bgPrimary }]}>Calculate</Text>
        </TouchableOpacity>

        {/* Results */}
        {result && (
          <View style={[styles.resultsCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
            <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>Expected Results</Text>

            <View style={styles.statsRow}>
              <ResultStat label="Hits" value={result.expectedHits} color="#60a5fa" />
              <ResultStat label="Wounds" value={result.expectedWounds} color="#f59e0b" />
              <ResultStat label="Unsaved" value={result.expectedUnsaved} color="#ef4444" />
            </View>
            <View style={[styles.statsRow, { marginTop: 12 }]}>
              <ResultStat label="Damage" value={result.expectedDamage} color="#c084fc" />
              <ResultStat label="Models Killed" value={result.expectedModelsKilled} color="#f43f5e" />
            </View>

            <View style={styles.probSection}>
              <Text style={[styles.probTitle, { color: colors.textSecondary }]}>PROBABILITIES</Text>
              <ProbBar label="Hit Rate" value={result.hitProb} color="#60a5fa" colors={colors} />
              <ProbBar label="Wound Rate" value={result.woundProb} color="#f59e0b" colors={colors} />
              <ProbBar label="Failed Save Rate" value={result.saveProb} color="#ef4444" colors={colors} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 12,
    },
    backArrow: { fontSize: 20, fontWeight: '600' },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      marginTop: 16,
      marginBottom: 10,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    rulesCard: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 14,
      marginBottom: 16,
    },
    calcBtn: {
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 20,
    },
    calcBtnText: {
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 1,
    },
    resultsCard: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 16,
      marginBottom: 24,
    },
    resultsTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
      textAlign: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    probSection: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderColor,
    },
    probTitle: {
      fontSize: 10,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
  });
}
