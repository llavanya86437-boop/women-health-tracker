import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="h-12 w-12 rounded-full bg-gradient-primary animate-pulse-soft shadow-glow" />
      </div>
    );
  }
  if (!session) return <Navigate to="/auth" replace />;
  return children;
};
