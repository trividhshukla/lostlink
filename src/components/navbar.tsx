'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, LogOut, LayoutDashboard, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // In case environment variables are not configured in local environment
    }
  }, []);

  useEffect(() => {
    if (user) {
      try {
        const supabase = createClient();
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .is('read_at', null)
          .then(({ count }) => {
            setUnreadCount(count || 0);
          });
      } catch {
        // Safe fallback
      }
    } else {
      setUnreadCount(0);
    }
  }, [user, pathname]);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-800/80 bg-[#0C1512] text-stone-200 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-white font-bold tracking-tight shadow-sm group-hover:border-emerald-400/60 transition-colors">
              <span className="text-lg text-stone-100">L</span>
              <span className="text-emerald-400 text-sm -ml-0.5 font-black">L</span>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white leading-tight">
                LostLink
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90">
                Campus Recovery
              </span>
            </div>
          </Link>

          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-800/80 text-stone-300 border border-stone-700/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Central Campus Network
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1.5">
          <Link
            href="/explore"
            className={cn(
              'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname === '/explore'
                ? 'bg-stone-800/90 text-white font-semibold'
                : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
            )}
          >
            Explore Listings
          </Link>
          <Link
            href="/#how-it-works"
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-stone-300 hover:text-white hover:bg-stone-800/50 transition-colors"
          >
            How It Works
          </Link>
          {user && (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                  pathname === '/dashboard'
                    ? 'bg-stone-800/90 text-white font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
                )}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>My Reports</span>
              </Link>
              <Link
                href="/claims"
                className={cn(
                  'px-3.5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                  pathname.startsWith('/claims')
                    ? 'bg-stone-800/90 text-white font-semibold'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800/50'
                )}
              >
                <span>Claims</span>
              </Link>
            </>
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/report/new?type=lost"
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg text-sm font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-xs"
          >
            I Lost Something
          </Link>
          <Link
            href="/report/new?type=found"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm"
          >
            I Found Something
          </Link>

          {/* Notifications Indicator */}
          {user && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800/60 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Auth State Button */}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 pl-1">
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle button */}
        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <Link
            href="/report/new"
            className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shrink-0"
          >
            + Report
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-stone-300 hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-800 bg-[#0C1512] px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-1">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-medium text-white hover:bg-stone-800"
            >
              Home
            </Link>
            <Link
              href="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-medium text-white hover:bg-stone-800"
            >
              Explore Items
            </Link>
            {user && (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-base font-medium text-white hover:bg-stone-800"
                >
                  My Reports Dashboard
                </Link>
                <Link
                  href="/claims"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-base font-medium text-white hover:bg-stone-800"
                >
                  Claims & Handovers
                </Link>
              </>
            )}
            {user && (
              <Link
                href="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-md text-base font-medium text-white hover:bg-stone-800 flex items-center justify-between"
              >
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md text-base font-medium text-stone-300 hover:bg-stone-800"
            >
              How It Works
            </Link>
          </div>

          <div className="pt-2 border-t border-stone-800 flex flex-col gap-2">
            <Link
              href="/report/new?type=lost"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30"
            >
              I Lost Something
            </Link>
            <Link
              href="/report/new?type=found"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600"
            >
              I Found Something
            </Link>
          </div>

          <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
            {user ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="text-red-400 font-semibold"
              >
                Sign Out ({user.email?.split('@')[0]})
              </button>
            ) : (
              <div className="flex gap-4">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-stone-300 hover:text-white font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  Register
                </Link>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Campus Network</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
