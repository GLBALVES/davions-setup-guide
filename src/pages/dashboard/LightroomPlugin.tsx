import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  SlidersHorizontal,
  ChevronRight,
  Download,
  Layers,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";

const steps = [
  {
    number: "01",
    title: "Download and unzip the plugin",
    description:
      "Click the download button below to get the latest davions.lrplugin package. Unzip it to a permanent folder on your computer — do not move it after installation.",
  },
  {
    number: "02",
    title: "Open the Plug-in Manager in Lightroom Classic",
    description:
      'In Lightroom Classic, go to File → Plug-in Manager (or press Ctrl/⌘ + Alt + Shift + ,). Click "Add" and navigate to the unzipped davions.lrplugin folder.',
  },
  {
    number: "03",
    title: "Configure your API Token",
    description:
      "In the plugin settings panel (left sidebar of the Plug-in Manager), paste your API Token from the section below. This authenticates the plugin with your account.",
  },
  {
    number: "04",
    title: "Create a Publish Service collection",
    description:
      'Go to the Publish Services panel in the Library module. Click "Set Up" next to Davions. Create a collection for each gallery you want to sync. Photos published to that collection will appear in your gallery.',
  },
];

const howItWorks = [
  {
    icon: UploadCloud,
    title: "Publish",
    description:
      "Drag photos into a Publish Service collection and click Publish. The plugin uploads them directly to your gallery.",
  },
  {
    icon: RefreshCw,
    title: "Re-publish",
    description:
      "Edit a photo in Lightroom and republish it. The plugin replaces the existing version in your gallery automatically.",
  },
  {
    icon: Trash2,
    title: "Remove",
    description:
      "Mark a photo for deletion in the collection and republish. The plugin removes it from your gallery.",
  },
  {
    icon: Layers,
    title: "Rename gallery",
    description:
      'To rename a gallery, use "Edit Collection" in Lightroom (not the native Rename command). This ensures the gallery slug is updated correctly.',
  },
];

const faqs = [
  {
    q: "Which version of Lightroom is supported?",
    a: "Lightroom Classic 9 (2019) or later. Lightroom CC (cloud-based) is not supported — the plugin uses the Publish Services API which is only available in the Classic version.",
  },
  {
    q: "Can I use the same plugin on multiple computers?",
    a: "Yes. Install the plugin on each computer and use the same API Token. All machines will sync to the same account.",
  },
  {
    q: "Photos are not appearing in my gallery after publishing. What do I check?",
    a: "Verify your API Token is correctly pasted (no extra spaces). Check that the collection name in Lightroom matches a gallery on your account. If the issue persists, remove and re-add the plugin.",
  },
  {
    q: "Can I rename a gallery from within Lightroom?",
    a: 'Yes, but you must use "Edit Collection" from the context menu on the collection — not the native Rename option. The native Rename command does not trigger the sync update.',
  },
  {
    q: "Is my API Token the same as my password?",
    a: "No. Your API Token is a unique identifier for your photographer account. It is not your login password and cannot be used to access the dashboard.",
  },
];

const LightroomPlugin = () => {
  const { signOut, user } = useAuth();
  const [copied, setCopied] = useState(false);

  const apiToken = user?.id ?? "—";

  const handleCopy = () => {
    navigator.clipboard.writeText(apiToken).then(() => {
      setCopied(true);
      toast.success("API Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <DashboardSidebar onSignOut={signOut} userEmail={user?.email} />
        <div className="flex-1 flex flex-col min-h-0">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-14">

              {/* Hero */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-muted-foreground">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Settings</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>Lightroom Plugin</span>
                </div>
                <h1 className="text-2xl font-light tracking-wide">Lightroom Plugin</h1>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  Publish photos directly from Lightroom Classic to your galleries. The plugin uses the
                  Lightroom Publish Services API to keep your galleries in sync as you edit.
                </p>
              </div>

              {/* Download */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Download</h2>
                <div className="flex items-start gap-5 p-6 border border-border bg-card">
                  <Download className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-light">davions.lrplugin</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">
                        Compatible with Lightroom Classic 9 (2019) and later. macOS and Windows.
                      </p>
                    </div>
                    {/* Replace the href below with the actual hosted .zip URL when available */}
                    <a
                      href="#download-placeholder"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info("Plugin download link coming soon.");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-background hover:bg-accent text-[12px] font-light tracking-wide transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Plugin (.zip)
                    </a>
                  </div>
                </div>
              </section>

              {/* Installation Steps */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Installation</h2>
                <div className="space-y-px">
                  {steps.map((step) => (
                    <div key={step.number} className="flex gap-5 p-5 border border-border bg-card">
                      <span className="text-2xl font-light text-muted-foreground/30 shrink-0 w-8 text-right leading-none mt-0.5">
                        {step.number}
                      </span>
                      <div className="space-y-1">
                        <p className="text-sm font-light">{step.title}</p>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>


              {/* How it works */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">How It Works</h2>
                <div className="space-y-px">
                  {howItWorks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="flex items-start gap-3 p-4 border border-border bg-card">
                        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                        <div className="space-y-0.5">
                          <span className="text-[12px] font-light">{item.title}</span>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* FAQ */}
              <section className="space-y-4">
                <h2 className="text-[11px] tracking-[0.4em] uppercase text-muted-foreground">Frequently Asked Questions</h2>
                <div className="space-y-px">
                  {faqs.map((faq, i) => (
                    <div key={i} className="p-5 border border-border bg-card space-y-2">
                      <p className="text-[13px] font-light">{faq.q}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{faq.a}</p>
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

export default LightroomPlugin;
