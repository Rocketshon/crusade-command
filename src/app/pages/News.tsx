import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Newspaper, ExternalLink, Loader2, KeyRound } from 'lucide-react';
import { fetchNews, getConfiguredApis, type NewsArticle } from '../../lib/apiServices';

export default function News() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasKey = getConfiguredApis().gnews;

  useEffect(() => {
    if (!hasKey) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchNews()
      .then(data => {
        if (!cancelled) {
          setArticles(data);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load news.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasKey]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 pt-6 pb-24">
      <div className="max-w-2xl mx-auto">
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
          <Newspaper className="w-6 h-6 text-[var(--accent-gold)]" />
          40K News
        </h1>

        {/* No API key configured */}
        {!hasKey && (
          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-center">
            <KeyRound className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-2">No API key configured</p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">
              Add a GNews API key in Settings to see Warhammer 40K news.
            </p>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 text-sm border border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] rounded-lg hover:bg-[var(--accent-gold)]/20 transition-colors"
            >
              Go to Settings
            </button>
          </div>
        )}

        {/* Loading */}
        {hasKey && loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[var(--accent-gold)] animate-spin mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">Loading news...</p>
          </div>
        )}

        {/* Error */}
        {hasKey && !loading && error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {hasKey && !loading && !error && articles.length === 0 && (
          <div className="text-center py-16">
            <Newspaper className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No news articles found.</p>
          </div>
        )}

        {/* Article cards */}
        {articles.length > 0 && (
          <div className="space-y-3">
            {articles.map((article, idx) => (
              <button
                key={idx}
                onClick={() => window.open(article.url, '_blank')}
                className="w-full text-left bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg overflow-hidden hover:border-[var(--accent-gold)]/40 transition-all"
              >
                <div className="flex gap-3 p-3">
                  {/* Thumbnail */}
                  {article.image && (
                    <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-[var(--border-color)]">
                      <img
                        src={article.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    {article.description && (
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-2">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                      <span className="text-[var(--accent-gold)] font-semibold">{article.source.name}</span>
                      <span>&middot;</span>
                      <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                      <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
