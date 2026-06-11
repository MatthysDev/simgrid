# simpit — Design

> **Nom :** `simpit` — l'outil qui te fait repartir vite, comme une équipe de stand (pit crew)
> en F1. Package npm = commande = `simpit` (nom libre confirmé sur npm le 2026-06-11).

**Date:** 2026-06-11
**Status:** Design validé, prêt pour le plan d'implémentation
**Auteur:** Matthys

## Problème

Travailler sur 4-5 projets Expo / React Native en parallèle est pénible : lancer un
projet ouvre un simulateur, souvent le mauvais ou celui d'un autre projet, et il faut
constamment alt-tab et jongler entre les fenêtres. On veut pouvoir voir plusieurs
projets tourner **en même temps, chacun sur son device**, sans gestion manuelle.

## Objectif

Un package npm open-source, CLI, **sans daemon**, qu'on câble dans le `start` script de
chaque projet. Au lancement, il affiche un petit picker interactif : quels devices sont
disponibles, lesquels ont déjà le dev build installé, quels projets tournent déjà et sur
quel device. On choisit un (ou plusieurs) device(s), il boot, alloue un port Metro libre,
lance le dev build (ou le compile s'il est absent), et enregistre la session pour que les
autres projets sachent ce qui est occupé.

## Non-objectifs (YAGNI v1)

- Daemon résident / dashboard temps réel
- UI web
- Contrôle bas niveau du simulateur (tap, swipe, streaming vidéo, screenshots) — c'est le
  domaine d'outils comme `baguette`/`idb`, voir « Prior art »
- Devices cloud / device farm distante
- Rebuild automatique au changement de code natif

## Approche retenue : registre persistant + réconciliation live

Chaque `bun start` est un process séparé, dans un projet différent. Pour afficher « quelle
app tourne sur quel simu », il faut un état partagé entre projets. Trois options ont été
évaluées :

- **A. Sondage live pur** — rien de stocké, on sonde le système à chaque run. Robuste mais
  relier un process Metro à un projet + un device précis est de l'heuristique fragile.
- **B. Registre persistant** (`~/.simpit/state.json`) — mapping exact et instantané, mais
  risque de données périmées si un process meurt brutalement.
- **C. Daemon background** — vue temps réel robuste mais install lourde, process résident :
  disqualifié pour de l'open-source distribuable (tue l'adoption, fait fuir les contributeurs).

**Décision : B + réconciliation A.** Le registre est la source de vérité (précis, instantané,
mémorise le dernier choix par projet) ; à chaque run, avant le picker, on réconcilie contre la
réalité (devices réellement bootés via `simctl`/`adb`, PID vivants) et on purge les entrées
fantômes. On obtient la précision de B, l'auto-réparation de A, **zéro daemon**, et une install
`npx` immédiate. C'est le meilleur compromis pour un package OSS distribué.

## Architecture

CLI Node unique, modules à responsabilité unique :

| Module | Rôle | Dépend de |
|---|---|---|
| `cli` | Entrée + parsing. Commandes : `start` (défaut), `init`, `status`, `stop` | tout |
| `project` | Lit `app.json` / `app.config.{js,ts}` → identité projet | fs |
| `devices` | Découverte par plateforme (adapters), normalise en type `Device` | simctl/adb |
| `registry` | Lit/écrit `~/.simpit/state.json`, réconcilie, mémorise le choix par projet | fs |
| `picker` | TUI multi-select, groupé par plateforme, tags + pré-sélection | prompts |
| `launcher` | Boot/clone device, alloue port, lance Metro + dev build / `expo run` | devices, ports |
| `ports` | Alloue un port Metro libre (évite ceux tenus par le registre) | net |

### Découpage volontaire

Chaque adapter de `devices` (ios-sim, android-emu, ios-device, android-device) est isolé
derrière une interface commune renvoyant un `Device` normalisé, pour pouvoir en tester
chacun indépendamment (avec des sorties `simctl`/`adb` mockées) et en ajouter sans toucher
au reste.

## Données

```ts
Device = {
  id: string,            // udid (iOS) / serial (adb) / nom d'AVD
  platform: 'ios-sim' | 'android-emu' | 'ios-device' | 'android-device',
  name: string,
  model: string,
  state: 'booted' | 'shutdown',
  hasBuild: boolean,     // dev build du projet déjà installé ?
}

Session = {
  projectPath: string,
  projectName: string,
  deviceId: string,
  deviceName: string,
  metroPort: number,
  pid: number,
  startedAt: string,
}

// ~/.simpit/state.json
State = {
  sessions: Session[],
  projectPrefs: { [projectPath: string]: { lastDeviceIds: string[] } },
}
```

## Data flow

