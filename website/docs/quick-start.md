---
id: quick-start
title: Quick start
---

# Quick start

## 1. Wire it into a project (optional)

```bash
cd my-expo-app
npx simgrid-cli init
```

This rewrites `package.json` so `"start": "simgrid"` (your previous script is kept as `start:orig`).
From now on `npm start` launches simgrid.

## 2. Launch

```bash
simgrid        # or: npm start
```

simgrid shows an interactive picker:

```text
  simgrid  Storefront

  iOS Simulators
  › [x] iPhone 15            ✅ build installed
    [ ] iPhone 15 Pro        ✅ build installed · 🔴 busy: Dashboard :8082
    [ ] iPhone SE (3rd gen)  ⚙️ will build
  Android Emulators
    [ ] Pixel 7              ✅ build installed

  ↑↓ navigate · space select · ⏎ launch   (pre-checked = your last pick)
```

Pick one or more devices and press <kbd>Enter</kbd>. simgrid boots them, starts a single Metro for
the project, and deep-links the dev client on each device:

```text
▶ Metro for Storefront on port 8081
  iPhone 15: dev client → localhost:8081 ✓
✔ Storefront — Ctrl+C to stop
```

## 3. Manage it

```bash
simgrid status     # who runs where, across all projects
simgrid logs       # stream a device's logs
simgrid stop       # stop this project's sessions
```

Next: run [three projects in parallel](./recipes/three-projects.md).
