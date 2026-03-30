import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import {
  CUSTOM_40K_QUESTIONS,
  fetchTriviaQuestions,
  type TriviaQuestion,
} from '../lib/apiServices';

// ---------------------------------------------------------------------------
// HTML entity decoder for Open Trivia DB
// ---------------------------------------------------------------------------

function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&eacute;/g, '\u00E9')
    .replace(/&hellip;/g, '\u2026');
}

// ---------------------------------------------------------------------------
// Shuffle helper
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function LoreQuizScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);

    let allQuestions = [...CUSTOM_40K_QUESTIONS];
    try {
      const trivia = await fetchTriviaQuestions(10);
      allQuestions = allQuestions.concat(trivia);
    } catch {}
    setQuestions(shuffle(allQuestions));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const currentQ = questions[currentIdx] ?? null;

  const shuffledAnswers = useMemo(() => {
    if (!currentQ) return [];
    return shuffle([currentQ.correct_answer, ...currentQ.incorrect_answers]);
  }, [currentQ]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(answer);
    if (answer === currentQ?.correct_answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelectedAnswer(null);
    }
  };

  const styles = makeStyles(colors);

  // Loading
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Lore Quiz</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accentGold} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Final score
  if (finished) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const emoji = pct >= 80 ? '\uD83C\uDFC6' : pct >= 50 ? '\uD83D\uDCAA' : '\uD83D\uDC80';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Quiz Complete</Text>
        </View>
        <View style={styles.centered}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>{emoji}</Text>
          <Text style={[styles.finalScoreText, { color: colors.textPrimary }]}>
            {score} / {questions.length}
          </Text>
          <Text style={[styles.finalPctText, { color: colors.accentGold }]}>
            {pct}% correct
          </Text>
          <Text style={[styles.finalMessage, { color: colors.textSecondary }]}>
            {pct >= 80 ? 'The Emperor is pleased!' : pct >= 50 ? 'Acceptable, soldier.' : 'More study required, recruit.'}
          </Text>
          <TouchableOpacity
            style={[styles.playAgainBtn, { backgroundColor: colors.accentGold }]}
            onPress={loadQuestions}
            activeOpacity={0.8}
          >
            <Text style={[styles.playAgainText, { color: colors.bgPrimary }]}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={[{ color: colors.textSecondary, fontSize: 14 }]}>Back to Battle Aid</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Question view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={[styles.backArrow, { color: colors.textSecondary }]}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Lore Quiz</Text>
        <Text style={[styles.scoreText, { color: colors.accentGold }]}>
          {score}/{currentIdx + (selectedAnswer ? 1 : 0)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Question {currentIdx + 1} of {questions.length}
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderColor }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((currentIdx + 1) / questions.length) * 100}%` as any,
                  backgroundColor: colors.accentGold,
                },
              ]}
            />
          </View>
        </View>

        {/* Category badge */}
        {currentQ && (
          <View style={[styles.categoryBadge, { backgroundColor: colors.accentGold + '15', borderColor: colors.accentGold + '40' }]}>
            <Text style={[styles.categoryText, { color: colors.accentGold }]}>{decodeHTML(currentQ.category)}</Text>
            <Text style={[styles.difficultyText, { color: colors.textSecondary }]}>
              {currentQ.difficulty.charAt(0).toUpperCase() + currentQ.difficulty.slice(1)}
            </Text>
          </View>
        )}

        {/* Question */}
        {currentQ && (
          <Text style={[styles.questionText, { color: colors.textPrimary }]}>
            {decodeHTML(currentQ.question)}
          </Text>
        )}

        {/* Answers */}
        <View style={styles.answersContainer}>
          {shuffledAnswers.map((answer, idx) => {
            const decoded = decodeHTML(answer);
            const isSelected = selectedAnswer === answer;
            const isCorrect = answer === currentQ?.correct_answer;
            const answered = selectedAnswer !== null;

            let bgColor = colors.bgCard;
            let borderColor = colors.borderColor;
            let textColor = colors.textPrimary;

            if (answered) {
              if (isCorrect) {
                bgColor = '#16a34a1A';
                borderColor = '#16a34a80';
                textColor = '#16a34a';
              } else if (isSelected && !isCorrect) {
                bgColor = '#ef44441A';
                borderColor = '#ef444480';
                textColor = '#ef4444';
              }
            }

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleAnswer(answer)}
                disabled={answered}
                style={[
                  styles.answerBtn,
                  { backgroundColor: bgColor, borderColor },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[styles.answerLetter, { color: answered && isCorrect ? '#16a34a' : colors.textSecondary }]}>
                  {String.fromCharCode(65 + idx)}
                </Text>
                <Text style={[styles.answerText, { color: textColor }]}>{decoded}</Text>
                {answered && isCorrect && (
                  <Text style={{ color: '#16a34a', fontSize: 16, marginLeft: 'auto' }}>{'\u2713'}</Text>
                )}
                {answered && isSelected && !isCorrect && (
                  <Text style={{ color: '#ef4444', fontSize: 16, marginLeft: 'auto' }}>{'\u2717'}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next button */}
        {selectedAnswer !== null && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.accentGold }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextBtnText, { color: colors.bgPrimary }]}>
              {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
            </Text>
          </TouchableOpacity>
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
    headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
    scoreText: { fontSize: 16, fontWeight: '700' },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingText: { fontSize: 14, marginTop: 12 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 100,
    },
    progressRow: { marginBottom: 16 },
    progressText: { fontSize: 12, marginBottom: 6 },
    progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    categoryBadge: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginBottom: 16,
    },
    categoryText: { fontSize: 12, fontWeight: '600' },
    difficultyText: { fontSize: 11 },
    questionText: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 26,
      marginBottom: 24,
    },
    answersContainer: { gap: 10 },
    answerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 10,
      padding: 14,
      gap: 12,
    },
    answerLetter: {
      fontSize: 14,
      fontWeight: '700',
      width: 24,
      height: 24,
      textAlign: 'center',
      lineHeight: 24,
    },
    answerText: { fontSize: 14, flex: 1 },
    nextBtn: {
      marginTop: 20,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    nextBtnText: { fontSize: 15, fontWeight: '700' },
    finalScoreText: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
    finalPctText: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    finalMessage: { fontSize: 14, marginBottom: 24, textAlign: 'center' },
    playAgainBtn: {
      paddingHorizontal: 32,
      paddingVertical: 12,
      borderRadius: 8,
    },
    playAgainText: { fontSize: 15, fontWeight: '700' },
  });
}
