import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

export default function ResetData() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Clear all localStorage
    localStorage.clear();
    // Clear sessionStorage too
    sessionStorage.clear();
    setDone(true);
    // Redirect to sign-in after a brief moment
    setTimeout(() => navigate('/sign-in', { replace: true }), 1500);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="text-4xl mb-4">🗑️</div>
      <h1 className="text-xl font-bold text-stone-300 mb-2">
        {done ? 'Data Cleared' : 'Clearing...'}
      </h1>
      <p className="text-stone-500 text-sm">
        {done ? 'Redirecting to sign in...' : 'Resetting all local data...'}
      </p>
    </div>
  );
}
