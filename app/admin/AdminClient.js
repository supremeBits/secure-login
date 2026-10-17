"use client";
import { useCallback, useEffect, useState } from "react";

const ROLES = ["admin", "manager", "staff", "viewer"];

async function api(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

const when = (iso) => (iso ? new Date(iso).toLocaleString() : "");

export default function AdminClient({ meId }) {
  const [tab, setTab] = useState("users");
  return (
    <div>
      <div className="tabs">
        <button className={"small" + (tab === "users" ? "" : " ghost")} onClick={() => setTab("users")}>
          Users
        </button>
        <button className={"small" + (tab === "system" ? "" : " ghost")} onClick={() => setTab("system")}>
          System
        </button>
      </div>
      {tab === "users" ? <UsersTab meId={meId} /> : <SystemTab />}
    </div>
  );
}

// ------------------------------------------------------------------ USERS
function UsersTab({ meId }) {
  const [users, setUsers] = useState([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ username: "", email: "", password: "", role: "staff" });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, data } = await api("/api/admin/users");
    if (ok) setUsers(data.users);
    else setError(data.error || "Could not load users.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addUser(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    const { ok, data } = await api("/api/admin/users", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (!ok) return setError(data.error || "Could not add the user.");
    setCreated({ username: form.username, qr: data.qr, secret: data.secret });
    setForm({ username: "", email: "", password: "", role: "staff" });
    load();
  }

  async function patch(u, body, success) {
    setError("");
    setMsg("");
    const { ok, data } = await api(`/api/admin/users/${u.id}`, { method: "PATCH", body: JSON.stringify(body) });
    if (!ok) setError(data.error || "Could not update the user.");
    else setMsg(success || "Saved.");
    load();
  }

  async function del(u) {
    if (!window.confirm(`Delete ${u.username}? They keep their data but can no longer log in. You can restore them later.`))
      return;
    setError("");
    setMsg("");
    const { ok, data } = await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (!ok) setError(data.error || "Could not delete the user.");
    else setMsg(`${u.username} was deleted (soft delete). Their record is still in the database.`);
    load();
  }

  const visible = users.filter((u) => showDeleted || !u.deleted_at);

  return (
    <div className="card">
      <h1>Users 👤</h1>

      <h2>Add a user</h2>
      <form onSubmit={addUser}>
        <div className="grid2">
          <div>
            <label>Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Temporary password</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div>
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button disabled={busy}>{busy ? "Adding..." : "Add user"}</button>
      </form>

      {created && (
        <div className="notice">
          <strong>{created.username} was added.</strong> Give them their password and this 2FA setup. It is shown only
          once.
          <img className="qr" src={created.qr} alt="2FA QR code" />
          <code>{created.secret}</code>
          <button className="small ghost" onClick={() => setCreated(null)}>
            Done
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {msg && <div className="ok">{msg}</div>}

      <h2>All users</h2>
      <label className="check">
        <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} />
        Show deleted users
      </label>

      <div>
        {visible.map((u) => {
          const locked = u.locked_until && new Date(u.locked_until) > new Date();
          return (
            <div key={u.id} className={"urow" + (u.deleted_at ? " gone" : "")}>
              <div>
                <strong>{u.username}</strong> {u.id === meId && <span className="chip">you</span>}
                <div className="task-notes">{u.email}</div>
                <div className="chips">
                  {u.deleted_at && <span className="chip p-high">deleted {when(u.deleted_at)}</span>}
                  {locked && <span className="chip p-high">locked</span>}
                </div>
              </div>
              <div className="urow-controls">
                <select
                  value={u.role}
                  disabled={!!u.deleted_at || u.id === meId}
                  onChange={(e) => patch(u, { role: e.target.value }, `${u.username} is now ${e.target.value}.`)}
                  aria-label={`Role for ${u.username}`}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  value={u.status}
                  disabled={!!u.deleted_at || u.id === meId}
                  onChange={(e) => patch(u, { status: e.target.value }, `${u.username} is now ${e.target.value}.`)}
                  aria-label={`Status for ${u.username}`}
                >
                  <option value="active">active</option>
                  <option value="disabled">disabled</option>
                </select>
                {u.deleted_at ? (
                  <button className="small" onClick={() => patch(u, { restore: true }, `${u.username} was restored.`)}>
                    Restore
                  </button>
                ) : (
                  <>
                    <button className="small ghost" onClick={() => patch(u, { unlock: true }, "Account unlocked.")}>
                      Unlock
                    </button>
                    {u.id !== meId && (
                      <button className="small danger" onClick={() => del(u)}>
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ SYSTEM
function SystemTab() {
  const [sys, setSys] = useState(null);
  const [form, setForm] = useState(null);
  const [pointName, setPointName] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { ok, data } = await api("/api/admin/system");
    if (ok) {
      setSys(data);
      setForm((f) => f || data.settings);
    } else setError(data.error || "Could not load the system state.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function note(ok, data, success) {
    if (ok) {
      setError("");
      setMsg(success);
    } else {
      setMsg("");
      setError(data.error || "Something went wrong.");
    }
  }

  async function saveSettings(e) {
    e.preventDefault();
    const { ok, data } = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(form) });
    note(ok, data, "Settings saved.");
    if (ok) setForm(data.settings);
    load();
  }

  async function backupNow() {
    setBusy(true);
    const { ok, data } = await api("/api/admin/backup", { method: "POST" });
    setBusy(false);
    note(ok, data, `Backup saved: ${data.file}`);
    load();
  }

  async function createPoint() {
    const { ok, data } = await api("/api/admin/restore-points", {
      method: "POST",
      body: JSON.stringify({ name: pointName }),
    });
    note(ok, data, "Restore point created.");
    if (ok) setPointName("");
    load();
  }

  async function restore(body, label) {
    if (
      !window.confirm(
        `Restore the settings from ${label}? This changes the configuration only. Users and tasks are not touched.`
      )
    )
      return;
    const { ok, data } = await api("/api/admin/restore", { method: "POST", body: JSON.stringify(body) });
    note(ok, data, "Settings restored. Users and tasks were not changed.");
    if (ok) setForm(data.settings);
    load();
  }

  if (!sys || !form) return <div className="card">{error || "Loading..."}</div>;
  const s = sys.state;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="ok">{msg}</div>}

      <div className="card">
        <h1>System state 📊</h1>
        <div className="stats">
          <div className="stat"><b>{s.users_active}</b>active users</div>
          <div className="stat"><b>{s.users_disabled}</b>disabled</div>
          <div className="stat"><b>{s.users_deleted}</b>deleted (kept)</div>
          <div className="stat"><b>{s.tasks_total}</b>tasks</div>
          <div className="stat"><b>{s.tasks_done}</b>tasks done</div>
        </div>
        <p className="task-notes">Last backup: {s.last_backup || "none yet"}</p>
        <p className="task-notes">Server time: {when(s.server_time)}</p>
      </div>

      <div className="card">
        <h1>Settings ⚙️</h1>
        <form onSubmit={saveSettings}>
          <label>App name</label>
          <input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} />
          <div className="grid2">
            <div>
              <label>Failed logins before lock</label>
              <input
                type="number"
                min="3"
                max="20"
                value={form.max_login_attempts}
                onChange={(e) => setForm({ ...form, max_login_attempts: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Lock time (minutes)</label>
              <input
                type="number"
                min="1"
                max="1440"
                value={form.lockout_minutes}
                onChange={(e) => setForm({ ...form, lockout_minutes: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Session length (minutes)</label>
              <input
                type="number"
                min="5"
                max="1440"
                value={form.session_minutes}
                onChange={(e) => setForm({ ...form, session_minutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={form.allow_registration}
              onChange={(e) => setForm({ ...form, allow_registration: e.target.checked })}
            />
            Allow people to register themselves
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.reminders_enabled}
              onChange={(e) => setForm({ ...form, reminders_enabled: e.target.checked })}
            />
            Reminders on
          </label>
          <button>Save settings</button>
        </form>
      </div>

      <div className="card">
        <h1>Backups 💾</h1>
        <p className="sub">Encrypted backups run every day automatically. You can also back up right now.</p>
        <button disabled={busy} onClick={backupNow}>
          {busy ? "Backing up..." : "Back up now"}
        </button>
        <ul className="plain">
          {sys.backups.map((b) => (
            <li key={b.name}>
              <code>{b.name}</code>
              <button className="small ghost" onClick={() => restore({ source: "backup", name: b.name }, b.name)}>
                Restore settings
              </button>
            </li>
          ))}
          {sys.backups.length === 0 && <li className="task-notes">No backups yet.</li>}
        </ul>
      </div>

      <div className="card">
        <h1>Restore points 🕘</h1>
        <p className="sub">
          A restore point saves the current settings only. Restoring one changes the configuration, never the users or
          tasks.
        </p>
        <input
          placeholder="Name (e.g. Before exams)"
          value={pointName}
          onChange={(e) => setPointName(e.target.value)}
          maxLength={60}
          aria-label="Restore point name"
        />
        <button onClick={createPoint}>Create restore point</button>
        <ul className="plain">
          {sys.restore_points.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.name}</strong>
                <div className="task-notes">{when(p.created_at)}</div>
              </span>
              <button className="small ghost" onClick={() => restore({ source: "point", id: p.id }, p.name)}>
                Restore
              </button>
            </li>
          ))}
          {sys.restore_points.length === 0 && <li className="task-notes">No restore points yet.</li>}
        </ul>
      </div>
    </div>
  );
}
