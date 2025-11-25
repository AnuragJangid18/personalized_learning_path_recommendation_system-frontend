# Personalized Learning Path — Mini Project

This repository contains a small full-stack application (backend + frontend) that demonstrates a personalized learning-path recommendation system with lightweight RL-like state, checkpoints, and user authentication.

Quick overview
- Backend: Node.js + Express (API endpoints for auth, students, progress, checkpoints, dashboard). Entry point: `backend/server.js`.
- Frontend: React + Vite (component-driven UI under `frontend/src`).
- Styling: TailwindCSS utilities with a small custom component layer in `frontend/src/index.css`.
- Utilities: `scripts/contrast-audit.js` — automated contrast checks for the light theme; `scripts/test-textlight-candidates.js` (used earlier for color tuning).

Recent updates (summary)
- Removed the in-app dark-mode toggle and related site-wide `.dark` variables; the app now uses a single light theme to avoid inconsistent styling.
- Reverted header styling to its original gradient with clear white text and unified Login/Register buttons.
- Checkpoint system enhanced: saving a checkpoint now stores the full learning context including `student`, `learningPath`, `completed`, `currentLesson`, `lesson`, RL algorithm state (`qState`) and RL log (`qlog`). Restoring a checkpoint fully restores that state client-side and attempts to sync progress with the backend.
- Contrast audit script simplified to only check the light theme (removed dark-mode parsing).
- Multiple components had `dark:` utilities removed and were tuned to use consistent light-mode classes.

Local setup (development)
1. Install root dependencies used by scripts (optional):

```powershell
# from project root
npm install
```

2. Backend

```powershell
cd backend
# install if needed
npm install
# start server (default port shown in server.js)
node server.js
```

3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (e.g. `http://localhost:5173` or `5174`) to view the app.

Notes & files of interest
- `frontend/src/App.jsx` — main app state and `snapshotProvider` / `handleRestore` (checkpoints integration).
- `frontend/src/components/CheckpointPanel.jsx` — UI for saving/restoring checkpoints; posts to `/checkpoint`.
- `frontend/src/components/Header.jsx` — header markup and auth links (now restored to the original styling).
- `frontend/src/index.css` — component variables and utility rules (light theme only).
- `scripts/contrast-audit.js` — runs a WCAG contrast check for configured color variable pairs and writes `scripts/contrast-report.json`.

Next steps / suggestions
- Run the backend and frontend locally and test Save/Restore with authenticated users.
- Optional: reintroduce a curated dark theme (centralized variables) if you want a theme toggle again — keep the toggle logic separate from per-component styling to avoid regressions.
- Expand backend checkpoint storage to persist RL internals server-side if you want cross-device resumes.

If you want, I can also: run the dev servers here, update the frontend README with the same summary, or add a short CHANGELOG file.

---
Generated/updated: November 19, 2025
