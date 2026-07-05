# @ice/mobile (Flutter — Android first)

## One-time setup (run this before opening in an IDE)

This repo ships `lib/`, `pubspec.yaml`, `analysis_options.yaml`, and
`l10n.yaml` by hand — deliberately **not** `android/`, `ios/`, or
`windows/`, since those are generated deterministically by the Flutter
tool itself and hand-writing Gradle/Xcode project files from memory is
how subtle, hard-to-debug build breakage happens for zero benefit.

```bash
flutter create . --project-name ice_mobile --org com.yourcompany.ice
flutter pub get
```

`flutter pub get` (because `generate: true` is set in `pubspec.yaml`)
also runs `flutter gen-l10n`, which generates
`lib/l10n/app_localizations.dart` from `lib/l10n/app_en.arb`. That
generated file is imported by `app.dart` — it will not exist until you've
run `pub get` once. This is standard Flutter practice, not a placeholder.

## Running

```bash
flutter run \
  --dart-define=API_BASE_URL=http://localhost:3000 \
  --dart-define=SUPABASE_URL=https://your-project.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

## Status

**Part A:** Project config, app shell, theme, routing skeleton, DI,
networking, Auth feature, Splash, Login, shared widget kit, localization
scaffold.

**Part B (this commit):** Workspace shell with bottom navigation
(`StatefulShellRoute.indexedStack` — Chat/Agent/Coding/Settings, each
keeping independent navigation/scroll state per tab), Profile screen
(pushed on top of the shell), and all five screens:

- **Chat** — fully real against `/v1/chats*` (Phase 3 Part B): loads or
  creates a session, loads real history, sends real messages.
- **Profile** — fully real against `/v1/profile` (Phase 3 Part A):
  fetch, edit, save.
- **Coding** — fully real project CRUD against `/v1/projects*` (Phase 3
  Part B). Deliberately does NOT link projects to chat sessions yet —
  the `Session` model has no `projectId` column today, so that
  connection doesn't exist in the backend to wire up honestly.
- **Settings** — theme switching and sign-out are fully real. Provider
  toggles, routing-mode selection, and the memory viewer are visibly
  present but explicitly disabled with an inline note, because
  `user_settings` has no REST endpoint yet (Phase 3 Part C).
- **Agent** — a real, correct empty state. There is no
  `GET /v1/agent-tasks` endpoint yet (Phase 3 Part C) to list anything
  real, so this screen says exactly that rather than fabricating task
  data.

**Part C / Phase 3 Part C dependency:** once Settings and Agent-task
endpoints exist on the backend, `SettingsScreen` and `AgentScreen` are
the two files to revisit — both are structured so the real
loading/error/empty pattern already used by Chat/Coding/Profile drops
in without a rewrite.

## Architecture Notes

- **Feature-first structure** (Document 2, Section 8.1): each feature
  under `lib/features/<name>/` has its own `presentation/`,
  `application/`, `domain/`, `data/` as needed — not every feature needs
  all four yet (Auth has all four; Splash has only `presentation/`
  because it has no state of its own beyond what AuthController already
  owns).
- **No feature constructs its own `Dio` or reads `flutter_secure_storage`
  directly** — everything goes through `ApiClient` /
  `SecureTokenStorage`, injected via the providers in `app/di/providers.dart`,
  mirroring the backend's DI discipline (Document 2, Section 6.3).
- **`AuthRepository` talks to Supabase directly; `ApiClient` talks to the
  ICE backend.** These are deliberately two different HTTP clients with
  two different base URLs — conflating them would make the mobile app's
  auth logic depend on the backend being up, which Document 3, Section
  5.2 explicitly avoids on the backend side too.
