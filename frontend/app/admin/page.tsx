"use client";

import { useState } from "react";
import { useAppSelector } from "@/store/hooks";
import AdminLoginPage from "@/components/admin/admin-login";
import { AdminLayout } from "@/components/admin/admin-layout";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminMemberships } from "@/components/admin/admin-memberships";
import { AdminOrders } from "@/components/admin/admin-orders";
import { AdminContent } from "@/components/admin/admin-content";
import { AdminSettings } from "@/components/admin/admin-settings";

type AdminTab =
  | "dashboard"
  | "users"
  | "memberships"
  | "orders"
  | "content"
  | "settings";

export default function AdminPage() {
  const { admin } = useAppSelector((s) => s.admin);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  if (!admin) {
    return <AdminLoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <AdminDashboard />;
      case "users":
        return <AdminUsers />;
      case "memberships":
        return <AdminMemberships />;
      case "orders":
        return <AdminOrders />;
      case "content":
        return <AdminContent />;
      case "settings":
        return <AdminSettings />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </AdminLayout>
  );
}
