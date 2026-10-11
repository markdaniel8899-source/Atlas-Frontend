import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { resolveSession } from "../../lib/auth";
import { isAdmin } from "../../lib/admin";

type Status = "loading" | "unauthed" | "admin";

function AdminLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#09090b]">
      <span className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-[#cf9eff]" />
    </div>
  );
}

/**
 * Guards /wp-admin/*.
 *
 * Flow:
 *  - No session                        -> /wp-admin/login
 *  - Session but role !== 'admin'      -> /wp-admin/login (no toast here;
 *                                         the "Access Denied" toast fires only
 *                                         after a login attempt on the form)
 *  - Session and role === 'admin'      -> allow
 *
 * The real enforcement is in the database (is_admin() + RLS). This is a UX
 * gate so normal learners never see admin chrome.
 */
export function AdminRoute() {
  const [status, setStatus] = useState<Status>("loading");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await resolveSession();
      if (!active) return;
      if (!user) {
        setStatus("unauthed");
        return;
      }
      const admin = await isAdmin();
      if (!active) return;
      // Non-admins are sent to the login page so they can try another
      // account. No toast here — it would fire before they ever see the form.
      setStatus(admin ? "admin" : "unauthed");
    })();
    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") return <AdminLoading />;

  if (status === "unauthed") {
    return (
      <Navigate
        to="/wp-admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}

export default AdminRoute;
