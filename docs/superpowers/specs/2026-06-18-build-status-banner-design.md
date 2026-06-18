# Design — Banner ASCII + détection « build installé / outdated »

Date: 2026-06-18
Statut: validé (brainstorming)

## Objectif

Deux améliorations du CLI `simgrid` :

1. **Banner ASCII** affiché au lancement de `simgrid` (commande `start`), à la
   place du petit badge actuel.
2. **Statut de build par device, visible dans le picker sans booter le device** :
   - le dev build est-il installé ?
   - est-il *outdated* ? Deux signaux combinés :
     - **natif** : les dépendances natives ont-elles changé depuis le build
       (signal « il faut rebuild ») via Expo Fingerprint ;
     - **version** : la version baked dans l'app vs `app.json`.

## Décisions de design (issues du brainstorming)

- « Outdated » = **fingerprint natif + version app.json combinés**.
- Le fingerprint du build installé est **mémorisé par simgrid au moment du build**
  (dans `~/.simgrid/state.json`), recalculé au lancement et comparé. Un build
  installé hors simgrid n'a pas de baseline → statut `native: untracked`.
- Le calcul fingerprint (~1-3s) se fait **derrière un spinner `checking builds…`
  après la découverte des devices et avant le picker**. Dégradation gracieuse
  (timeout / erreur → `untracked`, jamais bloquant).
- Banner ASCII **hardcodé** dans `ui.ts`, **sans nouvelle dépendance** (pas de
  `figlet`). On garde les 3 deps actuelles.

## Section 1 — Banner ASCII

`src/ui.ts` : `banner()` renvoie un ASCII art multi-lignes coloré (picocolors),
avec version et tagline. Hardcodé (template string). Utilisé tel quel par
`start()` qui l'imprime déjà via `console.log(\`\n${banner()}\n\`)`.

- Pas de changement de signature.
- Style retenu au moment du code (2-3 variantes proposées). Largeur ≤ ~60 cols
  pour rester lisible dans un terminal standard.
- Tests `ui.test.ts` : le banner contient `simgrid`, la version, et aucune ligne
  ne dépasse 60 colonnes (hors codes couleur).

## Section 2 — Statut de build

### 2.1 Nouveau type de statut

`src/devices/types.ts` — enrichir `Device` :

```ts
export type BuildStatus =
  | 'absent'        // pas installé
  | 'up-to-date'    // installé, fingerprint match
  | 'rebuild'       // installé, fingerprint mismatch (natif a changé)
  | 'untracked'     // installé, pas de baseline simgrid (build externe / 1ère fois)
  | 'unknown'       // device éteint / non sondable (ex: Android shutdown)

export interface Device {
  // … champs existants …
  hasBuild: boolean            // conservé (rétro-compat picker/tri)
  buildStatus: BuildStatus     // nouveau
  installedVersion?: string    // ex "1.1.0 (42)" — lu de l'app si dispo
}
```

`hasBuild` reste la source du tri (`sortDevices`) et vaut `buildStatus !== 'absent' && !== 'unknown'`.

### 2.2 Module `src/fingerprint.ts` (nouveau)

Responsabilité unique : produire le fingerprint natif **courant** d'un projet.

```ts
export async function currentFingerprint(project: ProjectInfo): Promise<string | null>
```

- Résout `@expo/fingerprint` **dans le `node_modules` du projet cible** ; si
  présent, l'importe et appelle `createFingerprintAsync(project.path)` →
  `.hash`. Fallback : `npx --no-install @expo/fingerprint` dans `project.path`.
- Mémoïsé en mémoire pour la durée du run (un seul calcul par lancement).
- Timeout (ex 5s) et toute erreur → renvoie `null` (→ statut `untracked`).
- Aucune dépendance ajoutée à simgrid : on utilise celle du projet cible.

Tests `fingerprint.test.ts` : mock execa/import — succès, absence du package,
timeout, erreur → `null`.

### 2.3 Lecture de la version installée (sans baseline)

Dans les modules device existants :

- iOS (`devices/ios-sim.ts`) : on a déjà le chemin via
  `xcrun simctl get_app_container <udid> <bundleId> app` → lire
  `<container>/Info.plist` (`CFBundleShortVersionString`, `CFBundleVersion`)
  avec `plutil -convert json` ou `defaults read`. Renvoie `installedVersion`.
- Android (`devices/android.ts`) : `adb -s <serial> shell dumpsys package <pkg>`
  → parser `versionName` / `versionCode`. Nécessite émulateur booté (déjà la
  contrainte actuelle pour `hasAndroidBuild`).

