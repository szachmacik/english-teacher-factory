import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import GamePlayer from "./pages/GamePlayer";
import AllProducts from "./pages/AllProducts";
import GamesLibrary from "./pages/GamesLibrary";
import Settings from "./pages/Settings";
import CreateProject from "./pages/CreateProject";
import BulkFactory from "./pages/BulkFactory";
import Orders from "./pages/Orders";
import Analytics from "./pages/Analytics";
import TeacherShare from "./pages/TeacherShare";
import CertificateGenerator from "./pages/CertificateGenerator";
import FlashcardStudy from "./pages/FlashcardStudy";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/project/:id" component={ProjectDetail} />
      <Route path="/game/:token" component={GamePlayer} />
      <Route path="/products" component={AllProducts} />
      <Route path="/games" component={GamesLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path="/create" component={CreateProject} />
      <Route path={"/marketplace/:id"} component={Marketplace} />
      <Route path="/bulk" component={BulkFactory} />
      <Route path="/orders" component={Orders} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/project/:id/share" component={TeacherShare} />
      <Route path="/project/:id/certificates" component={CertificateGenerator} />
      <Route path="/project/:id/flashcards" component={FlashcardStudy} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
