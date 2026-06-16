---
id: profiles
title: Profiles
---

# Profiles

A **profile** is a named set of devices you can relaunch in one shot — perfect for a demo setup,
a QA matrix, or your everyday trio of devices.

## Save one

Pass `--profile <name>` the first time. simgrid shows the picker, then saves your selection under
that name:

```bash
simgrid --profile demo
#   saved profile "demo" (2 device(s)) — replay it with: simgrid --profile demo
```

## Replay it

Run the same command again — no picker, it launches that exact set:

```bash
simgrid --profile demo
#   ▶ profile demo — iPhone 15, Pixel 7
```

If a profile's devices aren't available right now (unplugged, deleted), simgrid falls back to the
picker instead of failing.

## List them

```bash
simgrid profiles
```

```text
● demo → 2 device(s)
● qa   → 4 device(s)
```

## Where they live

Profiles are stored per project in the shared registry at `~/.simgrid/state.json`, under
`projectPrefs[<projectPath>].profiles`. They're plain JSON — device ids keyed by profile name.
