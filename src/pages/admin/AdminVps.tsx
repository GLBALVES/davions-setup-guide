import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";
import AdminVpsSetupContent from "./AdminVpsSetupContent";
import AdminVpsDocsContent from "./AdminVpsDocsContent";

type Tab = "setup" | "docs";

const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "VPS Setup" },
  { id: "docs", label: "VPS Docs" },
];

export default function AdminVps() {
  const [tab, setTab] = useState<Tab>("setup");

  return (
    <AdminLayout>
      <div className="px-8 py-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[11px] tracking-[0.3em] uppercase font-light text-muted-foreground">
            Management
          </h1>
          <p className="text-2xl font-light mt-1">VPS</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-8">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2 text-xs font-light tracking-wide transition-colors duration-150 border-b-2 -mb-px",
                tab === id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "setup" && <AdminVpsSetupContent />}
        {tab === "docs" && <AdminVpsDocsContent />}
      </div>
    </AdminLayout>
  );
}
