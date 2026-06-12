"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomDock } from "@/components/BottomDock";
import { AppFooter } from "@/components/AppFooter";
import { AppNavbar } from "@/components/AppNavbar";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

const protectedPrefixes = ["/chat", "/critical", "/debug", "/history", "/settings", "/maintenance", "/warranty", "/safety", "/emergency", "/malfunctions"];
const authPages = ["/login", "/signup"];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const lastScrollTopRef = useRef(0);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const isProtected = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const isAuthPage = authPages.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (isProtected && !user) router.replace("/login");
    if (isAuthPage && user) router.replace("/chat");
  }, [isProtected, isAuthPage, loading, router, user]);

  useEffect(() => {
    lastScrollTopRef.current = 0;
    const frame = requestAnimationFrame(() => setNavbarHidden(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const previousScrollTop = lastScrollTopRef.current;
    const delta = scrollTop - previousScrollTop;

    if (scrollTop < 24) {
      setNavbarHidden(false);
    } else if (delta > 8 && scrollTop > 80) {
      setNavbarHidden(true);
    } else if (delta < -8) {
      setNavbarHidden(false);
    }

    lastScrollTopRef.current = scrollTop;
  };

  const blocked = (isProtected && !user) || (isAuthPage && user);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--app-bg)] text-zinc-100">
      <AppNavbar hidden={navbarHidden} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading || blocked ? (
            <div className="flex min-h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,rgba(14,165,183,0.14),transparent_30%),#0B1220] text-sm font-semibold text-zinc-500">
              Loading...
            </div>
          ) : (
            <>
              {children}
              <AppFooter />
            </>
          )}
        </div>
      </main>
      {!isAuthPage && <BottomDock />}
    </div>
  );
}
