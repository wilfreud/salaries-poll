import { Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import SubmitPage from "@/pages/SubmitPage";
import StatsPage from "@/pages/StatsPage";

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundBlobs />
      <TooltipProvider delayDuration={120} skipDelayDuration={0}>
        <div className="relative z-10 flex min-h-screen flex-col">
          <AppHeader />
          <main className="container mx-auto flex-1 px-4 pb-20 pt-12 md:px-8">
            <Routes>
              <Route path="/" element={<Navigate to="/submit" replace />} />
              <Route path="/submit" element={<SubmitPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="*" element={<Navigate to="/submit" replace />} />
            </Routes>
          </main>
          <SiteFooter />
        </div>
      </TooltipProvider>
    </div>
  );
}

export default App;
