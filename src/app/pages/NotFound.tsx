import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-6xl font-bold text-stone-700 mb-4">404</div>
      <h1 className="text-xl font-bold text-stone-300 mb-2">Page Not Found</h1>
      <p className="text-stone-500 text-sm mb-6">The page you're looking for doesn't exist.</p>
      <Link to="/home" className="px-6 py-2 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-black font-semibold transition-all">
        Return Home
      </Link>
    </div>
  );
}
