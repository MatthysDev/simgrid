---
id: commands
title: Commands
---

# Commands

| Command | Description |
|---|---|
| `simgrid` | Interactive picker, then launch — the default. |
| `simgrid --profile <name>` | Launch a saved device set; saved automatically the first time you use a name. |
| `simgrid init` | Wire `"start": "simgrid"` into this project's `package.json`. |
| `simgrid status` | Show which project runs on which device (global). |
| `simgrid logs [device]` | Stream a running device's system logs; picker when several run. |
| `simgrid profiles` | List saved device profiles for this project. |
| `simgrid doctor` | Check `xcrun` / `adb` / `emulator` on your PATH, with install hints. |
| `simgrid stop` | Stop this project's sessions and deregister them. |
| `simgrid help` | Print usage. |

:::tip
`simgrid status` is **global** — run it from anywhere. Everything else (`logs`, `profiles`,
`stop`, `init`, launching) acts on the project in your **current directory**.
:::

## `simgrid`

The default. Resolves the project from `app.json` / `app.config.ts`, discovers every device,
annotates each (build installed? busy?), shows the picker, then boots + launches your selection.
One Metro is started per project and reused across all its devices. Runs in the foreground —
<kbd>Ctrl</kbd>+<kbd>C</kbd> stops it.

## `simgrid --profile <name>`

Skip the picker and relaunch a remembered set of devices. The first time you use a new name it
falls back to the picker and saves your choice under that name. See [Profiles](./guides/profiles.md).

## `simgrid init`

Sets `"start": "simgrid"` in `package.json`. The previous `start` script is preserved as
`start:orig`, so nothing is lost.

## `simgrid status`

Lists every running session across all projects: project → device, Metro port, PID. Dead sessions
(crash, `kill -9`) are reconciled away automatically.

## `simgrid logs [device]`

Streams a running device's system logs. With several sessions you get a picker; pass a device name
to target one directly. See [Logs](./guides/logs.md).

## `simgrid doctor`

Verifies `xcrun`, `adb` and `emulator` are on your `PATH` and prints install hints for whatever is
missing. See [Doctor](./guides/doctor.md).

## `simgrid stop`

Signals this project's sessions to stop and removes them from the registry.
