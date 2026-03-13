import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  ChevronRight,
  Download,
  Layers,
  RefreshCw,
  Trash2,
  UploadCloud,
  AlertTriangle,
  HelpCircle,
  Plug,
  ArrowLeft,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const installSteps = [
  {
    n: "01",
    title: "Download and unzip the plugin",
    desc: "Click the download button in the Galleries settings to get the latest DavionsConnect package. Unzip it to a permanent folder on your computer — do not move it after installation.",
  },
  {
    n: "02",
    title: "Open the Plug-in Manager in Lightroom Classic",
    desc: 'In Lightroom Classic, go to File → Plug-in Manager (or press Ctrl/⌘ + Alt + Shift + ,). Click "Add" and navigate to the unzipped DavionsConnect-1.0.lrplugin folder. Select it and click "Add Plug-in".',
  },
  {
    n: "03",
    title: "Sign in with your Davions account",
    desc: "In the plugin settings panel (left sidebar of the Plug-in Manager), enter the same email and password you use to log in to Davions. Click \"Sign in\" — the status indicator will turn green when authentication succeeds.",
  },
  {
    n: "04",
    title: "Create a Publish Service collection",
    desc: 'Go to the Publish Services panel in the Library module. Click "Set Up" next to Davions. Give the collection a name that matches (or will become) a gallery in your account, then click Save.',
  },
  {
    n: "05",
    title: "Publish your first photos",
    desc: "Drag photos into the collection and click the Publish button. The plugin will upload them to your gallery automatically. The first publish may take a moment as the gallery is created.",
  },
];

const howItWorks = [
  {
    icon: UploadCloud,
    title: "Publish",
    desc: "Drag photos into a Publish Service collection and click Publish. The plugin uploads them directly to your Davions gallery in real time.",
  },
  {
    icon: RefreshCw,
    title: "Re-publish",
    desc: "Edit or re-export a photo in Lightroom and click Publish again. The plugin replaces the existing version in the gallery automatically — no duplicates created.",
  },
  {
    icon: Trash2,
    title: "Remove",
    desc: 'Right-click a photo in the collection and choose "Mark to Delete", then click Publish. The plugin removes it from your gallery and deletes the file from storage.',
  },
  {
    icon: Layers,
    title: "Rename a gallery",
    desc: 'Use "Edit Collection" from the right-click context menu on the collection — not the native Rename option. The native Rename does not trigger a sync update and will cause the gallery name to fall out of sync.',
  },
];

const warnings = [
  {
    title: "Do not use the native Rename command",
    desc: 'The context menu "Rename" option in Lightroom does not trigger a sync event. Always use "Edit Collection" (right-click → Edit Collection) to rename a gallery collection so the change propagates correctly to Davions.',
  },
  {
    title: "Keep the plugin folder in a permanent location",
    desc: "Lightroom references the plugin by its file path. Moving or renaming the .lrplugin folder after installation will cause the plugin to stop loading. If you need to move it, remove and re-add it via the Plug-in Manager.",
  },
  {
    title: "Lightroom CC (cloud) is not supported",
    desc: "The plugin uses the Publish Services API, which is only available in Lightroom Classic. The cloud-based Lightroom app does not expose this API.",
  },
];

