import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import AppHub from "./pages/AppHub.tsx";
import CookiesRules from "./pages/CookiesRules.tsx";
import CookiesCreate from "./pages/CookiesCreate.tsx";
import CookiesPreview from "./pages/CookiesPreview.tsx";
import M4nga from "./pages/M4nga.tsx";
import Lottery from "./pages/Lottery.tsx";
import Ddergo from "./pages/Ddergo.tsx";
import PfpCreator from "./pages/PfpCreator.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app" element={<AppHub />} />
          <Route path="/cookies" element={<CookiesRules />} />
          <Route path="/cookies/create" element={<CookiesCreate />} />
          <Route path="/cookies/preview" element={<CookiesPreview />} />
          <Route path="/m4nga" element={<M4nga />} />
          <Route path="/lottery" element={<Lottery />} />
          <Route path="/ddergo" element={<Ddergo />} />
          <Route path="/pfp" element={<PfpCreator />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
