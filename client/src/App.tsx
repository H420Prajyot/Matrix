import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin/dashboard";
import PentesterDashboard from "@/pages/pentester/dashboard";
import ClientDashboard from "@/pages/client/dashboard";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'admin':
        return AdminDashboard;
      case 'pentester':
        return PentesterDashboard;
      case 'client':
        return ClientDashboard;
      default:
        return ClientDashboard; // fallback to client dashboard
    }
  };

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={getDashboardComponent()} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/pentester" component={PentesterDashboard} />
          <Route path="/client" component={ClientDashboard} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
