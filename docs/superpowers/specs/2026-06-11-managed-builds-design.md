# Managed builds — design

Date: 2026-06-11
Status: approved

## Goal

simgrid should handle everything needed to get the app running, without the user
leaving the flow. Two gaps today:

1. When a picked device has no dev build, simgrid hardcodes `npx expo run:<platform>`.
   Projects with custom build pipelines (env scripts, wrappers) can't use it.
2. When the project lacks `expo-dev-client`, simgrid only prints a warning and Metro
   falls back to Expo Go mode; the user has to install the package by hand.

## 1. Build-command picker (first time only)

When a selected device has `hasBuild: false`, instead of running `expo run` directly,
simgrid shows a select prompt (same clack UI as the device picker):

```
⚙ No dev build on iPhone 17 Pro. How should I build YolGo Development?
❯ npm run ios:dev        (./package.json script)
  npx expo run:ios       (default)
  Custom command…        (free text input)
```

- **Candidate scripts**: scripts from the project's `package.json` whose command text
  contains `expo run:ios` (or `expo run:android`, matching the device platform).
  This filters out unrelated scripts like `"start": "simgrid"` or lint scripts.
- **Memory**: the choice is stored per project *and per platform* in
  `~/.simgrid/state.json` → `projectPrefs[path].buildCommands = { ios?, android? }`.
  Subsequent runs never ask: simgrid builds on its own.
- Cancelling the prompt skips that device (consistent with the busy-clone prompt).
- Within a single run, the answer for a platform is reused immediately: two iOS
  simulators without a build trigger one question, then two builds.

## 2. Command execution

Build commands support `{device}` and `{port}` placeholders, substituted with the
live device id (UDID / adb serial) and the Metro port.

When no placeholder is present:

- default `npx expo run:<platform>` and detected npm scripts → simgrid appends
  `--device <id> --port <port>` itself (after `--` for npm scripts, so npm passes
  the flags through);
- custom command without placeholders → run as-is, with a note that device
  targeting is manual (the underlying tool may show its own device prompt).

Commands run with `cwd` = project path and `stdio: 'inherit'`, like today's
`expo run` call. One build per device, sequential (current behavior).

## 3. Self-heal on failure

If the build command exits non-zero, simgrid forgets the memorized command for that
platform and prints the error. The next run shows the picker again. No broken command
is remembered forever, and no `simgrid config` command is needed — consistent with
the registry's self-healing philosophy.

## 4. Missing expo-dev-client

Before the device picker, when `project.hasDevClient` is false, simgrid asks:
`YolGo has no expo-dev-client — install it now?` (clack confirm).

- Yes → run `npx expo install expo-dev-client` in the project (visible output),
  then continue the normal flow with `hasDevClient: true`.
- No → keep today's warning; Metro starts in Expo Go mode.

## 5. Testing

Pure functions covered by vitest, no simulator e2e (same policy as the rest of the
repo):

- candidate-script detection from a parsed `package.json`, per platform;
- placeholder substitution and final command construction (flags appended for
  default/npm-script commands, untouched custom commands);
- `buildCommands` persistence and lookup in project prefs, including the
  forget-on-failure path.

## Out of scope

- EAS / remote builds as picker candidates.
- Parallel builds across devices.
- Team-shared build config in the project repo (registry stays machine-local).
