import { useState } from "react";
import { useNavigate } from "react-router";
import { Skull, Eye, EyeOff, AlertCircle, Mail, Lock } from "lucide-react";
import { useAuth } from "../../lib/AuthContext";

export default function SignIn() {
  const navigate = useNavigate();
  const auth = useAuth();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validation
  const isFormValid = email.trim() && password.trim();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage("Enter your email address first, then tap Forgot Password.");
      return;
    }
    setIsResetting(true);
    setErrorMessage("");
    try {
      const { supabase } = await import("../../lib/supabase");
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/sign-in`,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setErrorMessage("Failed to send reset email. Try again.");
    }
    setIsResetting(false);
  };

  const handleSignIn = async () => {
    setErrorMessage("");

    // Validate
    if (!email.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    const result = await auth.signIn(email, password);

    if (result.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    navigate("/home");
  };

  const handleGoogleSignIn = async () => {
    await auth.signInWithGoogle();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 relative overflow-hidden">
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col justify-center min-h-screen py-12">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Skull className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />
            <h1 className="text-4xl font-bold text-stone-100 tracking-wider drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              Crusade Command
            </h1>
          </div>
          <p className="text-stone-400 text-sm tracking-wide">
            Return to the battlefield
          </p>
        </div>

        {/* Error Message Area */}
        {errorMessage && (
          <div className="rounded-lg border border-red-500/30 bg-gradient-to-br from-red-950/40 to-stone-950 p-4 mb-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-semibold text-sm mb-1">Error</h3>
                <p className="text-red-300/80 text-sm">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="commander@imperium.com"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg pl-11 pr-4 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Enter your password"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg pl-11 pr-12 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-500 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="text-right -mt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isResetting}
              className="text-emerald-500/70 hover:text-emerald-400 text-xs font-medium transition-colors"
            >
              {isResetting ? "Sending..." : "Forgot Password?"}
            </button>
          </div>

          {/* Reset Email Sent */}
          {resetSent && (
            <div className="rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-stone-950 p-4">
              <p className="text-emerald-300 text-sm">
                Password reset link sent to <strong>{email}</strong>. Check your inbox.
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-4 rounded-lg font-bold transition-all mt-2 ${
              isFormValid && !isSubmitting
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 text-stone-600 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-stone-700" />
            <span className="text-stone-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-stone-700" />
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full py-4 rounded-lg font-semibold transition-all border border-stone-600 bg-stone-900 text-stone-300 hover:border-stone-500 hover:bg-stone-800 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Sign Up Link */}
          <div className="text-center pt-6">
            <p className="text-stone-400 text-sm">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/sign-up")}
                className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
