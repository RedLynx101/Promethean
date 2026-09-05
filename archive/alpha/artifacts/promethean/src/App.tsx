import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "@/pages/Dashboard";
import WorkflowWizard from "@/pages/WorkflowWizard";
import WorkflowEditor from "@/pages/WorkflowEditor";
import Templates from "@/pages/Templates";
import WorkflowDetail from "@/pages/WorkflowDetail";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/Sidebar";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/wizard" component={WorkflowWizard} />
          <Route path="/workflow/:id" component={WorkflowEditor} />
          <Route path="/workflow/:id/detail" component={WorkflowDetail} />
          <Route path="/templates" component={Templates} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
