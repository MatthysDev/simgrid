---
id: doctor
title: Doctor
---

# Doctor

`simgrid doctor` checks that the external tools simgrid drives are on your `PATH`, and tells you
how to install whatever is missing.

```bash
simgrid doctor
```

```text
✓ xcrun — iOS simulators & devices
✗ adb — Android devices & emulators

Missing:
  adb: Install Android SDK platform-tools and add them to your PATH
```

## Tools checked

| Tool | Used for |
|---|---|
| `xcrun` | iOS simulators & devices (ships with Xcode) |
| `adb` | Android devices & emulators (Android SDK platform-tools) |
| `emulator` | offline Android emulators / AVDs (Android SDK emulator) |

A short version of this check also runs as a **pre-flight at startup**: if a tool is missing, you
get a one-line warning pointing you to `simgrid doctor`, but launching is never blocked — simgrid
just works with whatever platforms are available.
