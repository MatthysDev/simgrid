---
id: logs
title: Logs
---

# Logs

Stream a running device's **system logs** without reopening Metro.

```bash
simgrid logs              # one session → straight to it; several → picker
simgrid logs "iPhone SE"  # match a device by name (or id)
```

Run it from the project directory — simgrid looks at that project's running sessions.

## What it runs

| Platform | Under the hood |
|---|---|
| iOS simulator | `xcrun simctl spawn <udid> log stream --level=debug --style=compact` (filtered to the app when its name is known) |
| Android emulator / device | `adb -s <serial> logcat` |
| Physical iOS device | *not supported yet* — see below |

<kbd>Ctrl</kbd>+<kbd>C</kbd> stops the stream; your app keeps running.

:::caution
Streaming the system log from a **physical iPhone/iPad** over USB isn't wired up yet — `simgrid logs`
covers iOS simulators and Android emulators/devices.
:::
