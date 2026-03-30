import React from 'react';
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
import { useArmy } from '../contexts/ArmyContext';

export default function ModeSelectScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { createArmy, savedArmies, switchArmy } = useArmy();

  const handlePick = (mode: 'standard' | 'crusade') => {
    // If there's already a saved army of this mode, switch to it
    const existing = savedArmies.find(a => a.mode === mode);
    if (existing) {
      switchArmy(existing.id);
      navigation.navigate('ArmyBuilder');
      return;
    }
    // Otherwise create a new one
    createArmy(mode === 'standard' ? 'My Army' : 'My Crusade', mode);
    if (mode === 'crusade') {
      navigation.navigate('ArmyCrusadeSetup');
    } else {
      navigation.navigate('ArmyBuilder');
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Warcaster</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Choose how you want to play
            </Text>
          </View>

          {/* Normal Mode */}
          <TouchableOpacity
            style={[styles.modeCard, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}
            onPress={() => handlePick('standard')}
            activeOpacity={0.7}
          >
            <View style={styles.modeCardContent}>
              <View style={[styles.iconCircle, { borderColor: colors.borderColor, backgroundColor: colors.bgPrimary }]}>
                <Text style={[styles.iconText, { color: colors.textSecondary }]}>{'⚔'}</Text>
              </View>
              <View style={styles.modeTextContainer}>
                <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Normal Mode</Text>
                <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
                  Build an army list from your collection. Track points, wargear, and loadouts for a standard game.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Crusade Mode */}
          <TouchableOpacity
            style={[
              styles.modeCard,
              {
                borderColor: colors.accentGold + '4D',
                backgroundColor: colors.accentGold + '0D',
                marginTop: 12,
              },
            ]}
            onPress={() => handlePick('crusade')}
            activeOpacity={0.7}
          >
            <View style={styles.modeCardContent}>
              <View
                style={[
                  styles.iconCircle,
                  { borderColor: colors.accentGold + '66', backgroundColor: colors.accentGold + '1A' },
                ]}
              >
                <Text style={[styles.iconText, { color: colors.accentGold }]}>{'🛡'}</Text>
              </View>
              <View style={styles.modeTextContainer}>
                <View style={styles.modeTitleRow}>
                  <Text style={[styles.modeTitle, { color: colors.textPrimary }]}>Crusade Mode</Text>
                  <View style={[styles.campaignBadge, { borderColor: colors.accentGold + '66' }]}>
                    <Text style={[styles.campaignBadgeText, { color: colors.accentGold }]}>Campaign</Text>
                  </View>
                </View>
                <Text style={[styles.modeDescription, { color: colors.textSecondary }]}>
                  Track XP, battle honours, scars, and faction mechanics across a full Crusade campaign. Units grow with every battle.
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Existing armies */}
          {savedArmies.length > 0 && (
            <View style={styles.existingSection}>
              <Text style={[styles.existingLabel, { color: colors.textSecondary }]}>YOUR ARMIES</Text>
              {savedArmies.map(a => {
                const totalPts = a.units.reduce((s, u) => s + u.points_cost, 0);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.armyRow, { borderColor: colors.borderColor, backgroundColor: colors.bgCard }]}
                    onPress={() => {
                      switchArmy(a.id);
                      navigation.navigate('ArmyBuilder');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.armyRowLeft}>
                      <Text style={[styles.armyName, { color: colors.textPrimary }]}>{a.name}</Text>
                      <Text style={[styles.armyMeta, { color: colors.textSecondary }]}>
                        {a.mode === 'crusade' ? 'Crusade' : 'Normal'} · {a.units.length} units · {totalPts} pts
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{'⚔'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    content: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 2,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
    },
    modeCard: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 20,
    },
    modeCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: {
      fontSize: 22,
    },
    modeTextContainer: {
      flex: 1,
    },
    modeTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    modeTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    modeDescription: {
      fontSize: 13,
      lineHeight: 20,
    },
    campaignBadge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    campaignBadgeText: {
      fontSize: 10,
    },
    existingSection: {
      marginTop: 32,
    },
    existingLabel: {
      fontSize: 10,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 12,
    },
    armyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
    },
    armyRowLeft: {
      flex: 1,
    },
    armyName: {
      fontSize: 14,
      fontWeight: '500',
    },
    armyMeta: {
      fontSize: 12,
      marginTop: 2,
    },
  });
}
