---
id: three-projects
title: Three projects in parallel
---

# Recipe: three projects in parallel

The mental model: **one project = one terminal tab = one Metro.** The shared registry lets each
project see what the others occupy (busy devices, taken ports).

## Setup (once)

```bash
cd ~/code/Yolgo    && npx simgrid-cli init
cd ~/code/shoootin && npx simgrid-cli init
cd ~/code/mdev2    && npx simgrid-cli init
```

## Tab 1 — Yolgo on two iPhones

```text
~/code/Yolgo $ simgrid

  simgrid  Yolgo
  iOS Simulators
  › [x] iPhone 15            ✅ build installed
    [x] iPhone SE (3rd gen)  ⚙️ will build

▶ Metro for Yolgo on port 8081
  iPhone 15: dev client → localhost:8081 ✓
  iPhone SE (3rd gen): dev client → localhost:8081 ✓
✔ Yolgo — Ctrl+C to stop
```

One Metro (`:8081`) for both iPhones. iPhone 15 launches instantly; iPhone SE is built once (simgrid
asks how, then remembers).

## Tab 2 — shoootin on a Pixel

```text
~/code/shoootin $ simgrid

  iOS Simulators
    [ ] iPhone 15            ✅ build installed · 🔴 busy: Yolgo :8081
  Android Emulators
  › [x] Pixel 7              ✅ build installed

▶ Metro for shoootin on port 8082
  Pixel 7: dev client → localhost:8082 ✓
✔ shoootin — Ctrl+C to stop
```

Note the `🔴 busy: Yolgo :8081` tag — shoootin sees iPhone 15 is taken, and its Metro takes the next
free port, `:8082`.

## Tab 3 — mdev2 on a busy sim → clone

```text
~/code/mdev2 $ simgrid

  iOS Simulators
  › [x] iPhone 15            ✅ build installed · 🔴 busy: Yolgo :8081

? iPhone 15 is busy with "Yolgo". Clone a fresh iPhone 15 for mdev2? › Yes

▶ Metro for mdev2 on port 8083
  iPhone 15 — simgrid: dev client → localhost:8083 ✓
✔ mdev2 — Ctrl+C to stop
```

Picking a busy simulator offers a **clone** (`iPhone 15 — simgrid`) — two windows of the same model,
zero conflict.

## The dashboard

```text
$ simgrid status
● Yolgo → iPhone 15 (Metro :8081, pid 41201)
● Yolgo → iPhone SE (3rd gen) (Metro :8081, pid 41201)
● shoootin → Pixel 7 (Metro :8082, pid 41588)
● mdev2 → iPhone 15 — simgrid (Metro :8083, pid 41922)
```

Three projects, four devices, three Metros — all visible. If a process dies, `status` purges it
automatically (PID reconciliation).
