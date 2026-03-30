// ---------------------------------------------------------------------------
// Warcaster — Public API Service Layer (Web)
// Keys loaded from import.meta.env (VITE_*) with localStorage override
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'warcaster_api_cache_';
const KEY_PREFIX = 'warcaster_api_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Key management
// ---------------------------------------------------------------------------

function getApiKey(name: string): string | undefined {
  // 1. Check localStorage (user-entered in Settings)
  try {
    const stored = localStorage.getItem(`${KEY_PREFIX}${name}`);
    if (stored) return stored;
  } catch {}
  // 2. Check env vars
  const envMap: Record<string, string | undefined> = {
    gnews: import.meta.env.VITE_GNEWS_KEY,
    wolfram: import.meta.env.VITE_WOLFRAM_KEY,
    pixelaUser: import.meta.env.VITE_PIXELA_USER,
    pixelaToken: import.meta.env.VITE_PIXELA_TOKEN,
    cloudmersive: import.meta.env.VITE_CLOUDMERSIVE_KEY,
  };
  return envMap[name] || undefined;
}

export function setApiKey(name: string, value: string): void {
  localStorage.setItem(`${KEY_PREFIX}${name}`, value);
}

export function getConfiguredApis(): Record<string, boolean> {
  return {
    gnews: !!getApiKey('gnews'),
    wolfram: !!getApiKey('wolfram'),
    pixela: !!getApiKey('pixelaUser') && !!getApiKey('pixelaToken'),
    cloudmersive: !!getApiKey('cloudmersive'),
    bgg: true,            // no key needed
    trivia: true,         // no key needed
    translate: true,      // no key needed
  };
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

interface CacheEntry<T> { data: T; ts: number }

function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
}

function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

// ---------------------------------------------------------------------------
// 1. GNews — 40K News Feed
// ---------------------------------------------------------------------------

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  image: string | null;
  source: { name: string; url: string };
  publishedAt: string;
}

export async function fetchNews(query = 'warhammer 40k'): Promise<NewsArticle[]> {
  const cached = getCached<NewsArticle[]>('news');
  if (cached) return cached;

  const key = getApiKey('gnews');
  if (!key) return [];

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=20&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const articles: NewsArticle[] = data.articles ?? [];
  setCache('news', articles);
  return articles;
}

// ---------------------------------------------------------------------------
// 2. WolframAlpha — Complex dice queries
// ---------------------------------------------------------------------------

export async function queryWolfram(query: string): Promise<string | null> {
  const key = getApiKey('wolfram');
  if (!key) return null;

  const url = `https://api.wolframalpha.com/v2/query?input=${encodeURIComponent(query)}&appid=${key}&output=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const pods = data.queryresult?.pods ?? [];
  const resultPod = pods.find((p: { id: string }) => p.id === 'Result') ?? pods[1];
  return resultPod?.subpods?.[0]?.plaintext ?? null;
}

// ---------------------------------------------------------------------------
// 3. Pixela — Painting streak tracker
// ---------------------------------------------------------------------------

export async function pixelaRecordPainting(quantity = 1): Promise<boolean> {
  const user = getApiKey('pixelaUser');
  const token = getApiKey('pixelaToken');
  if (!user || !token) return false;

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const url = `https://pixe.la/v1/users/${user}/graphs/painting/pixel/${today}`;

  // Try PUT (update/create), fall back to increment
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'X-USER-TOKEN': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity: String(quantity) }),
  });
  return res.ok;
}

export async function pixelaGetGraph(): Promise<string | null> {
  const user = getApiKey('pixelaUser');
  if (!user) return null;
  return `https://pixe.la/v1/users/${user}/graphs/painting?mode=short`;
}

export async function pixelaSetupGraph(): Promise<boolean> {
  const user = getApiKey('pixelaUser');
  const token = getApiKey('pixelaToken');
  if (!user || !token) return false;

  const res = await fetch(`https://pixe.la/v1/users/${user}/graphs`, {
    method: 'POST',
    headers: { 'X-USER-TOKEN': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'painting',
      name: 'Painting Progress',
      unit: 'models',
      type: 'int',
      color: 'ajisai',
    }),
  });
  return res.ok || res.status === 409; // 409 = already exists
}

// ---------------------------------------------------------------------------
// 4. Board Game Geek — Session logging
// ---------------------------------------------------------------------------

