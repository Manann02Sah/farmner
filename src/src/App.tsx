import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Navbar from "@/components/Navbar";
import Landing from "./pages/Landing";
import SchemeExplorer from "./pages/SchemeExplorer";
import SchemeCompare from "./pages/SchemeCompare";
import Dashboard from "./pages/Dashboard";
import AIChat from "./pages/AIChat";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import SchemeDetails from "./pages/SchemeDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/schemes" element={<SchemeExplorer />} />
              <Route path="/schemes/:schemeId" element={<SchemeDetails />} />
              <Route path="/compare" element={<SchemeCompare />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<AIChat />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
