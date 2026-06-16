---
id: faq
title: FAQ
---

# FAQ

### Why is the npm package called `simgrid-cli` but the command `simgrid`?

The bare name `simgrid` is blocked on npm (too similar to an existing `sim-grid` package), so the
package is published as **`simgrid-cli`**. The binary it installs is still **`simgrid`**.

### Does it work with bun / yarn / pnpm?

Yes. `simgrid init` rewrites the `start` script, so any package manager's `start` runs it. Internally
simgrid calls `npx expo …`, which resolves your local `node_modules/.bin` no matter who installed it.
The only setup that breaks is **Yarn Berry PnP** (no `node_modules`).

### Do I need Expo Go or a dev build?

A **development build** (expo-dev-client). simgrid deep-links the dev client; if `expo-dev-client`
is missing it offers to install it, otherwise Metro runs in Expo Go mode.

### Is there a background daemon?

No. simgrid is daemonless — a shared JSON registry plus live PID checks. Nothing keeps running
between commands except your Metro processes.

### iOS physical device limitations?

Build detection isn't available over USB, so launch always goes through `expo run:ios --device`
(which installs if needed). Streaming logs from a physical iOS device isn't supported yet.

### Busy simulator clones — are they cleaned up?

Not automatically. When you launch on a simulator another project is using, simgrid offers to clone
it (`iPhone 15 — simgrid`). Clones persist; delete them in Simulator.app or with
`xcrun simctl delete <udid>`.

### Where is state stored?

`~/.simgrid/state.json` — running sessions, per-project last device choice, remembered build
commands, and saved profiles.
