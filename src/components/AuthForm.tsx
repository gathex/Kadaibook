"use client";

import { Eye, EyeOff, Loader2, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { locale, messages } = useLanguage();
  const isSignup = mode === "signup";

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanedPhone = phone.trim().replace(/[\s\-()]/g, "");
    if (isSignup && shopName.trim().length < 2) {
      setError(messages.auth.errors.shopNameRequired);
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(cleanedPhone)) {
      setError(messages.auth.errors.invalidPhone);
      return;
    }
    if (password.length < 6) {
      setError(messages.auth.errors.passwordMin);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";
      const payload = isSignup
        ? {
            shopName: shopName.trim(),
            ownerName: ownerName.trim() || undefined,
            phone: cleanedPhone,
            password,
            locale,
          }
        : {
            phone: cleanedPhone,
            password,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? messages.auth.errors.generic);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(messages.auth.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between px-5 py-6">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{messages.app.name}</h1>
              <p className="text-xs text-slate-500">{messages.app.tagline}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-bold text-slate-900">
            {isSignup ? messages.auth.signupTitle : messages.auth.loginTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {isSignup ? messages.auth.signupSubtitle : messages.auth.loginSubtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {isSignup && (
            <>
              <div>
                <label
                  htmlFor="shopName"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  {messages.auth.shopName}
                </label>
                <input
                  id="shopName"
                  name="shopName"
                  type="text"
                  required
                  autoComplete="organization"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder={messages.auth.shopNamePlaceholder}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div>
                <label
                  htmlFor="ownerName"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  {messages.auth.ownerName}
                </label>
                <input
                  id="ownerName"
                  name="ownerName"
                  type="text"
                  autoComplete="name"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder={messages.auth.ownerNamePlaceholder}
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="phone"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {messages.auth.phone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={messages.auth.phonePlaceholder}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              {messages.auth.password}
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={messages.auth.passwordPlaceholder}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={
                  showPassword ? messages.auth.hidePassword : messages.auth.showPassword
                }
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>{messages.auth.submitting}</span>
              </>
            ) : isSignup ? (
              messages.auth.signup
            ) : (
              messages.auth.login
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
        {isSignup ? (
          <>
            {messages.auth.haveAccount}{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-700 hover:underline"
            >
              {messages.auth.loginLink}
            </Link>
          </>
        ) : (
          <>
            {messages.auth.noAccount}{" "}
            <Link
              href="/signup"
              className="font-semibold text-emerald-700 hover:underline"
            >
              {messages.auth.createAccountLink}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

