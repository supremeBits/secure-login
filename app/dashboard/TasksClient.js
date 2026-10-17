"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
};
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const pretty = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

async function api(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

const EMPTY = { title: "", notes: "", priority: "medium", category: "", remind_time: "" };

export default function TasksClient({ canEdit, remindersEnabled }) {
  const [date, setDate] = useState("");
  const [todayStr, setTodayStr] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState("");
  const [due, setDue] = useState([]);
  const [notifPerm, setNotifPerm] = useState("default");
  const alerted = useRef(new Set());

  useEffect(() => {
    const t = toDateStr(new Date());
    setTodayStr(t);
    setDate(t);
    if (typeof Notification !== "undefined") setNotifPerm(Notification.permission);
  }, []);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    const { ok, data } = await api(`/api/tasks?date=${date}`);
    if (ok) setTasks(data.tasks);
    else setError(data.error || "Could not load tasks.");
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  // Reminders: check every 30 seconds while the app is open
  useEffect(() => {
    if (!remindersEnabled || !date) return;
    const check = () => {
      if (date !== toDateStr(new Date())) {
        setDue([]);
        return;
      }
      const now = nowTime();
      const dueNow = tasks.filter((t) => !t.done && t.remind_time && t.remind_time.slice(0, 5) <= now);
      setDue(dueNow);
      dueNow.forEach((t) => {
        if (alerted.current.has(t.id)) return;
        alerted.current.add(t.id);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Reminder", { body: t.title });
        }
      });
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [tasks, date, remindersEnabled]);

  async function enableNotifications() {
    if (typeof Notification === "undefined") return;
    setNotifPerm(await Notification.requestPermission());
  }

  async function add(e) {
    e.preventDefault();
    setError("");
    const { ok, data } = await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ ...form, due_date: date }),
    });
    if (!ok) return setError(data.error || "Could not add the task.");
    setForm(EMPTY);
    load();
  }

  async function toggle(t) {
    setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)));
    const { ok, data } = await api(`/api/tasks/${t.id}`, {
      method: "PATCH",
      body: JSON.stringify({ done: !t.done }),
    });
    if (!ok) setError(data.error || "Could not update the task.");
    load();
  }

  function startEdit(t) {
    setEditingId(t.id);
    setDraft({
      title: t.title,
      notes: t.notes || "",
      priority: t.priority,
      category: t.category || "",
      remind_time: t.remind_time ? t.remind_time.slice(0, 5) : "",
    });
  }

  async function saveEdit() {
    setError("");
    const { ok, data } = await api(`/api/tasks/${editingId}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    });
    if (!ok) return setError(data.error || "Could not save the task.");
    setEditingId(null);
    alerted.current.delete(editingId);
    load();
  }

  async function remove(t) {
    if (!window.confirm("Delete this task?")) return;
    const { ok, data } = await api(`/api/tasks/${t.id}`, { method: "DELETE" });
    if (!ok) return setError(data.error || "Could not delete the task.");
    load();
  }

  async function carryOver() {
    const { ok, data } = await api("/api/tasks/carry-over", {
      method: "POST",
      body: JSON.stringify({ from: addDays(date, -1), to: date }),
    });
    if (!ok) return setError(data.error || "Could not move the tasks.");
    setError("");
    load();
    if (data.moved === 0) setError("Nothing to carry over from yesterday.");
  }

  if (!date) return <div className="card">Loading...</div>;

  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div>
      {due.length > 0 && (
        <div className="alert" role="alert">
          ⏰ <strong>Reminder:</strong> {due.map((t) => t.title).join(", ")}
        </div>
      )}

      <div className="card">
        <div className="datebar">
          <button className="small ghost" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            ◀
          </button>
          <div className="datebar-mid">
            <h1>{pretty(date)}</h1>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Choose a day"
            />
          </div>
          <button className="small ghost" onClick={() => setDate(addDays(date, 1))} aria-label="Next day">
            ▶
          </button>
        </div>

        <div className="bar" aria-label={`${pct}% done`}>
          <div className="bar-fill" style={{ width: pct + "%" }} />
        </div>
        <p className="sub">
          {doneCount} of {tasks.length} done{" "}
          {date !== todayStr && (
            <button className="link small" onClick={() => setDate(todayStr)}>
              Back to today
            </button>
          )}
        </p>

        <div className="toolbar">
          {canEdit && (
            <button className="small ghost" onClick={carryOver}>
              Carry over yesterday&apos;s unfinished
            </button>
          )}
          {remindersEnabled && notifPerm === "default" && (
            <button className="small ghost" onClick={enableNotifications}>
              Turn on notifications
            </button>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        {!canEdit && (
          <p className="notice">You have a read-only (viewer) account, so you can look but not change tasks.</p>
        )}

        {canEdit && (
          <form onSubmit={add} className="addform">
            <input
              placeholder="What do you need to do?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={200}
              required
              aria-label="Task title"
            />
            <input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              aria-label="Notes"
            />
            <div className="row3">
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                aria-label="Priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input
                placeholder="Category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                maxLength={30}
                aria-label="Category"
              />
              <input
                type="time"
                value={form.remind_time}
                onChange={(e) => setForm({ ...form, remind_time: e.target.value })}
                aria-label="Reminder time"
              />
            </div>
            <button>Add task</button>
          </form>
        )}

        {loading ? (
          <p className="sub">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="sub">Nothing planned for this day yet. 🌱</p>
        ) : (
          <ul className="tasklist">
            {tasks.map((t) => (
              <li key={t.id} className={"task" + (t.done ? " done" : "")}>
                <input
                  type="checkbox"
                  checked={t.done}
                  disabled={!canEdit}
                  onChange={() => toggle(t)}
                  aria-label={`Mark "${t.title}" as done`}
                />
                <div className="task-body">
                  {editingId === t.id ? (
                    <div className="editform">
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        maxLength={200}
                        aria-label="Task title"
                      />
                      <input
                        value={draft.notes}
                        placeholder="Notes"
                        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                        aria-label="Notes"
                      />
                      <div className="row3">
                        <select
                          value={draft.priority}
                          onChange={(e) => setDraft({ ...draft, priority: e.target.value })}
                          aria-label="Priority"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <input
                          value={draft.category}
                          placeholder="Category"
                          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                          aria-label="Category"
                        />
                        <input
                          type="time"
                          value={draft.remind_time}
                          onChange={(e) => setDraft({ ...draft, remind_time: e.target.value })}
                          aria-label="Reminder time"
                        />
                      </div>
                      <div className="task-actions">
                        <button className="small" onClick={saveEdit}>
                          Save
                        </button>
                        <button className="small ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="task-title">{t.title}</div>
                      {t.notes && <div className="task-notes">{t.notes}</div>}
                      <div className="chips">
                        <span className={"chip p-" + t.priority}>{t.priority}</span>
                        {t.category && <span className="chip">{t.category}</span>}
                        {t.remind_time && <span className="chip">⏰ {t.remind_time.slice(0, 5)}</span>}
                      </div>
                    </>
                  )}
                </div>
                {canEdit && editingId !== t.id && (
                  <div className="task-actions">
                    <button className="small ghost" onClick={() => startEdit(t)}>
                      Edit
                    </button>
                    <button className="small danger" onClick={() => remove(t)}>
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
