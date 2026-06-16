---
id: three-projects
title: Three projects in parallel
---

# Recipe: three projects in parallel

The mental model: **one project = one terminal tab = one Metro.** The shared registry lets each
project see what the others occupy (busy devices, taken ports).

## Setup (once)

```bash
cd ~/code/storefront && npx simgrid-cli init
cd ~/code/dashboard  && npx simgrid-cli init
cd ~/code/chat       && npx simgrid-cli init
```

## Tab 1 — Storefront on two iPhones

```text
~/code/storefront $ simgrid

  simgrid  Storefront
  iOS Simulators
  › [x] iPhone 15            ✅ build installed
    [x] iPhone SE (3rd gen)  ⚙️ will build

▶ Metro for Storefront on port 8081
  iPhone 15: dev client → localhost:8081 ✓
  iPhone SE (3rd gen): dev client → localhost:8081 ✓
✔ Storefront — Ctrl+C to stop
```

One Metro (`:8081`) for both iPhones. iPhone 15 launches instantly; iPhone SE is built once (simgrid
asks how, then remembers).

## Tab 2 — Dashboard on a Pixel

```text
~/code/dashboard $ simgrid

  iOS Simulators
    [ ] iPhone 15            ✅ build installed · 🔴 busy: Storefront :8081
  Android Emulators
  › [x] Pixel 7              ✅ build installed

▶ Metro for Dashboard on port 8082
  Pixel 7: dev client → localhost:8082 ✓
✔ Dashboard — Ctrl+C to stop
```

Note the `🔴 busy: Storefront :8081` tag — Dashboard sees iPhone 15 is taken, and its Metro takes the
next free port, `:8082`.

## Tab 3 — Chat on a busy sim → clone

```text
~/code/chat $ simgrid

  iOS Simulators
  › [x] iPhone 15            ✅ build installed · 🔴 busy: Storefront :8081

? iPhone 15 is busy with "Storefront". Clone a fresh iPhone 15 for Chat? › Yes

▶ Metro for Chat on port 8083
  iPhone 15 — simgrid: dev client → localhost:8083 ✓
✔ Chat — Ctrl+C to stop
```

Picking a busy simulator offers a **clone** (`iPhone 15 — simgrid`) — two windows of the same model,
zero conflict.

## The dashboard

```text
$ simgrid status
● Storefront → iPhone 15 (Metro :8081, pid 41201)
● Storefront → iPhone SE (3rd gen) (Metro :8081, pid 41201)
● Dashboard → Pixel 7 (Metro :8082, pid 41588)
● Chat → iPhone 15 — simgrid (Metro :8083, pid 41922)
```

Three projects, four devices, three Metros — all visible. If a process dies, `status` purges it
automatically (PID reconciliation).
