import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveSession } from "../../lib/auth";
import { isAdmin } from "../../lib/admin";
import { toast } from "../../lib/toast";

type Status = "loading" | "guest" | "denied" | "admin";

function AdminLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#09090b]">
      <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#cf9eff]" />
    </div>
  );
}

/**
 * Guards /wp-admin/*:
 *  - Not signed in  -> custom admin login (/wp-admin/login)
 *  - Signed in but role !== 'admin' -> /app + "Access Denied" toast
 *
 * The real enforcement is in the database (is_admin() + RLS). This is a UX
 * gate so normal learners never see admin chrome.
 */
export function AdminRoute() {
  const [status, setStatus] = useState<Status>("loading");
  const location = useLocation();
  // StrictMode double-invokes effects; guard so the toast fires once.
  const toasted = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await resolveSession();
      if (!active) return;
      if (!user) {
        setStatus("guest");
        return;
      }
      const admin = await isAdmin();
      if (!active) return;
      if (admin) {
        setStatus("admin");
      } else {
        if (!toasted.current) {
          toasted.current = true;
          toast.error("Access Denied — this area is restricted to admins.");
        }
        setStatus("denied");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <AdminLoading />;
  if (status === "guest") {
    return (
      <Navigate
        to="/wp-admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (status === "denied") return <Navigate to="/app" replace />;

  return <Outlet />;
}

export default AdminRoute;
