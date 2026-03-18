import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PermissionGate from "@/components/PermissionGate";
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
import LightroomPlugin from "./pages/dashboard/LightroomPlugin";
import LightroomPluginHelp from "./pages/dashboard/LightroomPluginHelp";
import ContractEditor from "./pages/dashboard/ContractEditor";
import Schedule from "./pages/dashboard/Schedule";
import Clients from "./pages/dashboard/Clients";
import CreativeStudio from "./pages/dashboard/CreativeStudio";
import WebsiteSettings from "./pages/dashboard/WebsiteSettings";
import AccessControl from "./pages/dashboard/AccessControl";
import Projects from "./pages/dashboard/Projects";
import SocialMedia from "./pages/dashboard/SocialMedia";
import Revenue from "./pages/dashboard/Revenue";
import FinanceDashboard from "./pages/dashboard/FinanceDashboard";
import FinanceReceivables from "./pages/dashboard/FinanceReceivables";
import FinancePayables from "./pages/dashboard/FinancePayables";
import FinanceCashFlow from "./pages/dashboard/FinanceCashFlow";
import FinanceReports from "./pages/dashboard/FinanceReports";
import Billing from "./pages/dashboard/Billing";
import AdminBugReports from "./pages/admin/AdminBugReports";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import HelpCenter from "./pages/dashboard/HelpCenter";
import { LanguageProvider } from "@/contexts/LanguageContext";
import PublicOnlyRoute from "@/components/PublicOnlyRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
const queryClient = new QueryClient();
const onCustomDomain = isCustomDomain();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
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
                <Route path="/" element={<PublicOnlyRoute><Index /></PublicOnlyRoute>} />
                <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
                <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/store/:slug" element={<StorePage />} />
                <Route path="/store/:slug/:sessionSlug" element={<SessionDetailPage />} />
                <Route path="/booking-success" element={<BookingSuccess />} />

                {/* Public gallery view — supports both slug and UUID */}
                <Route path="/gallery/:slug" element={<GalleryView />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/dashboard/projects" replace /></ProtectedRoute>} />
                <Route path="/dashboard/sessions" element={<ProtectedRoute><PermissionGate permKey="sessions"><Sessions /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/sessions/new" element={<ProtectedRoute><PermissionGate permKey="sessions"><SessionForm /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/sessions/:id" element={<ProtectedRoute><PermissionGate permKey="sessions"><SessionForm /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/schedule" element={<ProtectedRoute><PermissionGate permKey="schedule"><Schedule /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/bookings" element={<ProtectedRoute><PermissionGate permKey="bookings"><Bookings /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/dashboard/galleries" element={<ProtectedRoute><PermissionGate permKey="galleries"><Galleries /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/galleries/:id" element={<ProtectedRoute><PermissionGate permKey="galleries"><GalleryDetail /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/blog" element={<ProtectedRoute><PermissionGate permKey="blog"><BlogManager /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/blog/:id" element={<ProtectedRoute><PermissionGate permKey="blog"><BlogEditor /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/seo" element={<ProtectedRoute><PermissionGate permKey="seo"><SiteSeo /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/emails" element={<ProtectedRoute><PermissionGate permKey="emails"><EmailMarketing /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/emails/campaign/:id" element={<ProtectedRoute><PermissionGate permKey="emails"><EmailCampaignEditor /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/emails/automated/:id" element={<ProtectedRoute><PermissionGate permKey="emails"><EmailAutomatedEditor /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/emails/oneoff/:id" element={<ProtectedRoute><PermissionGate permKey="emails"><EmailOneoffEditor /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/push" element={<ProtectedRoute><PermissionGate permKey="push"><PushNotifications /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/workflow" element={<ProtectedRoute><PermissionGate permKey="workflow"><Workflows /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/workflow/:projectId" element={<ProtectedRoute><PermissionGate permKey="workflow"><WorkflowProject /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/recurring" element={<ProtectedRoute><PermissionGate permKey="recurring"><RecurringWorkflows /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/agents" element={<ProtectedRoute><PermissionGate permKey="agents"><AIAgents /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/chat" element={<ProtectedRoute><PermissionGate permKey="chat"><Chat /></PermissionGate></ProtectedRoute>} />
                <Route path="/dashboard/personalize" element={<ProtectedRoute><Personalize /></ProtectedRoute>} />
                <Route path="/dashboard/personalize" element={<ProtectedRoute><Personalize /></ProtectedRoute>} />
                <Route path="/dashboard/custom-domain-docs" element={<ProtectedRoute><CustomDomainDocs /></ProtectedRoute>} />
                 <Route path="/dashboard/lightroom-plugin" element={<Navigate to="/dashboard/personalize?tab=galleries" replace />} />
                 <Route path="/dashboard/lightroom-plugin-help" element={<ProtectedRoute><LightroomPluginHelp /></ProtectedRoute>} />
                <Route path="/dashboard/contracts/new" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
                 <Route path="/dashboard/contracts/:id/edit" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
                 <Route path="/dashboard/clients" element={<ProtectedRoute><PermissionGate permKey="clients"><Clients /></PermissionGate></ProtectedRoute>} />
                 <Route path="/dashboard/creative" element={<ProtectedRoute><PermissionGate permKey="creative"><CreativeStudio /></PermissionGate></ProtectedRoute>} />
                 <Route path="/dashboard/website" element={<ProtectedRoute><PermissionGate permKey="website"><WebsiteSettings /></PermissionGate></ProtectedRoute>} />
                 <Route path="/dashboard/access-control" element={<ProtectedRoute><AccessControl /></ProtectedRoute>} />
                 <Route path="/dashboard/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                 <Route path="/dashboard/social-media" element={<ProtectedRoute><SocialMedia /></ProtectedRoute>} />
                 <Route path="/dashboard/revenue" element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
                 <Route path="/dashboard/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
                 <Route path="/dashboard/finance/receivables" element={<ProtectedRoute><FinanceReceivables /></ProtectedRoute>} />
                 <Route path="/dashboard/finance/payables" element={<ProtectedRoute><FinancePayables /></ProtectedRoute>} />
                 <Route path="/dashboard/finance/cashflow" element={<ProtectedRoute><FinanceCashFlow /></ProtectedRoute>} />
                 <Route path="/dashboard/finance/reports" element={<ProtectedRoute><FinanceReports /></ProtectedRoute>} />
                 <Route path="/dashboard/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />

                 <Route path="/dashboard/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />

                 {/* Admin routes */}
                 <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                 <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                 <Route path="/admin/bugs" element={<ProtectedRoute><AdminBugReports /></ProtectedRoute>} />

                 {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </>
            )}
          </Routes>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
