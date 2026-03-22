import { useState } from "react";
import { useNavigate } from "react-router";
import { Skull, Eye, EyeOff, AlertCircle, Mail, Lock } from "lucide-react";
import { useCrusade } from "../../lib/CrusadeContext";
import { generateId, hashPassword, saveCredential, findCredential } from "../../lib/storage";

export default function SignUp() {
  const navigate = useNavigate();
  const { setUser } = useCrusade();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Validation
  const isEmailValid = email.includes("@") && email.includes(".");
  const isPasswordValid = password.length >= 8;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isFormValid = isEmailValid && isPasswordValid && doPasswordsMatch;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    setErrorMessage("");

    // Validate
    if (!isEmailValid) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (!doPasswordsMatch) {
      setErrorMessage("Passwords don't match. Please try again.");
      return;
    }

    // Check if email already in use
    const normalizedEmail = email.toLowerCase().trim();
    const existing = findCredential(normalizedEmail);
    if (existing) {
      setErrorMessage("Email already in use. Please sign in or use a different email.");
      return;
    }

    setIsSubmitting(true);

    // Hash password and store credentials
    const passwordHash = await hashPassword(password);
    const displayName = email.split("@")[0];
    const newUser = {
      id: generateId(),
      email: normalizedEmail,
      display_name: displayName,
    };

    saveCredential({ email: normalizedEmail, passwordHash, userId: newUser.id });
    setUser(newUser);
    setIsSubmitting(false);

    // Navigate to home after successful signup
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
            Begin your Crusade
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

        {/* Sign Up Form */}
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
                placeholder="Minimum 8 characters"
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

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="Re-enter password"
                className="w-full bg-stone-900 border border-stone-600 rounded-lg pl-11 pr-12 py-3 text-stone-100 placeholder:text-stone-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-emerald-500 transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Create Account Button */}
          <button
            onClick={handleCreateAccount}
            disabled={!isFormValid || isSubmitting}
            className={`w-full py-4 rounded-lg font-bold transition-all mt-2 ${
              isFormValid && !isSubmitting
                ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-black hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "bg-stone-800 text-stone-600 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Creating..." : "Create Account"}
          </button>

          {/* Sign In Link */}
          <div className="text-center pt-6">
            <p className="text-stone-400 text-sm">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/sign-in")}
                className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
