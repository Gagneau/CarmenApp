# Architecture Overview — CarmenApp

## 1. Project Type
CarmenApp is a **React Native app built with Expo**.  
It uses **TypeScript** and follows a modular structure for scalability and clarity.

---

## 2. Technology Stack
- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Navigation:** Expo Router (File-based routing)
- **UI:** React Native components (+ optional external libraries)
- **Package management:** npm
- **Version control:** Git + GitHub
- **Development environment:** VS Code + Expo Go for live testing

---

## 3. Folder Structure

CarmenApp/
│
├── app/ # App screens (Expo Router pages)
│ ├── index.tsx # Main entry screen
│ ├── (auth)/ # Auth flow screens (e.g., login, signup)
│ ├── (main)/ # Main app screens (e.g., home, profile)
│ └── ... # Other routes or layouts
│
├── components/ # Reusable UI components
├── constants/ # App-wide constants (colors, API URLs, etc.)
├── hooks/ # Custom React hooks
├── assets/images/ # Image and icon assets
├── scripts/ # Automation or build scripts
│
├── package.json # npm configuration and dependencies
├── tsconfig.json # TypeScript configuration
├── app.json # Expo configuration
├── .gitignore # Files and folders ignored by Git
├── README.md # Basic info for GitHub visitors
└── ARCHITECTURE.md # This document


---

## 4. Data Flow and Logic
- **Components** are small, reusable pieces of UI.
- **Screens** inside `app/` use components and hooks to build pages.
- **Hooks** contain business logic (fetching data, local state, etc.).
- **Constants** define configuration and shared variables.
- **Navigation** is automatic with Expo Router (file-based routes).

---

## 5. Build and Run
To start the app locally:
```bash
npm install
npx expo start


To run on a device (with Expo Go):

Scan the QR code shown in the terminal or in the Expo Dev Tools.

The app reloads automatically on file save.


6. Git Workflow

Main branch: main

Branch naming convention:

feat/feature-name → for new features

fix/bug-description → for bug fixes

chore/infra-task → for maintenance

Regular commits and pushes after each major change.

7. Notes

Environment variables stored in .env (not committed).

Build folders like /ios, /android, /dist, and /web-build are ignored in .gitignore.

Project uses Prettier and ESLint for formatting and linting.

8. Future Improvements

Add API layer for backend integration.

Introduce state management (Zustand or Redux Toolkit).

Improve design system for consistent UI components.