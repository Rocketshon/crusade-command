import { useState } from "react";
import { useNavigate } from "react-router";
import { Skull, Eye, EyeOff, AlertCircle, Mail, Lock } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { findCredential, hashPassword } from "../../lib/storage";

export default function SignIn() {
  const navigate = useNavigate();
  const { setUser } = useCrusade();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validation
  const isFormValid = email.trim() && password.trim();

  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const normalizedEmail = email.toLowerCase().trim();
    const credential = findCredential(normalizedEmail);

    if (!credential) {
      setErrorMessage("Account not found. Please check your email or sign up.");
      return;
    }

    setIsSubmitting(true);

    // Verify password
    const inputHash = await hashPassword(password);
    if (inputHash !== credential.passwordHash) {
      setIsSubmitting(false);
      setErrorMessage("Incorrect password. Please try again.");
      return;
    }

    // Sign in successful
    setUser({
      id: credential.userId,
      email: normalizedEmail,
      display_name: normalizedEmail.split("@")[0],
    });
    setIsSubmitting(false);
    navigate("/home");
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
