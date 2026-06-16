---
id: how-it-works
title: How it works
---

# How it works

```text
1. Read project identity (app.json / app.config.ts → name, scheme, bundle ID)
2. Load the shared registry (~/.simgrid/state.json) and reconcile it against
   reality — sessions whose Metro process is no longer alive are dropped
3. Discover all simulators / emulators / physical devices
4. Annotate each device: dev build installed? busy with another project?
5. Show the picker (pre-checked = your last choice for this project)
6. For each selected device:
     a. Boot / clone if needed
     b. Allocate a free Metro port (one per project, reused across devices)
     c. Start Metro (expo start --port N) — or reuse the running one
     d. Deep-link the dev client (or expo run:<platform> if no build yet)
7. Register the session; deregister cleanly on Ctrl-C or Metro exit
```

## One Metro per project

Every device you select for a project connects to the **same** Metro instance. simgrid allocates the
first free port from `8081` upward and reuses it when you re-run the project.

## The shared registry

`~/.simgrid/state.json` tracks which project runs on which device, the Metro port, and the process
PID. Every run **reconciles** the registry by checking live PIDs before showing the picker, so
sessions whose process has exited are dropped automatically. This is how a `kill -9` self-heals and
how cross-project `🔴 busy` tags stay accurate. No daemon required.

## Managed builds

If a device has no dev build, simgrid asks **once** how to build (a `package.json` script that runs
`expo run:<platform>`, the `npx expo run` default, or a custom command), remembers the answer per
project + platform, and rebuilds automatically next time. A build that fails forgets the command, so
you're asked again rather than retrying a broken one.