export async function bggSearchGame(query = 'warhammer 40000'): Promise<{ id: string; name: string } | null> {
  const cached = getCached<{ id: string; name: string }>('bgg_game');
  if (cached) return cached;

  const url = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const text = await res.text();
  // Parse XML — find first item
  const idMatch = text.match(/id="(\d+)"/);
  const nameMatch = text.match(/<name[^>]*value="([^"]+)"/);
  if (!idMatch || !nameMatch) return null;
  const result = { id: idMatch[1], name: nameMatch[1] };
  setCache('bgg_game', result);
  return result;
}

export function bggGameUrl(gameId: string): string {
  return `https://boardgamegeek.com/boardgame/${gameId}`;
}

// ---------------------------------------------------------------------------
// 5. Open Trivia — Lore Quiz
// ---------------------------------------------------------------------------

export interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: string;
}

export async function fetchTriviaQuestions(amount = 10): Promise<TriviaQuestion[]> {
  // Category 15 = Entertainment: Video Games (closest to tabletop gaming)
  const url = `https://opentdb.com/api.php?amount=${amount}&category=15&type=multiple`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

// Custom 40K lore questions (no API needed)
export const CUSTOM_40K_QUESTIONS: TriviaQuestion[] = [
  {
    question: 'Who is the Primarch of the Ultramarines?',
    correct_answer: 'Roboute Guilliman',
    incorrect_answers: ['Leman Russ', 'Rogal Dorn', 'Sanguinius'],
    category: 'Warhammer 40K', difficulty: 'easy',
  },
  {
    question: 'What is the standard points limit for a Strike Force game?',
    correct_answer: '2000',
    incorrect_answers: ['1000', '1500', '3000'],
    category: 'Warhammer 40K', difficulty: 'easy',
  },
  {
    question: 'Which Chaos God is associated with disease and decay?',
    correct_answer: 'Nurgle',
    incorrect_answers: ['Khorne', 'Tzeentch', 'Slaanesh'],
    category: 'Warhammer 40K', difficulty: 'easy',
  },
  {
    question: 'What does the Space Marine ability "Oath of Moment" allow you to reroll?',
    correct_answer: 'Hit rolls against a selected target',
    incorrect_answers: ['All wound rolls', 'Saving throws', 'Charge rolls'],
    category: 'Warhammer 40K', difficulty: 'medium',
  },
  {
    question: 'What is the maximum number of Requisition Points (RP) a Crusade force can hold?',
    correct_answer: '10',
    incorrect_answers: ['5', '15', '20'],
    category: 'Warhammer 40K', difficulty: 'medium',
  },
  {
    question: 'Which faction has the army rule "Power of the C\'tan"?',
    correct_answer: 'Necrons',
    incorrect_answers: ['Aeldari', 'Tau Empire', 'Tyranids'],
    category: 'Warhammer 40K', difficulty: 'hard',
  },
  {
    question: 'How many XP does a unit need to reach "Blooded" rank in Crusade?',
    correct_answer: '6',
    incorrect_answers: ['3', '10', '16'],
    category: 'Warhammer 40K', difficulty: 'medium',
  },
  {
    question: 'What is the Toughness characteristic of a standard Space Marine Intercessor?',
    correct_answer: '4',
    incorrect_answers: ['3', '5', '6'],
    category: 'Warhammer 40K', difficulty: 'easy',
  },
];

// ---------------------------------------------------------------------------
// 6. LibreTranslate — Rules translation
// ---------------------------------------------------------------------------

export async function translateText(text: string, targetLang: string): Promise<string | null> {
  try {
    const res = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'en', target: targetLang }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.translatedText ?? null;
  } catch {
    return null;
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
];

// ---------------------------------------------------------------------------
// 7. Cloudmersive — Image recognition (mobile-primary)
// ---------------------------------------------------------------------------

export async function recognizeImage(imageBase64: string): Promise<string | null> {
  const key = getApiKey('cloudmersive');
  if (!key) return null;

  try {
    const res = await fetch('https://api.cloudmersive.com/image/recognize/describe', {
      method: 'POST',
      headers: {
        'Apikey': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageData: imageBase64 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.BestOutcome?.Description ?? data.Description ?? null;
  } catch {
    return null;
  }
}
