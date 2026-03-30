import React, { useState } from 'react';
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
import { useArmy, type CrusadeBattleRecord } from '../contexts/ArmyContext';

// ---------------------------------------------------------------------------
// Result badge
// ---------------------------------------------------------------------------

function ResultBadge({ result, colors }: { result: CrusadeBattleRecord['result']; colors: any }) {
  const config = {
    win: { label: 'Victory', emoji: '🏆', color: '#16a34a', border: '#16a34a66', bg: '#16a34a1A' },
    loss: { label: 'Defeat', emoji: '💀', color: '#ef4444', border: '#ef444466', bg: '#ef44441A' },
    draw: { label: 'Draw', emoji: '—', color: '#eab308', border: '#eab30866', bg: '#eab3081A' },
  }[result];

  return (
    <View style={[st.badge, { borderColor: config.border, backgroundColor: config.bg }]}>
      <Text style={{ fontSize: 10, marginRight: 4 }}>{config.emoji}</Text>
      <Text style={{ fontSize: 10, fontWeight: '600', color: config.color, textTransform: 'uppercase' }}>
        {config.label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Battle card
// ---------------------------------------------------------------------------

function BattleCard({
  battle, army, colors,
}: {
  battle: CrusadeBattleRecord;
  army: ReturnType<typeof useArmy>['army'];
  colors: any;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalXP = battle.unitResults.reduce((s, r) => s + r.xpGained + (r.markedForGreatness ? 3 : 0), 0);
  const date = new Date(battle.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={[st.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
      {/* Header row */}
      <TouchableOpacity
        onPress={() => setExpanded(v => !v)}
        style={st.cardHeader}
        activeOpacity={0.7}
      >
        <ResultBadge result={battle.result} colors={colors} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          {battle.opponent ? (
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>
              vs {battle.opponent}
            </Text>
          ) : null}
          {battle.missionName ? (
            <Text style={{ fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
              {battle.missionName}
            </Text>
          ) : null}
          {!battle.opponent && !battle.missionName && (
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>Battle</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>{date}</Text>
          {battle.rpGained > 0 && (
            <Text style={{ fontSize: 12, color: colors.accentGold, fontWeight: '600' }}>+{battle.rpGained} RP</Text>
          )}
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 8 }}>
          {expanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {/* Expanded unit breakdown */}
      {expanded && battle.unitResults.length > 0 && (
        <View style={[st.expandedSection, { borderColor: colors.borderColor }]}>
          <Text style={{ fontSize: 10, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Unit Results
          </Text>
          {battle.unitResults.map(r => {
            const unit = army.find(u => u.id === r.unitId);
            const name = unit ? (unit.custom_name || unit.datasheet_name) : 'Unknown Unit';
            const xpTotal = r.xpGained + (r.markedForGreatness ? 3 : 0);
            return (
              <View key={r.unitId} style={st.unitRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: r.survived ? '#16a34a' : '#ef4444',
                  }} />
                  <Text style={{ fontSize: 12, color: colors.textPrimary, flex: 1 }} numberOfLines={1}>
                    {name}
                  </Text>
                  {r.markedForGreatness && (
                    <Text style={{ fontSize: 10, color: colors.accentGold }}>{'★ MFG'}</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 }}>
                  {r.kills > 0 && (
                    <Text style={{ fontSize: 10, color: colors.textSecondary }}>{'💀'} {r.kills}</Text>
                  )}
                  {xpTotal > 0 && (
                    <Text style={{ fontSize: 10, color: colors.accentGold, fontWeight: '600' }}>{'⚡'} +{xpTotal}</Text>
                  )}
                </View>
              </View>
            );
          })}
          {totalXP > 0 && (
            <View style={[st.totalRow, { borderColor: colors.borderColor }]}>
              <Text style={{ fontSize: 12, color: colors.accentGold, fontWeight: '600' }}>
                {'⚡'} {totalXP} total XP awarded
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function BattleHistoryScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { crusade, army } = useArmy();

  if (!crusade) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>No active Crusade campaign.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.accentGold, fontSize: 14 }}>{'<'} Back to Army</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const battles = crusade.battles ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      {/* Header */}
      <View style={[st.headerBar, { borderColor: colors.borderColor }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.textSecondary, fontSize: 18 }}>{'<'}</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Battle History</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {crusade.wins}W / {crusade.losses}L / {crusade.draws}D · {battles.length} battles
            </Text>
          </View>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {battles.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <Text style={{ fontSize: 32, color: colors.textSecondary, marginBottom: 12 }}>{'🏆'}</Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.textSecondary }}>No battles recorded yet</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              Use "Record Battle" after each game
            </Text>
          </View>
        ) : (
          battles.map(battle => (
            <BattleCard key={battle.id} battle={battle} army={army} colors={colors} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  expandedSection: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
});
