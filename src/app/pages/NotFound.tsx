import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      <div className="text-6xl font-bold text-[var(--text-tertiary)] mb-4">404</div>
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Page Not Found</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/army" className="px-6 py-2 rounded border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-semibold transition-all hover:bg-[var(--accent-gold)]/20">
        Return Home
      </Link>
    </div>
  );
}
