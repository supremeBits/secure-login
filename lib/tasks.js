const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export const isDate = (s) => DATE.test(String(s || ""));

// Validates task input. partial=true means only check the fields that were sent.
export function parseTask(body, { partial = false } = {}) {
  const out = {};

  if ("title" in body || !partial) {
    const title = String(body.title || "").trim();
    if (!title || title.length > 200) return { error: "Title must be 1-200 characters." };
    out.title = title;
  }
  if ("notes" in body) {
    const notes = String(body.notes || "").trim();
    if (notes.length > 1000) return { error: "Notes are too long." };
    out.notes = notes || null;
  }
  if ("due_date" in body || !partial) {
    if (!isDate(body.due_date)) return { error: "Pick a valid date." };
    out.due_date = body.due_date;
  }
  if ("remind_time" in body) {
    const r = body.remind_time;
    if (r === "" || r == null) out.remind_time = null;
    else if (TIME.test(r)) out.remind_time = r;
    else return { error: "Invalid reminder time." };
  }
  if ("priority" in body) {
    if (!["low", "medium", "high"].includes(body.priority)) return { error: "Invalid priority." };
    out.priority = body.priority;
  }
  if ("category" in body) {
    const c = String(body.category || "").trim();
    if (c.length > 30) return { error: "Category is too long." };
    out.category = c || null;
  }
  if ("done" in body) {
    if (typeof body.done !== "boolean") return { error: "Invalid value." };
    out.done = body.done;
  }
  return { value: out };
}
