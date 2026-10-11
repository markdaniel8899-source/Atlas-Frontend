import { useEffect, useState } from "react";
import { getUser } from "../../lib/auth";
import { isSupabaseConfigured } from "../../lib/supabase";
import { Card } from "./ui";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] py-3 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function Settings() {
  const [email, setEmail] = useState("—");

  useEffect(() => {
    setEmail(getUser()?.email ?? "—");
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Settings
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Environment and access details for this admin session.
        </p>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-white">Session</h3>
        <div className="mt-2">
          <Row label="Signed in as" value={email} />
          <Row label="Role" value="admin" />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-white">Environment</h3>
        <div className="mt-2">
          <Row
            label="Supabase"
            value={isSupabaseConfigured ? "Configured" : "Not configured"}
          />
          <Row label="Panel" value="/wp-admin" />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-gray-500">
          Access is enforced in the database via <code>is_admin()</code> and
          row-level security. Grant admin rights by setting{" "}
          <code>role = 'admin'</code> on a profile row.
        </p>
      </Card>
    </div>
  );
}