const faqs = [
  {
    q: "Which version of Lightroom Classic is required?",
    a: "Lightroom Classic 9.0 (released in 2019) or later. Earlier versions do not support all the Publish Services features the plugin requires.",
  },
  {
    q: "Can I install the plugin on multiple computers?",
    a: "Yes. Install the plugin on each machine and sign in with the same Davions email and password. All machines will sync to the same account and galleries.",
  },
  {
    q: "Photos are not appearing in my gallery after publishing. What should I check?",
    a: "1) Confirm your email and password are correct in the plugin settings panel. 2) Check that Lightroom has internet access. 3) Look at the Publish log for error messages. 4) If the issue persists, sign out and sign back in within the plugin.",
  },
  {
    q: "Can I rename a gallery from within Lightroom?",
    a: 'Yes — but you must use "Edit Collection" from the right-click menu on the collection, not the native "Rename" option. The native rename does not fire a sync event and will cause the gallery title to fall out of sync with Davions.',
  },
  {
    q: "What happens if a photo fails to upload?",
    a: 'Lightroom will mark it as "failed" in the Publish panel. You can retry by right-clicking the photo and choosing "Publish Now". Check your internet connection and that the file is not locked or corrupted.',
  },
  {
    q: "Can I publish to multiple galleries?",
    a: "Yes. Create one Publish Service collection per gallery. Each collection is linked to a single gallery in Davions.",
  },
  {
    q: "Is my login password stored by the plugin?",
    a: "Your credentials are used to obtain an authentication token, which is stored securely in your Lightroom preferences on your local machine. Your password itself is not stored in plain text.",
  },
  {
    q: "The plugin disappeared after updating Lightroom. What happened?",
    a: "Lightroom updates sometimes reset the plug-in list. Open the Plug-in Manager, click Add, and point it to your .lrplugin folder again. Your publish collections and settings will be preserved.",
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] tracking-[0.45em] uppercase text-muted-foreground font-light">
      {children}
    </h2>
  );
}

function Divider() {
  return <div className="border-t border-border" />;
}

// ─── Page ────────────────────────────────────────────────────────────────────

const LightroomPluginHelp = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

              {/* Breadcrumb + back */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                  <Plug className="h-3.5 w-3.5" />
                  <span>Personalize</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Galleries</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Lightroom Plugin Help</span>
                </div>
                <button
                  onClick={() => navigate("/dashboard/personalize?tab=galleries")}
                  className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Galleries settings
                </button>
                <div className="space-y-2">
                  <h1 className="text-2xl font-light tracking-wide">Lightroom Plugin — Help</h1>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                    Complete guide for installing, configuring and using the DavionsConnect plugin
                    for Lightroom Classic.
                  </p>
                </div>
              </div>

              <Divider />

              {/* Quick download */}
              <section className="space-y-4">
                <SectionLabel>Download</SectionLabel>
                <div className="flex items-start gap-5 p-5 border border-border bg-card">
                  <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-light">DavionsConnect-1.0.lrplugin</p>
                      <p className="text-[11px] text-muted-foreground">
                        Compatible with Lightroom Classic 9 (2019) and later — macOS and Windows.
                      </p>
                    </div>
                    <a
                      href="/downloads/DavionsConnect-1.0.lrplugin.zip"
                      download="DavionsConnect-1.0.lrplugin.zip"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background hover:bg-accent text-[11px] font-light tracking-wide transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Plugin (.zip)
                    </a>
                  </div>
                </div>
              </section>

              <Divider />

              {/* Installation */}
              <section className="space-y-4">
                <SectionLabel>Installation</SectionLabel>
                <div className="space-y-px">
                  {installSteps.map((step) => (
                    <div key={step.n} className="flex gap-5 p-5 border border-border bg-card">
                      <span className="text-2xl font-light text-muted-foreground/25 shrink-0 w-8 text-right leading-none mt-0.5 tabular-nums">
                        {step.n}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-light">{step.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Divider />

              {/* How it works */}
              <section className="space-y-4">
                <SectionLabel>How It Works</SectionLabel>
                <div className="space-y-px">
                  {howItWorks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-4 p-5 border border-border bg-card">
                        <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-sm font-light">{item.title}</p>
                          <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <Divider />

              {/* Important warnings */}
              <section className="space-y-4">
                <SectionLabel>Important Notes</SectionLabel>
                <div className="space-y-px">
                  {warnings.map((w) => (
                    <div key={w.title} className="flex items-start gap-4 p-5 border border-border bg-card">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm font-light">{w.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{w.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <Divider />

              {/* FAQ */}
              <section className="space-y-4">
                <SectionLabel>Frequently Asked Questions</SectionLabel>
                <div className="space-y-px">
                  {faqs.map((faq, i) => (
                    <div key={i} className="flex items-start gap-4 p-5 border border-border bg-card">
                      <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm font-light">{faq.q}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default LightroomPluginHelp;
