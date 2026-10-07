import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveSession } from "../lib/auth";

type Status = "loading" | "authed" | "guest";

function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#04040a]">
      <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#cf9eff]" />
    </div>
  );
}

export function ProtectedRoute() {
  const [status, setStatus] = useState<Status>("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    resolveSession().then((user) => {
      if (active) setStatus(user ? "authed" : "guest");
    });
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <AuthLoading />;

  if (status === "guest") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
