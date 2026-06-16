---
id: installation
title: Installation
---

# Installation

simgrid is published on npm as **`simgrid-cli`**. The installed command is **`simgrid`**.

```bash
npm i -g simgrid-cli
# or, one-off, without installing:
npx simgrid-cli
```

## Requirements

- **Node ≥ 18**
- **iOS simulators:** macOS + Xcode (provides `simctl`, `devicectl`)
- **Android emulators / devices:** Android SDK with `adb` and `emulator` on your `PATH`
- Your project should use an Expo [development build](https://docs.expo.dev/develop/development-builds/introduction/) (expo-dev-client), not Expo Go.

Check your toolchain at any time:

```bash
simgrid doctor
```

```text
✓ xcrun — iOS simulators & devices
✓ adb — Android devices & emulators
✓ emulator — offline Android emulators (AVDs)

All good — every tool simgrid needs is on your PATH.
```

## Package manager note

`simgrid init` rewrites your project's `start` script, so `npm start`, `yarn start`, `bun start`
and `pnpm start` all launch simgrid. Under the hood simgrid calls `npx expo …`, which resolves the
local `node_modules/.bin` regardless of which package manager installed your dependencies.

:::note
The one setup that breaks is **Yarn Berry in PnP mode** (no `node_modules`), where `npx expo`
cannot resolve. Classic `node_modules` layouts (npm, yarn classic, pnpm, bun) all work.
:::
