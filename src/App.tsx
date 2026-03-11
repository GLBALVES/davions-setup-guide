import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Sessions from "./pages/dashboard/Sessions";
import SessionForm from "./pages/dashboard/SessionForm";
import Bookings from "./pages/dashboard/Bookings";
import Settings from "./pages/dashboard/Settings";
import Galleries from "./pages/dashboard/Galleries";
import GalleryDetail from "./pages/dashboard/GalleryDetail";
import GalleryView from "./pages/gallery/GalleryView";
import CustomDomainStore from "./pages/store/CustomDomainStore";
import CustomDomainSessionGateway from "./pages/store/CustomDomainSessionGateway";
import { isCustomDomain } from "./lib/custom-domain";
import StorePage from "./pages/store/StorePage";
import SessionDetailPage from "./pages/store/SessionDetailPage";
import BookingSuccess from "./pages/BookingSuccess";
import NotFound from "./pages/NotFound";
import Blog from "./pages/blog/Blog";
import BlogPostPage from "./pages/blog/BlogPost";
import BlogManager from "./pages/dashboard/BlogManager";
import BlogEditor from "./pages/dashboard/BlogEditor";
import SiteSeo from "./pages/dashboard/SiteSeo";
import EmailMarketing from "./pages/dashboard/EmailMarketing";
import EmailCampaignEditor from "./pages/dashboard/EmailCampaignEditor";
import EmailAutomatedEditor from "./pages/dashboard/EmailAutomatedEditor";
import EmailOneoffEditor from "./pages/dashboard/EmailOneoffEditor";
import PushNotifications from "./pages/dashboard/PushNotifications";
import Workflows from "./pages/dashboard/Workflows";
import WorkflowProject from "./pages/dashboard/WorkflowProject";
import RecurringWorkflows from "./pages/dashboard/RecurringWorkflows";
import AIAgents from "./pages/dashboard/AIAgents";
import Chat from "./pages/dashboard/Chat";
import Personalize from "./pages/dashboard/Personalize";
import CustomDomainDocs from "./pages/dashboard/CustomDomainDocs";
import ContractEditor from "./pages/dashboard/ContractEditor";
const queryClient = new QueryClient();
const onCustomDomain = isCustomDomain();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Custom domain routes (photographer's personal domain) ── */}
            {onCustomDomain ? (
              <>
                <Route path="/" element={<CustomDomainStore />} />
                <Route path="/book/:sessionSlug" element={<CustomDomainSessionGateway />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="*" element={<CustomDomainStore />} />
              </>
            ) : (
              <>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/store/:slug" element={<StorePage />} />
                <Route path="/store/:slug/:sessionSlug" element={<SessionDetailPage />} />
                <Route path="/booking-success" element={<BookingSuccess />} />

                {/* Public gallery view — supports both slug and UUID */}
                <Route path="/gallery/:slug" element={<GalleryView />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/dashboard/sessions/new" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
                <Route path="/dashboard/sessions/:id" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
                <Route path="/dashboard/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/dashboard/galleries" element={<ProtectedRoute><Galleries /></ProtectedRoute>} />
                <Route path="/dashboard/galleries/:id" element={<ProtectedRoute><GalleryDetail /></ProtectedRoute>} />
                <Route path="/dashboard/blog" element={<ProtectedRoute><BlogManager /></ProtectedRoute>} />
                <Route path="/dashboard/blog/:id" element={<ProtectedRoute><BlogEditor /></ProtectedRoute>} />
                <Route path="/dashboard/seo" element={<ProtectedRoute><SiteSeo /></ProtectedRoute>} />
                <Route path="/dashboard/emails" element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>} />
                <Route path="/dashboard/emails/campaign/:id" element={<ProtectedRoute><EmailCampaignEditor /></ProtectedRoute>} />
                <Route path="/dashboard/emails/automated/:id" element={<ProtectedRoute><EmailAutomatedEditor /></ProtectedRoute>} />
                <Route path="/dashboard/emails/oneoff/:id" element={<ProtectedRoute><EmailOneoffEditor /></ProtectedRoute>} />
                <Route path="/dashboard/push" element={<ProtectedRoute><PushNotifications /></ProtectedRoute>} />
                <Route path="/dashboard/workflow" element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
                <Route path="/dashboard/workflow/:projectId" element={<ProtectedRoute><WorkflowProject /></ProtectedRoute>} />
                <Route path="/dashboard/recurring" element={<ProtectedRoute><RecurringWorkflows /></ProtectedRoute>} />
                <Route path="/dashboard/agents" element={<ProtectedRoute><AIAgents /></ProtectedRoute>} />
                <Route path="/dashboard/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
                <Route path="/dashboard/personalize" element={<ProtectedRoute><Personalize /></ProtectedRoute>} />
                <Route path="/dashboard/personalize" element={<ProtectedRoute><Personalize /></ProtectedRoute>} />
                <Route path="/dashboard/custom-domain-docs" element={<ProtectedRoute><CustomDomainDocs /></ProtectedRoute>} />
                <Route path="/dashboard/contracts/new" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
                <Route path="/dashboard/contracts/:id/edit" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
