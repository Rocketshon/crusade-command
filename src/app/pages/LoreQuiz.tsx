import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Brain, RotateCcw, Loader2, Trophy, ChevronRight } from 'lucide-react';
import { fetchTriviaQuestions, CUSTOM_40K_QUESTIONS, type TriviaQuestion } from '../../lib/apiServices';

/** Decode HTML entities from Open Trivia DB */
function decodeHTML(str: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LoreQuiz() {
  const navigate = useNavigate();
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
    try {
      const apiQuestions = await fetchTriviaQuestions(10);
      const combined = shuffle([...CUSTOM_40K_QUESTIONS, ...apiQuestions]);
      setQuestions(combined);
    } catch {
      // Fall back to custom questions only
      setQuestions(shuffle([...CUSTOM_40K_QUESTIONS]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const currentQuestion = questions[currentIdx];

  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion) return [];
    return shuffle([
      currentQuestion.correct_answer,
      ...currentQuestion.incorrect_answers,
    ]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, questions]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer) return; // already answered
    setSelectedAnswer(answer);
    if (answer === currentQuestion.correct_answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
    }
  };

  const getScoreMessage = () => {
    const pct = questions.length > 0 ? (score / questions.length) * 100 : 0;
    if (pct >= 90) return 'The Emperor is pleased!';
    if (pct >= 70) return 'Battle-brother, you serve well.';
    if (pct >= 50) return 'You still have much to learn, Initiate.';
    return 'Consult the Codex immediately, heretic.';
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] transition-colors mb-6"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6 tracking-wider flex items-center gap-3">
          <Brain className="w-6 h-6 text-[var(--accent-gold)]" />
          Lore Quiz
        </h1>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Loading questions...</p>
          </div>
        )}

        {/* Finished screen */}
        {!loading && finished && (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-[var(--accent-gold)] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Quiz Complete!</h2>
            <div className="rounded-lg border border-[var(--accent-gold)]/30 bg-[var(--bg-card)] p-6 mb-6">
              <p className="text-4xl font-bold text-[var(--accent-gold)] mb-1">
                {score} / {questions.length}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {Math.round((score / questions.length) * 100)}% correct
              </p>
              <p className="text-sm text-[var(--accent-gold)] mt-3 font-medium italic">
                {getScoreMessage()}
              </p>
            </div>
            <button
              onClick={loadQuestions}
              className="px-6 py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        )}

        {/* Question screen */}
        {!loading && !finished && currentQuestion && (
          <div>
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Question {currentIdx + 1} of {questions.length}
              </p>
              <p className="text-xs font-bold text-[var(--accent-gold)]">
                Score: {score}
              </p>
            </div>
            <div className="h-1 bg-[var(--border-color)] rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-[var(--accent-gold)] rounded-full transition-all"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Category badge */}
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border border-[var(--border-color)] text-[var(--text-secondary)] mb-3">
              {decodeHTML(currentQuestion.category)} &middot; {currentQuestion.difficulty}
            </span>

            {/* Question */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-4 mb-4">
              <p className="text-base font-medium text-[var(--text-primary)] leading-relaxed">
                {decodeHTML(currentQuestion.question)}
              </p>
            </div>

            {/* Answers */}
            <div className="space-y-2 mb-6">
              {shuffledAnswers.map((answer, idx) => {
                const decoded = decodeHTML(answer);
                const isCorrect = answer === currentQuestion.correct_answer;
                const isSelected = selectedAnswer === answer;
                const revealed = selectedAnswer !== null;

                let borderColor = 'border-[var(--border-color)]';
                let bgColor = 'bg-[var(--bg-card)]';
                let textColor = 'text-[var(--text-primary)]';

                if (revealed) {
                  if (isCorrect) {
                    borderColor = 'border-green-500/60';
                    bgColor = 'bg-green-500/10';
                    textColor = 'text-green-400';
                  } else if (isSelected && !isCorrect) {
                    borderColor = 'border-red-500/60';
                    bgColor = 'bg-red-500/10';
                    textColor = 'text-red-400';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(answer)}
                    disabled={revealed}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${borderColor} ${bgColor} ${
                      !revealed ? 'hover:border-[var(--accent-gold)]/40' : ''
                    } disabled:cursor-default`}
                  >
                    <span className={`text-sm font-medium ${textColor}`}>
                      {String.fromCharCode(65 + idx)}. {decoded}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            {selectedAnswer && (
              <button
                onClick={handleNext}
                className="w-full py-3 rounded-lg bg-[var(--accent-gold)] text-[var(--bg-primary)] font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
