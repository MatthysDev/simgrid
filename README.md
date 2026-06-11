# simpit

**Pit crew for your simulators — run multiple Expo projects on multiple devices, in parallel, without the alt-tab dance.**

---

## The problem

Working on several Expo / React Native projects at the same time is painful. Launch one project and it grabs whichever simulator it feels like — often the wrong one, or one already claimed by another project. You end up alt-tabbing between windows, killing and restarting Metro, resolving port conflicts by hand, and losing track of which app is running where.

simpit solves this at the device layer: it knows which simulators and emulators exist, which ones already have your dev build installed, which ones are busy with another project, and it routes each project to the right device automatically.

---

## Quick start

```bash
# Wire simpit into one project (rewrites package.json "start" to "simpit")
npx simpit init

# Then start the project the usual way
npm start
# or
bun start

# Or run without init — works directly
npx simpit
```

On first run simpit shows an interactive picker. Pick one or more devices, and it handles everything: booting, Metro, deep-linking the dev client.

---

## How it works

```
1. Read project identity (app.json / app.config.ts → name, scheme, bundle ID)
2. Load shared registry (~/.simpit/state.json) and reconcile against reality
   (dead PIDs and offline devices are purged automatically)
3. Discover all simulators / emulators / physical devices
4. Annotate each device: dev build installed? busy with another project?
5. Show the interactive picker (pre-checked = your last choice for this project)
6. For each selected device:
     a. Boot / clone if needed
     b. Allocate a free Metro port (one port per project, reused across devices)
     c. Start Metro (expo start --port N) — or reuse the already-running one
     d. Deep-link the dev client: scheme://expo-development-client/?url=http://localhost:N
        (or run expo run:<platform> --port N --device <id> if no build is installed yet)
7. Register the session; deregister cleanly on Ctrl-C or Metro exit
```

### Picker

```
  simpit · project "Yolgo"

  iOS Simulators
  › [x] iPhone 15            ✅ build present
    [ ] iPhone 15 Pro        ✅ build present · 🔴 busy with "shoootin" :8082
    [ ] iPhone SE (3rd gen)  ⚙️  will build
  Android
    [ ] Pixel 7 (emulator)   ✅ build present
  Physical devices
    [ ] Matthys's iPhone     ✅ build present

  ↑↓ navigate · space select · ⏎ launch   (pre-checked = your last pick)
```

Multi-select is supported — launch the same project on several devices at once. The `🔴 busy` tag comes from the reconciled registry. Devices with a build already installed are listed first for instant launch.

### Shared registry

`~/.simpit/state.json` tracks which project runs on which device, the Metro port, and the process PID. Every simpit run reconciles the registry against live system state before showing the picker, so stale entries (crashed processes, rebooted devices) are cleaned up automatically. No daemon required.

---

## Commands

| Command | Description |
|---|---|
| `simpit` / `simpit start` | Interactive picker, then launch |
| `simpit init` | Wire `"start": "simpit"` into this project's `package.json` |
| `simpit status` | Show which project is running on which device |
| `simpit stop` | Stop this project's sessions and deregister them |

---

## Requirements

- **Node ≥ 18**
- **iOS simulators:** macOS + Xcode (provides `simctl`, `devicectl`)
- **Android emulators / devices:** Android SDK with `adb` and `emulator` in `PATH`
- **Your project must use an Expo dev build** (expo-dev-client), not Expo Go — see [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

---

## Known limitations (v1)

- **iOS physical devices — no build detection.** `hasBuild` is always false for physical iPhones/iPads because there is no cheap equivalent of `simctl listapps` over USB. Launch always goes through `expo run:ios --device`, which installs if needed.
- **Paired-but-disconnected iPhones are listed.** simpit hides only devices where `tunnelState: unavailable`; a paired iPhone that is simply unplugged still appears and will connect on demand when launched.
- **Offline AVDs show "⚙️ will build".** Build detection (`pm list packages`) requires a booted device, so a shutdown AVD always shows as needing a build even if it already has one. It will fast-launch after the first boot.
- **Busy iOS simulator → clone; cleanup is manual.** When you pick a simulator that another project is already using, simpit offers to clone it (`simctl create "iPhone 15 — simpit"`). Clones persist after the session; delete them manually in Simulator.app or with `xcrun simctl delete <udid>`. Automated cleanup is planned for v2.
- **`expo run` port handoff requires Expo SDK ≥ 51.** simpit passes `--port` to `expo run:<platform>` so the freshly built app connects to the already-running Metro. The `--no-bundler` flag (broken since SDK 51) is never used.

---

## simpit vs baguette

[baguette](https://github.com/tddworks/baguette) and simpit operate at two completely different levels and are complementary.

**baguette** is a low-level simulator control tool: it boots a simulator headlessly, drives it with tap/swipe/screenshot, streams video at 60fps, inspects the accessibility tree, and exposes a web UI. It targets iOS only (Apple Silicon / Xcode private frameworks) and runs a resident daemon (`baguette serve`). Think of it as a successor to `idb`/`AXe`, oriented toward automation, CI, and agents that need to *drive* a UI.

**simpit** operates one layer above: it asks "which project goes to which device?". It reads your `app.json`, detects installed dev builds across iOS and Android, manages Metro ports across multiple projects, and deep-links the Expo dev client. It is daemonless by design (better for open-source adoption) and works across iOS simulators, Android emulators, and physical devices.

Use baguette to control what happens *inside* a simulator; use simpit to decide *which simulator runs what*.

---

## Contributing

Contributions are welcome. The codebase is vanilla TypeScript (ESM, Node ≥ 18), with no framework. Each device adapter (`src/devices/ios-sim.ts`, `android.ts`, `ios-device.ts`) is isolated behind a common interface, making it straightforward to add a new platform or mock an existing one for testing. Run `npm test` / `bun test` for the test suite.

---

## License

MIT — see [LICENSE](LICENSE).
