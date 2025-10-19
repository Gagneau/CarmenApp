Family Incentives App — Summary Requirements & Architecture
1) Purpose & Objectives
A lightweight family app that incentivizes good habits and tracks rewards (time and/or money) for children. Adults record tasks completed; the system aggregates pending rewards, lets the family choose whether each task converts to screen-time or cash, and allows an admin to confirm payouts with a clear history. The solution favors clarity, portability, and auditability over heavy infrastructure.
2) Personas & Roles
•	Child
o	Sees their current pending totals and payout history.
o	(Optional UX guard) Cannot submit tasks from the Form screen.
•	Adult
o	Submits tasks performed by the child.
o	Reviews pending totals and sets Time vs Money preferences per task.
•	Admin
o	Everything an Adult can do, plus:
o	Payout preview and confirmation.
o	Admin: Users management (create/update users; later: link adults ↔ children).
o	Admin: Tasks (planned): manage the task catalog.
3) Core User Journeys (end-to-end)
1.	Login → Tabs
User logs in (alias + password). Auth token is stored securely; the app routes to a tab bar: Form, Totals, History, and Payout (admin only).
2.	Record chores/tests (Form)
Adult selects quantities for defined tasks and submits. The app shows a “Submitted ✓” banner and resets quantities.
3.	Review & choose conversion (Totals & Toggles)
Pending totals per task are displayed. If a task has both time and money pending, the user chooses Time or Money for the next payout. Fixed tasks display “Fixed: Time/Money”.
4.	Payout (Admin)
Admin previews what would be paid now (chosen time/money by task) and confirms payout. Pending items clear; a history record is created.
5.	History
Shows past payouts (date/time, totals) with per-task line breakdown.
4) Data Model (Supabase/Postgres, summary)
•	app_user(id, display_name, role, password_hash, status)
•	adult_child_link(adult_id, child_id) (planned UI management)
•	task(id, code, name, category, time_reward, money_reward_eur, active, effective_from)
•	submission(id, child_id, adult_id, created_at)
•	submission_item(id, submission_id, task_id, quantity, time_minutes_awarded, money_awarded_eur, payout_id)
•	reward_preference(child_id, task_id, preference)
•	payout(id, child_id, approved_by_admin_id, approved_at, total_time_minutes, total_money_eur)
•	payout_item(id, payout_id, task_id, time_minutes, money_eur)
•	session_token(user_id, token, expires_at) for app auth
Principle: submissions snapshot task values at submit time; editing tasks later does not mutate history.
5) Backend API (n8n webhooks)
All endpoints are token-authenticated; admin routes include a role gate.
Core
•	POST /api/auth/login → { token, user:{id, role, display_name}, expires_at }
•	GET /api/tasks → task catalog
•	POST /api/submissions → { adult_id, child_id, items:[{ task_code, quantity }] } → totals for that submission
•	GET /api/totals?child_id=… → pending totals per task (not yet paid)
•	POST /api/preferences → { child_id, task_code, preference:'TIME'|'MONEY' }
•	GET /api/payout/preview?child_id=… (admin) → chosen lines + totals
•	POST /api/payout/confirm (admin) → creates payout, marks pending paid
•	GET /api/history?child_id=… → payouts newest first with per-task lines
Admin · Users
•	GET /api/admin/users → list users
•	POST /api/admin/users/create → create user (duplicate → 409)
•	POST /api/admin/users/update → update role/status/display_name/password (validation; duplicate → 409)
•	(Next) POST /api/admin/links/set → set adult ↔ child associations
Admin · Tasks (planned)
•	GET /api/admin/tasks
•	POST /api/admin/tasks/create
•	POST /api/admin/tasks/update
•	POST /api/admin/tasks/archive
6) Front-end (Expo, React Native) — Key Behaviors
•	Auth state: token + user stored; auto-restore on launch; logout clears both.
•	Light theme and readable inputs enforced across screens.
•	Auto-refresh: screens refetch on tab focus and after any write via a global DataProvider.invalidate() signal (e.g., after Form submit / Toggle change / Payout confirm).
•	Child selection: a simple selector (adult/admin) controls which child_id is used across Form/Totals/Payout/History. (Child role does not see the picker.)
•	Success/Error banners: auto-dismiss after a few seconds; clear on tab blur so no stale banners reappear.
•	Web storage: uses SecureStore on device, localStorage fallback on web, so login works in both environments.
7) Permissions & Scope (current + planned)
•	Payout: admin-only (front-end guard + back-end role gate).
•	Form: adults/admin submit; child can be shown a read-only notice (front-end guard — optional now, planned polish).
•	Totals/History: viewable by all roles.
Scope (planned): child sees only self; adult sees linked children; admin sees any. Optional n8n enforcement using adult_child_link.
8) Admin Screens
•	Admin → Users (in progress)
o	List users with Refresh.
o	Create user (alias, role, temp password), duplicate-safe, optimistic UI.
o	Update user (role/status/reset password). (Backend done; UI next.)
o	Manage Adult ↔ Child links. (Next)
•	Admin → Tasks (planned)
o	Edit task catalog: name, category, time_reward, money_reward_eur, active.
o	Create/Archive tasks.
o	(Optional) effective_from for forward-only changes.
9) Non-Functional
•	Simplicity: n8n flows are small and explicit; Postgres used directly.
•	Resilience: server responses normalize types to avoid number/string quirks.
•	Security posture (MVP): plain passwords (to be upgraded); tokens expire; HTTPS; admin role gates for sensitive endpoints. Next step options: bcrypt in n8n or Supabase Auth.
•	Observability: app logs to DevTools; n8n Executions show each run; curl recipes for verification.
10) Testing & Diagnostics (practical)
•	DevTools → Network: verify 200s and response bodies (app uses /webhook/... Production URLs; flows must be Activated).
•	curl: test endpoints with headers and bodies; confirms 200/409/401/403 and exact JSON.
•	n8n Executions: inspect inputs/outputs; check branches (401/403/409 vs success).
•	DB sanity (Supabase SQL): quick selects for app_user, task, payout tables.
11) Open Items / Next Milestones
•	Admin → Users: Edit UI (role pills, status toggle, reset password modal; optimistic updates, rollback on error).
•	Admin → Users: Links UI (choose which children an adult manages) + back-end admin.links.set.
•	Admin → Tasks UI and flows.
•	Scope polish (front/back): enforce adult-child links in submissions/totals/history.
•	Release prep: icons, splash, app name; EAS builds and TestFlight.
 
Working Definition of Done (MVP)
•	Adults can record tasks for a child; totals update; admin can preview & confirm; history shows the payout; admin can add/edit users; basic child selection works. The app refreshes predictably and respects roles. Admin can manage the system without touching the database or n8n directly.
If you want, we can proceed with Admin → Users (Edit UI) next, or switch to Admin → Tasks depending on which you want to test first.

