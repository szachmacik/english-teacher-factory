import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import GamePlayer from "./pages/GamePlayer";
import AllProducts from "./pages/AllProducts";
import GamesLibrary from "./pages/GamesLibrary";
import Settings from "./pages/Settings";
import CreateProject from "./pages/CreateProject";
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
      <Route path="/404" component={NotFound} />
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