```
project.resolve()
  → registry.load() + reconcile()        // purge PID morts / devices non bootés
  → devices.discover()                   // tous les adapters
  → annotate(devices)                    // hasBuild via listapps/pm, busy via registry
  → picker.show(devices, prefs)          // multi-select, pré-coche lastDeviceIds
  → pour chaque device choisi :
        launcher.launch(device, project)
          → boot/clone si besoin
          → ports.allocate()
          → si hasBuild : expo start --port N + deep-link dev-client
            sinon       : expo run:<platform> (compile + installe + ouvre)
          → registry.register(session)
  → à la sortie : registry.deregister(session)
```

## Détection du build (feature clé)

- **iOS** : `xcrun simctl listapps <udid>` → présence de `iosBundleId`
- **Android** : `adb -s <serial> shell pm list packages` → présence de `androidPackage`
- Picker : devices avec `✅ build présent` triés **en premier** (lancement instantané),
  `⚙️ build à compiler` ensuite
- Device avec build : `expo start --port N` puis ouverture via deep-link
  `scheme://expo-development-client/?url=http%3A%2F%2Flocalhost%3AN` (`simctl openurl` /
  `adb shell am start`)
- Device sans build : enchaîne `expo run:ios` / `expo run:android` automatiquement

## Picker (exemple)

```
  simpit · projet « Yolgo »

  iOS Simulators
  › [x] iPhone 15            ✅ build présent
    [ ] iPhone 15 Pro        ✅ build présent · 🔴 occupé par « shoootin » :8082
    [ ] iPhone SE (3rd gen)  ⚙️ build à compiler
  Android
    [ ] Pixel 7 (emulator)   ✅ build présent
  Devices réels
    [ ] iPhone de Matthys    ✅ build présent

  ↑↓ naviguer · espace sélectionner · ⏎ lancer   (pré-coché = ton dernier choix)
```

Multi-select → un projet sur plusieurs devices d'un coup. Le tag `🔴 occupé` provient du
registre réconcilié.

## Cas « 2× iPhone 15 »

Un simulateur = un UDID unique, on ne peut pas booter deux fois le même device. Si on
sélectionne un modèle déjà occupé, l'outil propose de **cloner** l'instance via
`simctl create "iPhone 15 — simpit#2" <type> <runtime>`. Les clones sont taggés pour
réutilisation et nettoyage (`simpit stop` / housekeeping). Résultat : deux fenêtres
iPhone 15 distinctes, zéro conflit.

## Allocation des ports

Démarre à 8081 et incrémente, en évitant les ports tenus dans le registre et en sondant la
disponibilité réelle (TCP). Chaque session obtient un port stable tant qu'elle tourne.

## Distribution / install (OSS)

- Publié sur **npm** : `npx simpit` fonctionne sans installation
- `npx simpit init` : détecte le projet Expo + câble `"start": "simpit"` dans
  `package.json` (compatible bun/npm/pnpm/yarn — c'est juste un bin)
- Node pur, **deps minimales** (`execa` + lib de prompts type `@clack/prompts`) → cross-platform
  (macOS pour iOS, Linux/Windows pour Android) et facile à contribuer
- Licence MIT, repo GitHub, CI de publish

## Prior art — différence avec `baguette` (tddworks/baguette)

`baguette` et `simpit` opèrent à **deux étages complètement différents** :

| | **baguette** | **simpit** |
|---|---|---|
| Niveau | Contrôle bas niveau **d'un** simulateur | Orchestration haut niveau **de projets** |
| Question résolue | « comment piloter ce simulateur ? » | « quel projet lance-je, sur quel device ? » |
| Fait quoi | boot headless, tap/swipe, streaming 60fps, screenshots, caméra virtuelle, arbre d'accessibilité, logs | route un projet Expo → un device, gère Metro multi-projets, détecte le build installé, picker au lancement |
| Cible | iOS 26 uniquement, Apple Silicon, frameworks privés Xcode | iOS **+ Android** + devices réels, multi-plateforme |
| Stack / install | Swift, `brew install baguette` | Node, `npx simpit` |
| Conscient de tes projets ? | Non — agnostique du contenu | Oui — lit `app.json`, connaît tes builds et tes ports Metro |
| Daemon | Oui (`baguette serve`, web UI) | Non, par choix (adoption OSS) |

En résumé : **baguette pilote les pixels d'un simulateur** (c'est un successeur d'`idb`/`AXe`,
orienté automatisation / CI / agents qui conduisent une UI). **simpit orchestre ton workflow
multi-projets Expo** (quel dev build sur quel device, Metro et ports, état partagé entre projets).
Ils ne se marchent pas dessus — ils sont même **complémentaires** : on pourrait imaginer simpit
déléguer l'affichage headless à baguette en option. Le « farm dashboard » de baguette est le seul
point de contact visuel, mais il *affiche/contrôle* des simus, là où simpit *décide quel projet
va où* et gère le cycle build/Metro.

## Ouvertures v2 (hors scope)

- Mode « farm » : une vue agrégée de tous les projets simpit qui tournent
- Intégration optionnelle baguette pour affichage/contrôle headless
- Rebuild auto au changement de code natif
- Profils nommés (`simpit start --profile demo`) pour relancer un set de devices d'un coup
