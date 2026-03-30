import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { useTheme } from '../contexts/ThemeContext';
import { useArmy } from '../contexts/ArmyContext';
import { useCollection } from '../contexts/CollectionContext';
import { getActiveEdition } from '../lib/editionManager';
import { getApiKey, setApiKey } from '../lib/apiServices';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { theme, colors, toggleTheme } = useTheme();
  const { savedArmies } = useArmy();
  const { items: collectionItems } = useCollection();
  const edition = getActiveEdition();

  const [confirmClearArmies, setConfirmClearArmies] = useState(false);
  const [confirmClearCollection, setConfirmClearCollection] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  // API key state
  const [gnewsKey, setGnewsKey] = useState('');
  const [wolframKey, setWolframKey] = useState('');
  const [pixelaUser, setPixelaUser] = useState('');
  const [pixelaToken, setPixelaToken] = useState('');
  const [cloudmersiveKey, setCloudmersiveKey] = useState('');

  useEffect(() => {
    (async () => {
      const [g, w, pu, pt, c] = await Promise.all([
        getApiKey('gnews'), getApiKey('wolfram'),
        getApiKey('pixelaUser'), getApiKey('pixelaToken'),
        getApiKey('cloudmersive'),
      ]);
      if (g) setGnewsKey(g);
      if (w) setWolframKey(w);
      if (pu) setPixelaUser(pu);
      if (pt) setPixelaToken(pt);
      if (c) setCloudmersiveKey(c);
    })();
  }, []);

  const clearArmiesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearCollectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetAllTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearArmiesTimer.current) clearTimeout(clearArmiesTimer.current);
      if (clearCollectionTimer.current) clearTimeout(clearCollectionTimer.current);
      if (resetAllTimer.current) clearTimeout(resetAllTimer.current);
    };
  }, []);

  const handleClearArmies = async () => {
    if (!confirmClearArmies) {
      setConfirmClearArmies(true);
      clearArmiesTimer.current = setTimeout(() => setConfirmClearArmies(false), 3000);
      return;
    }
    const armyKeys = [
      'army_saved_lists',
      'army_active_id',
      'army_mode',
      'army_faction',
      'army_detachment',
      'army_supply_limit',
      'army_units',
    ];
    try {
      for (const k of armyKeys) await AsyncStorage.removeItem(k);
    } catch {}
    setConfirmClearArmies(false);
    Alert.alert('Done', 'All army lists cleared. Restarting...', [
      {
        text: 'OK',
        onPress: async () => {
          try {
            await Updates.reloadAsync();
          } catch {
            // expo-updates may not be available in dev
          }
        },
      },
    ]);
  };

  const handleClearCollection = async () => {
    if (!confirmClearCollection) {
      setConfirmClearCollection(true);
      clearCollectionTimer.current = setTimeout(() => setConfirmClearCollection(false), 3000);
      return;
    }
    try {
      await AsyncStorage.removeItem('warcaster_collection');
    } catch {}
    setConfirmClearCollection(false);
    Alert.alert('Done', 'Collection cleared. Restarting...', [
      {
        text: 'OK',
        onPress: async () => {
          try {
            await Updates.reloadAsync();
          } catch {}
        },
      },
    ]);
  };

  const handleResetAll = async () => {
    if (!confirmResetAll) {
      setConfirmResetAll(true);
      resetAllTimer.current = setTimeout(() => setConfirmResetAll(false), 3000);
      return;
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        (k) =>
          (k.startsWith('warcaster_') || k.startsWith('army_') || k.startsWith('crusade_')) &&
          k !== 'warcaster_theme',
      );
      if (keysToRemove.length > 0) {
        for (const k of keysToRemove) await AsyncStorage.removeItem(k);
      }
    } catch {}
    setConfirmResetAll(false);
    Alert.alert('Done', 'All data reset. Restarting...', [
      {
        text: 'OK',
        onPress: async () => {
          try {
            await Updates.reloadAsync();
          } catch {}
        },
      },
    ]);
  };

  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={[styles.backText, { color: colors.textSecondary }]}>{'<'} Back</Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={[styles.iconText, { color: colors.accentGold }]}>
                  {theme === 'dark' ? '\u263D' : '\u2600'}
                </Text>
                <View>
                  <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
                    {theme === 'dark' ? 'Grimdark aesthetic' : 'Parchment & cream'}
                  </Text>
                </View>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.borderColor, true: colors.accentGold }}
                thumbColor="#ffffff"
              />
            </View>
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA MANAGEMENT</Text>
          <View style={styles.dataButtons}>
            {/* Clear Armies */}
            <TouchableOpacity
              style={[
                styles.dataButton,
                {
                  backgroundColor: confirmClearArmies ? 'rgba(239,68,68,0.1)' : colors.bgCard,
                  borderColor: confirmClearArmies ? 'rgba(239,68,68,0.5)' : colors.borderColor,
                },
              ]}
              onPress={handleClearArmies}
              activeOpacity={0.7}
            >
              <Text style={[styles.dataButtonIcon, { color: confirmClearArmies ? '#f87171' : colors.textPrimary }]}>
                {'\u2717'}
              </Text>
              <View style={styles.dataButtonText}>
                <Text
                  style={[
                    styles.dataButtonTitle,
                    { color: confirmClearArmies ? '#f87171' : colors.textPrimary },
                  ]}
                >
                  {confirmClearArmies ? 'Tap again to confirm' : 'Clear All Armies'}
                </Text>
                <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
                  {savedArmies.length} army list{savedArmies.length !== 1 ? 's' : ''} saved
                </Text>
              </View>
            </TouchableOpacity>

            {/* Clear Collection */}
            <TouchableOpacity
              style={[
                styles.dataButton,
                {
                  backgroundColor: confirmClearCollection ? 'rgba(239,68,68,0.1)' : colors.bgCard,
                  borderColor: confirmClearCollection ? 'rgba(239,68,68,0.5)' : colors.borderColor,
                },
              ]}
              onPress={handleClearCollection}
              activeOpacity={0.7}
            >
              <Text style={[styles.dataButtonIcon, { color: confirmClearCollection ? '#f87171' : colors.textPrimary }]}>
                {'\u2717'}
              </Text>
              <View style={styles.dataButtonText}>
                <Text
                  style={[
                    styles.dataButtonTitle,
                    { color: confirmClearCollection ? '#f87171' : colors.textPrimary },
                  ]}
                >
                  {confirmClearCollection ? 'Tap again to confirm' : 'Clear Collection'}
                </Text>
                <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
                  {collectionItems.length} model{collectionItems.length !== 1 ? 's' : ''} tracked
                </Text>
              </View>
            </TouchableOpacity>

            {/* Reset All */}
            <TouchableOpacity
              style={[
                styles.dataButton,
                {
                  backgroundColor: confirmResetAll ? 'rgba(239,68,68,0.1)' : colors.bgCard,
                  borderColor: confirmResetAll ? 'rgba(239,68,68,0.5)' : colors.borderColor,
                },
              ]}
              onPress={handleResetAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.dataButtonIcon, { color: confirmResetAll ? '#f87171' : colors.textPrimary }]}>
                {'\u26A0'}
              </Text>
              <View style={styles.dataButtonText}>
                <Text
                  style={[
                    styles.dataButtonTitle,
                    { color: confirmResetAll ? '#f87171' : colors.textPrimary },
                  ]}
                >
                  {confirmResetAll ? 'Tap again \u2014 this cannot be undone' : 'Reset All Data'}
                </Text>
                <Text style={[styles.dataButtonSubtitle, { color: colors.textSecondary }]}>
                  Clears everything except theme preference
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* API Integrations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>API INTEGRATIONS</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
            <View style={styles.apiField}>
              <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>GNews API Key</Text>
              <TextInput
                value={gnewsKey}
                onChangeText={setGnewsKey}
                onBlur={() => setApiKey('gnews', gnewsKey)}
                placeholder="Enter GNews API key"
                placeholderTextColor={colors.textSecondary + '66'}
                style={[styles.apiInput, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor, color: colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
            <View style={styles.apiField}>
              <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>WolframAlpha App ID</Text>
              <TextInput
                value={wolframKey}
                onChangeText={setWolframKey}
                onBlur={() => setApiKey('wolfram', wolframKey)}
                placeholder="Enter WolframAlpha App ID"
                placeholderTextColor={colors.textSecondary + '66'}
                style={[styles.apiInput, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor, color: colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
            <View style={styles.apiField}>
              <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>Pixela Username</Text>
              <TextInput
                value={pixelaUser}
                onChangeText={setPixelaUser}
                onBlur={() => setApiKey('pixelaUser', pixelaUser)}
                placeholder="Enter Pixela username"
                placeholderTextColor={colors.textSecondary + '66'}
                style={[styles.apiInput, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor, color: colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.apiField}>
              <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>Pixela Token</Text>
              <TextInput
                value={pixelaToken}
                onChangeText={setPixelaToken}
                onBlur={() => setApiKey('pixelaToken', pixelaToken)}
                placeholder="Enter Pixela token"
                placeholderTextColor={colors.textSecondary + '66'}
                style={[styles.apiInput, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor, color: colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
            <View style={[styles.apiField, { marginBottom: 0 }]}>
              <Text style={[styles.apiLabel, { color: colors.textSecondary }]}>Cloudmersive API Key</Text>
              <TextInput
                value={cloudmersiveKey}
                onChangeText={setCloudmersiveKey}
                onBlur={() => setApiKey('cloudmersive', cloudmersiveKey)}
                placeholder="Enter Cloudmersive API key"
                placeholderTextColor={colors.textSecondary + '66'}
                style={[styles.apiInput, { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor, color: colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}>
            <View style={styles.aboutHeader}>
              <Text style={[styles.iconText, { color: colors.accentGold }]}>{'\u2139'}</Text>
              <View>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Warcaster</Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>v1.0.0</Text>
              </View>
            </View>
            <View style={styles.aboutDetails}>
              <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
                Warhammer 40K Army Builder & Battle Aid
              </Text>
              <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
                {edition.name} {'\u00B7'} Data v{edition.dataVersion}
              </Text>
              <Text style={[styles.aboutBuiltBy, { color: colors.accentGold }]}>
                Built by Obelus Labs
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 100,
    },
    backButton: {
      marginBottom: 24,
    },
    backText: {
      fontSize: 14,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 32,
      letterSpacing: 1,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    card: {
      borderWidth: 1,
      borderRadius: 4,
      padding: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconText: {
      fontSize: 20,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    rowSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    dataButtons: {
      gap: 12,
    },
    dataButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 4,
      padding: 16,
      gap: 12,
    },
    dataButtonIcon: {
      fontSize: 18,
    },
    dataButtonText: {
      flex: 1,
    },
    dataButtonTitle: {
      fontSize: 14,
      fontWeight: '500',
    },
    dataButtonSubtitle: {
      fontSize: 12,
      marginTop: 2,
    },
    apiField: {
      marginBottom: 14,
    },
    apiLabel: {
      fontSize: 11,
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    apiInput: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
    },
    aboutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12,
    },
    aboutDetails: {
      gap: 4,
    },
    aboutText: {
      fontSize: 12,
    },
    aboutBuiltBy: {
      fontSize: 12,
      marginTop: 8,
    },
  });
}
