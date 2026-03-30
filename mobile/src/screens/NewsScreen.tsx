import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { fetchNews, getApiKey, type NewsArticle } from '../lib/apiServices';

export default function NewsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  const loadNews = useCallback(async () => {
    const key = await getApiKey('gnews');
    setHasKey(!!key);
    if (!key) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await fetchNews();
      setArticles(data);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNews();
  }, [loadNews]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>40K News</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accentGold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading news...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasKey === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>40K News</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83D\uDCF0'}</Text>
          <Text style={[styles.noKeyTitle, { color: colors.textPrimary }]}>No API Key Configured</Text>
          <Text style={[styles.noKeySubtitle, { color: colors.textSecondary }]}>
            Add your GNews API key in Settings to enable the news feed.
          </Text>
          <TouchableOpacity
            style={[styles.goSettingsBtn, { backgroundColor: colors.accentGold }]}
            onPress={() => navigation.navigate('SettingsTab')}
            activeOpacity={0.8}
          >
            <Text style={[styles.goSettingsBtnText, { color: colors.bgPrimary }]}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderArticle = ({ item }: { item: NewsArticle }) => (
    <TouchableOpacity
      style={[styles.articleCard, { backgroundColor: colors.bgCard, borderColor: colors.borderColor }]}
      onPress={() => Linking.openURL(item.url)}
      activeOpacity={0.7}
    >
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.articleImage} resizeMode="cover" />
      )}
      <View style={styles.articleBody}>
        <Text style={[styles.articleTitle, { color: colors.textPrimary }]} numberOfLines={2}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.articleDesc, { color: colors.textSecondary }]} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.articleMeta}>
          <Text style={[styles.articleSource, { color: colors.accentGold }]}>{item.source.name}</Text>
          <Text style={[styles.articleDate, { color: colors.textSecondary }]}>
            {formatDate(item.publishedAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>40K News</Text>
        <Text style={[styles.articleCount, { color: colors.textSecondary }]}>
          {articles.length} article{articles.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item, idx) => `${item.url}-${idx}`}
        renderItem={renderArticle}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accentGold} />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{'\uD83D\uDCF0'}</Text>
            <Text style={[styles.noKeyTitle, { color: colors.textSecondary }]}>No articles found</Text>
            <Text style={[styles.noKeySubtitle, { color: colors.textSecondary }]}>
              Pull down to refresh
            </Text>
          </View>
        }
      />
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
    headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
    articleCount: { fontSize: 12 },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: { fontSize: 14, marginTop: 12 },
    noKeyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
    noKeySubtitle: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    goSettingsBtn: {
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    goSettingsBtnText: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 16, gap: 12, paddingBottom: 100 },
    articleCard: {
      borderWidth: 1,
      borderRadius: 10,
      overflow: 'hidden',
    },
    articleImage: {
      width: '100%',
      height: 160,
    },
    articleBody: {
      padding: 12,
    },
    articleTitle: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 22,
      marginBottom: 6,
    },
    articleDesc: {
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 8,
    },
    articleMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    articleSource: { fontSize: 11, fontWeight: '600' },
    articleDate: { fontSize: 11 },
  });
}