Échec de lecture → `installedVersion` undefined (non bloquant).

### 2.4 Baseline fingerprint dans le registre

`src/registry.ts` — étendre `ProjectPref` :

```ts
export interface ProjectPref {
  lastDeviceIds: string[]
  buildCommands?: { ios?: string; android?: string }
  profiles?: Record<string, string[]>
  /** fingerprint natif enregistré au dernier build simgrid, par deviceId */
  builtFingerprints?: Record<string, { fingerprint: string; builtAt: string }>
}
```

- **Écriture** : après un build réussi déclenché par simgrid. `runBuild`
  (`launcher.ts`) ne connaît pas le projectPref ; on enregistre côté `start.ts`
  juste après l'appel `runBuild`, via `mutateState`, en stockant le fingerprint
  courant pour `(project.path, device.id)`. (Garde `runBuild` pur ; la
  persistance reste dans `start`.)
- **Lecture/comparaison** : à la découverte, pour chaque device installé, on
  compare `builtFingerprints[deviceId].fingerprint` au fingerprint courant :
  - pas d'entrée → `untracked`
  - égal → `up-to-date`
  - différent → `rebuild`

### 2.5 Orchestration (où ça se branche)

Dans `start()` (`commands/start.ts`), après `discoverDevices` et avant le picker :

1. spinner `checking builds…`
2. `const fp = await currentFingerprint(project)` (une fois)
3. pour chaque device : calculer `buildStatus` à partir de (`hasBuild`, baseline
   du registre, `fp`) + renseigner `installedVersion`
4. stopper le spinner ; afficher le picker enrichi

`discoverDevices` garde sa responsabilité (présence + version installée) ; le
**croisement avec la baseline et le fingerprint courant** se fait dans `start`
(c'est là qu'on a accès au registre et au projet). Alternative possible : passer
`prefs` + `fp` à `discoverDevices` — rejeté pour garder `discoverDevices` sans
dépendance au registre.

### 2.6 Affichage picker

`src/picker.ts` — `deviceHint` enrichi (remplace `✅ build installed / ⚙️ will build`) :

| buildStatus | hint |
|-------------|------|
| `absent`     | `⚙️ will build` |
| `up-to-date` | `✅ up to date` |
| `rebuild`    | `♻️ rebuild required (native changed)` |
| `untracked`  | `✅ installed · native: untracked` |
| `unknown`    | `· build status unknown (device off)` |

Si `installedVersion` connu et `app.json` plus récent : suffixe
`· v{installed} (app.json {target})`. Le tri (`sortDevices`) est inchangé.

`status` command (`commands/status.ts`) : afficher aussi `builtAt` si présent
(amélioration mineure, optionnelle).

## Découpage / interfaces

- `ui.banner()` — pur, sans I/O. (modifié)
- `fingerprint.currentFingerprint(project)` — I/O isolée, renvoie hash|null. (nouveau)
- `devices/*` — présence + version installée par device. (étendu)
- `registry.ProjectPref.builtFingerprints` — persistance baseline. (étendu)
- `start()` — orchestration : croise baseline × fingerprint courant, gère le
  spinner, persiste après build. (modifié)
- `picker.deviceHint` — rendu du statut. (modifié)

## Gestion d'erreurs

- fingerprint indisponible (pas d'`@expo/fingerprint`, timeout, erreur) →
  `untracked`, jamais d'échec du flux.
- lecture version impossible → `installedVersion` undefined.
- Android éteint → `unknown` (comme aujourd'hui pour `hasBuild`).
- Spinner toujours stoppé (try/finally) même en cas d'erreur.

## Tests

- `ui.test.ts` : banner contient nom + version, largeur bornée.
- `fingerprint.test.ts` : succès / package absent / timeout / erreur.
- `registry.test.ts` : round-trip `builtFingerprints`.
- `picker.test.ts` : `deviceHint` pour chaque `BuildStatus` + suffixe version.
- `devices/*.test.ts` : parsing version iOS (Info.plist) et Android (dumpsys).
- `start` : test d'intégration léger — mismatch fingerprint → `rebuild` ;
  pas de baseline → `untracked` ; persistance après build.

## Hors scope (YAGNI)

- Rebuild automatique si `rebuild` (on informe seulement ; l'utilisateur choisit).
- Lecture du fingerprint *depuis l'app installée* (policy expo-updates) — non
  retenu, baseline mémorisée suffit.
- Détection outdated sur device iOS physique / AVD éteint.
