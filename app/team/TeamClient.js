"use client";
import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  return toDateStr(new Date(y, m - 1, d + n));
};

export default function TeamClient() {
  const [date, setDate] = useState("");
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    setDate(toDateStr(new Date()));
  }, []);

  useEffect(() => {
    if (!date) return;
    (async () => {
      const res = await fetch(`/api/team/tasks?date=${date}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGroups(data.groups);
        setError("");
      } else setError(data.error || "Could not load the team's tasks.");
    })();
  }, [date]);

  if (!date) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h1>Team tasks 👥</h1>
      <p className="sub">Read-only view of everyone&apos;s tasks for one day.</p>
      <div className="datebar">
        <button className="small ghost" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          ◀
        </button>
        <div className="datebar-mid">
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

      {error && <div className="error">{error}</div>}

      {groups.map(({ user, tasks }) => {
        const done = tasks.filter((t) => t.done).length;
        return (
          <section key={user.id} className="group">
            <h2>
              {user.username} <span className="badge">{user.role}</span>
              {user.deleted_at && <span className="chip p-high">deleted</span>}
              {!user.deleted_at && user.status === "disabled" && <span className="chip p-high">disabled</span>}
            </h2>
            <p className="task-notes">
              {tasks.length === 0 ? "No tasks" : `${done} of ${tasks.length} done`}
            </p>
            <ul className="tasklist">
              {tasks.map((t) => (
                <li key={t.id} className={"task" + (t.done ? " done" : "")}>
                  <span aria-hidden="true">{t.done ? "✅" : "⬜"}</span>
                  <div className="task-body">
                    <div className="task-title">{t.title}</div>
                    <div className="chips">
                      <span className={"chip p-" + t.priority}>{t.priority}</span>
                      {t.category && <span className="chip">{t.category}</span>}
                      {t.remind_time && <span className="chip">⏰ {t.remind_time.slice(0, 5)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
