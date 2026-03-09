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
import StorePage from "./pages/store/StorePage";
import SessionDetailPage from "./pages/store/SessionDetailPage";
import BookingSuccess from "./pages/BookingSuccess";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/store/:slug" element={<StorePage />} />
            <Route path="/store/:slug/:sessionId" element={<SessionDetailPage />} />
            <Route path="/booking-success" element={<BookingSuccess />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
            <Route path="/dashboard/sessions/new" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
            <Route path="/dashboard/sessions/:id" element={<ProtectedRoute><SessionForm /></ProtectedRoute>} />
            <Route path="/dashboard/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
            <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
