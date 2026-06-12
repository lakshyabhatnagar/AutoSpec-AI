"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { BrandMark } from "@/components/BrandLogo";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const message = isSignup ? await signup(name, email, password) : await login(email, password);
    setLoading(false);
    if (message) {
      setError(message);
      return;
    }
    router.push("/chat");
  };

  return (
    <main className="flex min-h-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(14,165,183,0.2),transparent_30%),linear-gradient(135deg,#0B1220,#101827_48%,#0b1220)] px-4 py-16">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-[2rem] bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl ring-1 ring-white/8">
        <BrandMark className="h-12 w-12" />
        <h1 className="mt-5 text-2xl font-extrabold text-zinc-100">{isSignup ? "Create account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm font-medium text-zinc-500">{isSignup ? "Start a persistent AutoSpec AI workspace." : "Continue your saved chats."}</p>

        <div className="mt-6 space-y-3">
          {isSignup && (
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name"
              className="h-12 w-full rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:bg-white/[0.08]"
              required
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="h-12 w-full rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:bg-white/[0.08]"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="h-12 w-full rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-zinc-100 outline-none placeholder:text-zinc-600 focus:bg-white/[0.08]"
            required
            minLength={isSignup ? 8 : 1}
          />
        </div>

        {error && <p className="mt-4 rounded-2xl bg-red-300/10 px-4 py-3 text-sm font-semibold text-red-200">{error}</p>}

        <button disabled={loading} className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-cyan-300/15 text-sm font-extrabold text-cyan-100 shadow-[0_0_28px_rgba(14,165,183,0.12)] hover:bg-cyan-300/20 disabled:cursor-wait disabled:text-zinc-500">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? "Sign Up" : "Login"}
        </button>

        <p className="mt-5 text-center text-sm font-medium text-zinc-500">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-bold text-cyan-300 hover:text-cyan-200">
            {isSignup ? "Login" : "Sign up"}
          </Link>
        </p>
      </form>
    </main>
  );
}
