"use client";
import DashboardHeader from "@/components/shared/DashboardHeader";
import DashboardSidebar from "@/components/shared/DashboardSidebar";
import { ReactNode } from "react";

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex h-screen bg-background">
    <DashboardSidebar />
    <div className="flex flex-1 flex-col">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  </div>
);

export default DashboardLayout;