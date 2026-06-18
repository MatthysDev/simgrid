# Design — Avis de mise à jour du CLI (self-update notice)

Date: 2026-06-18
Statut: validé (brainstorming)

## Objectif

Afficher dans le CLI un avis quand une version plus récente de `simgrid-cli` est
publiée sur npm — comme npm/expo (`update-notifier`).

## Décisions

- **Cache quotidien, non-bloquant** : l'avis s'affiche depuis un cache local ;
  un rafraîchissement réseau part en arrière-plan (pour le *prochain* lancement)
  quand le cache a plus de 24 h. Zéro latence, fonctionne hors-ligne.
- Aucune dépendance ajoutée (`fetch` natif Node 18+).

## Module `src/update-check.ts`

- `UPDATE_CACHE_FILE` = `~/.simgrid/update-check.json` (`{ lastCheckedAt, latestVersion }`).
- `isNewer(latest, current)` — compare `x.y.z` ; non-semver (`dev`) ⇒ `false`.
- `cachedNotice(current, cache)` — string `⬆ update available: x → y · run npm i -g simgrid-cli@latest` ou `null`.
- `needsRefresh(cache, now, 24h)` — bool.
- `parseRegistryVersion(doc)` — lit `version` du document registre.
- `fetch` du registre `https://registry.npmjs.org/simgrid-cli/latest`, timeout 2.5 s,
  toute erreur ⇒ `null` (jamais bloquant).
- `refreshCache(now, {file, pkg, fetcher})` — fetch + écriture, ne throw jamais.
- `updateNotice(current, opts)` — lit le cache, renvoie l'avis caché instantanément,
  et lance `refreshCache` en fire-and-forget si périmé.
- `doctorUpdateLine(current, opts)` — check **bloquant** à la demande pour `simgrid doctor`.

## Branchements

- `start()` : après le banner, `console.log(updateNotice(VERSION))` si non nul.
- `doctor` : ajoute `doctorUpdateLine(VERSION)` (up-to-date / update / unavailable).

## Tests (`update-check.test.ts`)

- `isNewer` (semver + non-semver), `cachedNotice`, `needsRefresh`,
  `parseRegistryVersion`, `refreshCache` (round-trip + échec silencieux),
  `updateNotice` (avis depuis cache), `doctorUpdateLine` (3 états).
  Le réseau est injecté via un `fetcher` de test — aucune requête réelle.

## Hors scope

- Pas d'auto-update (on informe seulement).
- Pas de prise en compte des préreleases / tags autres que `latest`.
