export const ROLES = ["admin", "manager", "staff", "viewer"];

// Who can do what
export const EDITOR_ROLES = ["admin", "manager", "staff"]; // can add/edit/delete their own tasks
export const TEAM_ROLES = ["admin", "manager"];            // can view everyone's tasks (read-only)
export const ADMIN_ROLES = ["admin"];                      // manage users, settings, backups, restore
