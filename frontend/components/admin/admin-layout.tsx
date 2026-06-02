"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adminLogout } from "@/store/slices/adminSlice";
import {
  Users,
  CreditCard,
  ShoppingBag,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Layout,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/language-toggle";

type AdminTab =
  | "dashboard"
  | "users"
  | "memberships"
  | "orders"
  | "content"
  | "settings";

interface AdminLayoutProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export function AdminLayout({
  activeTab,
  setActiveTab,
  children,
}: AdminLayoutProps) {
  const dispatch = useAppDispatch();
  const { admin } = useAppSelector((s) => s.admin);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const t = useTranslations("admin");

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "dashboard",
      label: t("nav.dashboard"),
      icon: <LayoutDashboard size={18} />,
    },
    { id: "users", label: t("nav.users"), icon: <Users size={18} /> },
    {
      id: "memberships",
      label: t("nav.memberships"),
      icon: <CreditCard size={18} />,
    },
    { id: "orders", label: t("nav.orders"), icon: <ShoppingBag size={18} /> },
    { id: "content", label: t("nav.content"), icon: <Layout size={18} /> },
    { id: "settings", label: t("nav.settings"), icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0e0e0e] border-r border-white/5 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:flex`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
          <div>
            <h2 className="font-bold text-white text-base">{t("title")}</h2>
            <p className="text-white/30 text-xs truncate">{admin?.email}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/40 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                activeTab === item.id
                  ? "bg-red-600/20 text-red-400 border border-red-600/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={() => dispatch(adminLogout())}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/50 hover:text-red-400 hover:bg-red-600/10 transition-colors"
          >
            <LogOut size={18} />
            {t("logout")}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-[#0e0e0e] border-b border-white/5 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-white font-semibold capitalize flex-1">
            {navItems.find((n) => n.id === activeTab)?.label ?? "Admin"}
          </h1>
          <LanguageToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
