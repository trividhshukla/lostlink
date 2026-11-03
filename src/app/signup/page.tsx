'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Compass, AlertCircle, CheckCircle2, Loader2, Mail, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (displayName.trim().length < 2 || displayName.trim().length > 40) {
      setError('Display name must be between 2 and 40 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Check if session was immediately established or email confirmation is required
      if (data?.user && !data.session) {
        setIsSubmitted(true);
      } else {
        // If Supabase project has email confirmations disabled in dev
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An unexpected error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-[#0C1512] flex items-center justify-center text-emerald-400 font-bold shadow-md">
              <Compass className="w-5 h-5" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-stone-900">
              Lost<span className="text-emerald-700">Link</span>
            </span>
          </Link>
          <h1 className="text-xl font-semibold text-stone-900">Create your campus member account</h1>
          <p className="text-xs text-stone-500 mt-1">
            Join the verified campus community to report and claim lost items.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
          {isSubmitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-stone-900 mb-2">Check your email</h2>
              <p className="text-xs text-stone-600 leading-relaxed mb-6">
                We sent a confirmation link to <strong className="text-stone-900">{email}</strong>.
                Please click the link in your inbox to verify your account and activate your sign-in.
              </p>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 mb-6 text-left">
                <span className="font-semibold text-stone-700 block mb-1">Campus Verification Notice</span>
                LostLink requires email confirmation to protect private ownership details and prevent impersonation.
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0C1512] text-stone-100 text-xs font-semibold hover:bg-[#182420] transition shadow"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    maxLength={40}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Your public name shown on listings and during verified claims.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    Campus Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@campus.edu"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Never shown publicly on listings. Kept private for verification.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                  <div className="flex items-center gap-2 font-medium text-stone-700 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Email confirmation required</span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    You will receive an activation email to verify your campus identity before browsing Explore.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-stone-100 bg-[#0C1512] hover:bg-[#182420] transition shadow flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <>
                      <span>Register Account</span>
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-stone-100 text-center">
                <p className="text-xs text-stone-500">
                  Already registered?{' '}
                  <Link href="/login" className="text-emerald-800 font-semibold hover:underline">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
