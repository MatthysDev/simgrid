---
id: intro
title: Introduction
slug: /intro
---

# simgrid

**One grid for all your simulators — run multiple Expo projects on multiple devices, in parallel, without the alt-tab dance.**

Working on several Expo / React Native apps at once is painful. Launch one and it grabs whichever
simulator it feels like — often the wrong one, or one already claimed by another project. You end up
alt-tabbing between windows, killing and restarting Metro, resolving port conflicts by hand, and
losing track of which app runs where.

**simgrid solves this at the device layer.** It knows which simulators and emulators exist, which
already have your dev build installed, which are busy with another project, and it routes each
project to the right device automatically.

```bash
npm i -g simgrid-cli   # the command is "simgrid"
simgrid                # pick devices, then launch
```

## What you get

- 🎛️ **Interactive picker** across iOS simulators, Android emulators and physical devices.
- 🚀 **Parallel launch** — one project on many devices, **one Metro per project**, reused across them.
- 🔍 **Dev-build detection** per device: instant launch when installed, managed build otherwise.
- 🔌 **No port conflicts** — a free Metro port per project, dev-client deep-linked automatically.
- 🧭 **Shared, self-healing registry** that tracks every session and survives `kill -9`.
- 📋 **`logs` · `doctor` · `profiles`** for everyday work.

No daemon. No config file. Just a CLI.

## Where to next

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Commands reference](./commands.md)
- [Recipe: three projects in parallel](./recipes/three-projects.md)
