"use client";

import { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adminLogin, clearAdminError } from "@/store/slices/adminSlice";
import { useTranslations } from "next-intl";

export default function AdminLoginPage() {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.admin);
  const [form, setForm] = useState({ email: "", password: "" });
  const t = useTranslations("admin.login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearAdminError());
    await dispatch(adminLogin(form));
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 border border-red-600/40 rounded-2xl mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
          <p className="text-white/40 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <div className="bg-[#111111] border border-white/10 rounded-2xl p-8">
          {error && (
            <div className="mb-4 bg-red-950/50 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {t("email")}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder={t("emailPlaceholder")}
                className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {t("password")}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-red-500/60 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? t("signingIn") : t("signIn")}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-white/25">{t("hint")}</p>
        </div>
      </div>
    </div>
  );
}
