/**
 * Resolves the photographer's store_slug from the custom domain hostname,
 * then delegates to SessionDetailPage by injecting the slug via context so
 * the existing booking logic is reused without duplication.
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentHostname } from "@/lib/custom-domain";
import { Loader2 } from "lucide-react";
import SessionDetailPage from "./SessionDetailPage";
import { CustomDomainSlugContext } from "@/contexts/CustomDomainSlugContext";

const CustomDomainSessionGateway = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      const hostname = getCurrentHostname();

      const { data } = await supabase
        .from("photographers")
        .select("store_slug")
        .eq("custom_domain", hostname)
        .single();

      if (!data?.store_slug) {
        setNotFound(true);
      } else {
        setSlug(data.store_slug);
      }
      setLoading(false);
    };

    resolve();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !slug) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-sm font-light text-muted-foreground">Session not found.</p>
        <button
          onClick={() => navigate("/")}
          className="text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to store
        </button>
      </div>
    );
  }

  // Provide the resolved slug so SessionDetailPage can use it for back-navigation
  return (
    <CustomDomainSlugContext.Provider value={slug}>
      <SessionDetailPage />
    </CustomDomainSlugContext.Provider>
  );
};

export default CustomDomainSessionGateway;
