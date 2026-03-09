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

                {/* Public gallery view */}
                <Route path="/gallery/:id" element={<GalleryView />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
                <Route path="/dashboard/sessions/new" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
                <Route path="/dashboard/sessions/:id" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
                <Route path="/dashboard/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/dashboard/galleries" element={<ProtectedRoute><Galleries /></ProtectedRoute>} />
                <Route path="/dashboard/galleries/:id" element={<ProtectedRoute><GalleryDetail /></ProtectedRoute>} />

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
