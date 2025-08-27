# Slack Status Scheduler — Product Requirements Document (PRD)

Document status: Draft  
Version: 2.1  
Owner: Sammy (IT Support Engineer)  
Date: 2025-08-27  
Timezone reference: Australia/Sydney

## 1. Summary

This document updates the earlier CLI-first design to make a native macOS menu‑bar (background) app the primary delivery for the Slack Status Scheduler, while retaining a headless Node.js runner and adding well-documented, user-owned remote-runner export options so status updates can occur when the user's Mac is off.

Primary user experience:
- Native macOS menu‑bar app for configuration, previews, scheduled local runs, and export to remote runners.
- Headless Node.js runner reused by macOS app and exported workflows/worker packages.
- Exported remote runners (GitHub Actions and Cloudflare Worker are the MVP exports) that the user deploys/owns so the schedule runs while the user's device is powered off — no developer-hosted service required.

This PRD preserves the original scheduling semantics (every N days, weekly, dates), timezone-aware evaluation, expiry semantics, and security requirements, and expands deployment options and UX for macOS users.

## 2. Goals

- Primary: Provide a native-feeling macOS menu-bar background app that automatically updates a Slack user's profile status on scheduled days.
- Secondary: Offer user-owned remote runner options (GitHub Actions, Cloudflare Worker) so updates occur when the local device is off. Provide step-by-step docs in a `docs/` folder for both exports.
- Keep configuration simple: a single `schedule.json` persisted locally (or optionally exported).
- Support "Preview" and `--dry-run` semantics and make logs available for verification.
- Ensure secure credential handling: macOS Keychain locally; platform secret stores for exported runners.

## 3. Non-goals

- Developer-hosted always-on scheduler (MVP).
- Multi-user orchestration beyond per-user installation/export.
- Advanced recurrence rules beyond the defined rule types (`every_n_days`, `weekly`, `dates`) in MVP.
- Replacing Slack native availability features — we only update `users.profile`.

## 4. Success metrics

- 90% of macOS installs finish setup within 10 minutes.
- Users who enable remote-run export experience zero missed scheduled updates over 30 days.
- No accidental logging of Slack tokens; token only in Keychain or user's CI/cloud secret store.
- App-run and exported runner behavior consistent across DST transitions (test coverage).

## 5. Personas and use cases

- IT Support Engineer who prefers a native macOS control panel for personal Slack status automation.
- Individual contributors who want scheduled OOO/WFH statuses and to ensure the status sets even when their device is off.
- Power users who want local app plus the ability to export the runner to their own GitHub repo or cloud account.

## 6. Scope

### 6.1 In scope
- A macOS menu-bar app (Swift + SwiftUI recommended) with:
  - Background daily scheduling and a menu for "Run now", "Preview", "Open schedule", "Export", "Settings", "Logs".
  - Local storage of `schedule.json` and Keychain storage of `SLACK_USER_TOKEN`.
  - An "Export" flow that generates:
    - GitHub Actions workflow and instructions (recommended user-hosted export), and/or
    - Cloudflare Worker deploy package and instructions (user-owned serverless export).
- A headless Node.js runner (Node 18+) used by the exported workflows and worker.
- Docs in a `docs/` folder describing setup, export steps, security guidance, and troubleshooting.

### 6.2 Out of scope
- Developer-hosted scheduling service.
- Windows/Linux GUI apps in MVP (CLI support remains for headless).
- Full App Store distribution and notarization in MVP (delivered as a developer-build or signed distribution).

## 7. Functional requirements

ID | Requirement
---|---
F1 | The macOS app shall read and persist a JSON config file (default `schedule.json`) and allow editing via UI or external editor. The CLI runner shall accept a path to the config.
F2 | The app and runners shall evaluate rules against "today" in the configured timezone; first matching rule wins.
F3 | Supported rule types:
F3.1 | `every_n_days`: match when days since `start_date` is divisible by `interval_days`. Optional `only_weekdays`.
F3.2 | `weekly`: match if today's weekday appears in `days_of_week`. Optional `only_weekdays`.
F3.3 | `dates`: match if today equals any ISO date in `dates`.
F4 | On match, set Slack status (`status.text`, `status.emoji`) and `status_expiration` to expiry calculated as end-of-day or `status.expire_hour`.
F5 | When no rule matches, by default leave unchanged; provide option "Clear when no match".
F6 | Provide `--dry-run` and in-app Preview that logs intended actions without calling Slack APIs.
F7 | CLI to accept optional config path and flags `--dry-run` and `--clear-if-not-matched`.
F8 | App to log ISO timestamps, timezone, config path, last run result; logs accessible via UI and `logs/` export.
F9 | CLI shall exit non-zero on unrecoverable errors; app shall surface errors clearly.
F10 | Slack token with `users.profile:write` required; token stored securely (Keychain or platform secret store).
F11 | App shall provide "Export to remote runner" that generates artifacts and step-by-step deployment instructions.
F12 | All timezone/DST calculations shall use a reliable TZ library (e.g., `luxon` in runner; `Foundation`/`SwiftDate` in macOS).

## 8. Non-functional requirements

- NFR1 Reliability: Local app uses a local timer/scheduler; exported runners use platform schedulers.
- NFR2 Performance: Evaluation + optional API call completes within 2 seconds in normal network conditions.
- NFR3 Security:
  - Local token stored in macOS Keychain.
  - Exported runners require user to store token as a platform secret (GitHub Secrets / Cloudflare Secrets).
  - Do not transmit user tokens to third parties.
- NFR4 Observability: Human-readable logs, "last run" badge in menu-bar menu.
- NFR5 Portability: Headless runner remains Node 18+; macOS app targets macOS 12+.
- NFR6 Maintainability: Clear separation between matcher logic (reusable) and platform glue. Tests for matchers, TZ handling, and exported runner logic.
- NFR7 Time correctness: Honor configured timezone consistently; account for DST transitions deterministically.

## 9. Assumptions

- The Slack workspace permits personal Slack apps or user tokens.
- Users can create GitHub repository and store secrets or can deploy a Cloudflare Worker into their own Cloudflare account.
- One status update per day is sufficient for use cases.

## 10. Constraints

- macOS app: Swift + SwiftUI targeting macOS 12+.
- Headless runner: Node.js 18+ (target Node 20).
- Libraries: `luxon` on Node; Slack SDK `@slack/web-api`.
- Slack scope: `users.profile:write`.

## 11. User stories

- As a macOS user, I can install the menu-bar app, paste my Slack token (stored in Keychain), and enable scheduled updates.
- As a user, I can preview today's evaluation before enabling scheduled runs.
- As a user, I can export my schedule to GitHub Actions (recommended) or a Cloudflare Worker for remote execution while my Mac is off.
- As a user, I can edit `schedule.json` in-app or in my editor and see changes immediately.

## 12. Scheduling rules

Rule evaluation order: first-match-wins. Rule schemas:
- `every_n_days`: `start_date` (ISO), `interval_days` (>=1), optional `only_weekdays`.
- `weekly`: `days_of_week` (["Mon","Tue",...,"Sun"]), optional `only_weekdays`.
- `dates`: `dates` (array of ISO YYYY-MM-DD strings).
Status shape:
- `status.text`: string
- `status.emoji`: string (emoji short code)
- `status.expire_hour`: integer 0–23 (optional; default end of local day)

Example `schedule.json`:
```slack_status/schedule.json#L1-999
{
  "timezone": "Australia/Sydney",
  "rules": [
    {
      "type": "every_n_days",
      "start_date": "2025-01-01",
      "interval_days": 3,
      "only_weekdays": false,
      "status": {
        "text": "I'm out of the office today",
        "emoji": ":palm_tree:",
        "expire_hour": 17
      }
    }
  ]
}
```

## 13. CLI, macOS app and export flows

Local macOS UX:
- Menu-bar icon with dropdown:
  - "Run now" — runs evaluation immediately.
  - "Preview today" — runs evaluation in dry-run mode and shows detailed logs.
  - "Open schedule" — opens `schedule.json` in editor.
  - "Export" — opens guided export wizard for GitHub Actions or Cloudflare Worker.
  - "Settings" — timezone, Clear when no match toggle, run time window.
  - "Logs" — view last runs and errors.
- On first run, prompt for `SLACK_USER_TOKEN`. Store in Keychain and validate with a safe test.

CLI:
- `node runner/index.js [path/to/schedule.json] [--dry-run] [--clear-if-not-matched]`  
- CLI exits non-zero and writes human-readable errors to stderr on problems.

Export flows:
- GitHub Actions (recommended): app generates a workflow YAML (example below), a README for the repo, and instructions to create `SLACK_USER_TOKEN` as a repository secret. The workflow invokes the headless runner.
- Cloudflare Worker: app generates worker code + deployment instructions (wrapping same matcher logic). The user deploys worker to their Cloudflare account and creates a Cron Trigger. The worker reads the schedule from an environment variable or KV/secret (user guidance provided).
- Both exports rely on the user to store `SLACK_USER_TOKEN` securely; the app explicitly warns about not checking tokens into repo.

## 14. API integration

- Slack Web API: `users.profile.set`
- Payload:
  - `profile`: { `status_text`, `status_emoji`, `status_expiration` } (epoch seconds)
- On dry-run/Preview do not call Slack API.
- Do not log tokens or full API responses; log only success/failure and safe error messages.

## 15. Time and DST behaviour

- Rule evaluation and expiration occur in configured timezone.
- `status.expire_hour` refers to local time on that day; if omitted use end-of-day 23:59:59 local time.
- Exported workflows include guidance for expressing cron schedules relative to timezone and include dual cron entries where appropriate to handle DST in environments that use UTC cron.

## 16. Security and privacy

- macOS app stores token in Keychain and never uploads it.
- Exported runners require user to create platform secrets (GitHub Secrets or Cloudflare Secrets).
- The app must never transmit the token to developer servers.
- The app warns prominently if `schedule.json` contains any sensitive data before including it in an exported repo.

## 17. Error handling and resilience

- Malformed config: app blocks run, highlights error lines; CLI exits non-zero with clear message.
- Missing token: app prompts to set up; CLI exits non-zero.
- Slack API errors: log context and surface helpful messages.
- Network failures: local app logs and retries next scheduled run; exported runners rely on platform semantics.

## 18. Logging and UX

- Logs include ISO timestamps, evaluated timezone, config path, matched rule info, computed expiry epoch, and whether API call was made.
- Menu-bar badge shows "Last run: <time> — success/failure".
- Logs downloadable via "Export logs" for debugging.

## 19. Compatibility and deployment

- macOS app (MVP): developer build and signed distribution (no App Store in MVP).
- Headless runner: Node.js 18+, packaged for GitHub Actions and Cloudflare Worker usage.
- Exported artifacts and docs placed in `docs/` for user guidance.

## 20. Acceptance criteria

- AC1 Timezone correctness across local and exported runners.
- AC2–AC6 Matchers behave per rules (`every_n_days`, `weekly`, `dates`, `only_weekdays`, expiry hour).
- AC7 No match default: no change unless Clear option enabled.
- AC8 Exports function: GitHub Actions and Cloudflare Worker instructions are sufficient for a user to run the schedule while their Mac is off.
- AC9 Dry-run: does not call Slack APIs.
- AC10 Clear error messaging for missing token or malformed config.

## 21. Test plan (high level)

- Unit tests for matchers and timezone expiry calculation.
- Integration tests with mock Slack client to assert set/clear/no-op and dry-run behavior.
- Manual tests:
  - Install macOS app, perform preview and real run.
  - Export to GitHub Actions: store secret and validate scheduled run.
  - Deploy Cloudflare Worker and validate scheduled run.
  - DST transition tests via timezone mocks.

## 22. Risks and mitigations

- Token mishandling: Keychain / platform secrets and explicit warnings; do not upload tokens into repos.
- User unfamiliarity with GitHub/Cloudflare: provide step-by-step docs in `docs/`.
- Slack API changes: minimal calls, surface errors, pin SDK version.

## 23. Milestones

- M1 (MVP): macOS menu-bar app, Keychain storage, schedule editor, preview/dry-run, GitHub Actions & Cloudflare Worker export generator, docs in `docs/`.
- M2: Serverless templates for other providers, optional GitHub OAuth for repo creation (user opt-in).
- M3: App Store distribution and more automated deployment flows.

## 24. Open questions

- Should the app include optional GitHub OAuth to automate repository creation and secret creation, or only export artifacts and manual instructions? (Security vs convenience tradeoff.)
- Should we provide a built-in minimal hosted option for non-technical users in the future? (Requires clear pricing and trust model.)

## 25. Appendix — Exports and docs (detailed)

This section provides detailed guidance for the two recommended user-owned export options: GitHub Actions and Cloudflare Worker (Cloudflare Workers). It also documents the recommended structure of `docs/` to ship alongside the app and runner.

### 25.1 Example `schedule.json` (every 3rd day)
```slack_status/schedule.json#L1-999
{
  "timezone": "Australia/Sydney",
  "rules": [
    {
      "type": "every_n_days",
      "start_date": "2025-01-01",
      "interval_days": 3,
      "only_weekdays": false,
      "status": {
        "text": "I'm out of the office today",
        "emoji": ":palm_tree:",
        "expire_hour": 17
      }
    }
  ]
}
```

### 25.2 Example weekly rule
```slack_status/schedule.json#L100-199
{
  "type": "weekly",
  "days_of_week": ["Mon", "Fri"],
  "only_weekdays": true,
  "status": {
    "text": "WFH — reduced availability",
    "emoji": ":house_with_garden:",
    "expire_hour": 18
  }
}
```

### 25.3 Example dates rule
```slack_status/schedule.json#L200-299
{
  "type": "dates",
  "dates": ["2025-12-24", "2025-12-25", "2025-12-26"],
  "status": {
    "text": "Public holiday",
    "emoji": ":calendar:",
    "expire_hour": 23
  }
}
```

---

### 25.4 GitHub Actions export — detailed guide

Goal: generate a GitHub Actions workflow the user owns and controls. The workflow will run the headless Node runner inside a GitHub-hosted runner and use a GitHub Secret `SLACK_USER_TOKEN` to authenticate the Slack API call.

High-level steps for users (to be autogenerated by app or presented in export UI):
1. Create a GitHub repository you control (or select an existing one).
2. Add the headless runner script and `schedule.json` to the repository (the app can offer to create a minimal repo or provide files to copy).
3. Create a repository secret named `SLACK_USER_TOKEN` containing your Slack user token (personal token with `users.profile:write`).
4. Commit the generated workflow to `.github/workflows/slack-status.yml` and commit `schedule.json` (or configure `SCHEDULE_JSON` as a secret to avoid committing schedule if it contains sensitive notes).
5. Optionally, configure branch protection or minimal PR checks as desired (workflow only needs to be present on default branch).
6. The workflow will run on the schedule and call the included runner.

Example generated workflow file (the app should generate this and place in `docs/` for manual copy or commit):

```slack_status/.github/workflows/slack-status.yml#L1-300
name: Slack status update (scheduled)

on:
  # Two cron lines to account for DST shifts in Australia/Sydney (example).
  schedule:
    - cron: '5 21 * * *'  # 08:05 AEDT (UTC+11)
    - cron: '5 22 * * *'  # 08:05 AEST (UTC+10)
  workflow_dispatch: {} # allow manual trigger for testing

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Run Slack Status runner
        env:
          SLACK_USER_TOKEN: ${{ secrets.SLACK_USER_TOKEN }}
        run: node runner/index.js schedule.json --dry-run=false
```

Notes and security guidance to include in `docs/`:
- Do NOT commit `SLACK_USER_TOKEN` to the repo. Use GitHub Secrets.
- If `schedule.json` includes private text, prefer setting `SCHEDULE_JSON` as a repository secret and modify the runner to read from `process.env.SCHEDULE_JSON`.
- Use `workflow_dispatch` to run tests manually before enabling scheduled runs.

Automating repo creation and secret creation:
- The app may optionally offer to perform repo creation and secret creation via GitHub OAuth if the user grants permission. This is optional and should be clearly explained (scopes required: `repo` and `actions:write` or similar). For MVP, prefer manual guidance.

What the generated runner does:
- Validates config.
- Evaluates today's rule using timezone from config.
- If match: calculates expiry epoch and calls Slack `users.profile.set`.
- Logs success/failure to job logs.

### 25.5 Cloudflare Worker export — detailed guide

Goal: produce a Cloudflare Worker package the user deploys to their own Cloudflare account and schedules via a Cron Trigger (Cloudflare Cron Triggers). The worker will run server-side and call Slack API using a secret stored in Cloudflare environment variables (or Workers Secrets).

High-level steps for users (to be autogenerated by app or provided as files in `docs/`):
1. Ensure you have a Cloudflare account and the `wrangler` CLI available (or use Cloudflare dashboard).
2. Create a new Worker project using the app-generated template or copy the provided files.
3. Add your `schedule.json` to the Worker bindings (or store it in KV and bind to the Worker).
4. Set a Worker Secret or environment variable for `SLACK_USER_TOKEN` (via `wrangler secret put SLACK_USER_TOKEN` or Cloudflare dashboard).
5. Create a Cron Trigger in Cloudflare dashboard or via `wrangler` to invoke the Worker daily at the desired UTC time (the app's export includes recommended cron expressions).
6. Deploy the worker and test via a manual invocation.

Minimal worker script example (the app generates or embeds this — the same matcher logic as the runner should be ported to the worker; below shows simplified Node-like logic for clarity):

```slack_status/worker/worker.js#L1-400
/**
 * This file is a conceptual snippet. Cloudflare Workers run on V8 isolates.
 * The actual export should implement the same matcher logic in a Worker-friendly way,
 * using native Date/time libraries or ported luxon-like logic, and read SCHEDULE and TOKEN from bindings.
 */

addEventListener('fetch', event => {
  event.respondWith(new Response('OK'));
});

// Cron-trigger handler (Cloudflare will invoke the worker on schedule)
export default {
  async scheduled(event, env, ctx) {
    // env.SLACK_USER_TOKEN is set via Workers Secrets
    // env.SCHEDULE_JSON can be set as a text env var or read from KV
    const scheduleJson = env.SCHEDULE_JSON; // or fetch from KV
    const token = env.SLACK_USER_TOKEN;

    // Evaluate scheduleJson using timezone-aware logic (port of matcher)
    // If match, call Slack users.profile.set with fetch
    // Use standard fetch calls to Slack API:
    // fetch('https://slack.com/api/users.profile.set', { method: 'POST', headers: {...}, body: JSON.stringify({ profile: {...} }) })
  }
}
```

Cloudflare-specific deployment notes:
- Use Cloudflare Secrets for `SLACK_USER_TOKEN` (do not store token in source).
- If `schedule.json` is small and not sensitive, consider bundling it; otherwise store in KV and bind it to worker.
- Use Cron Trigger schedule expressed in UTC; include documentation for calculating the correct UTC time for the desired local timezone including DST caveats.

Recommended `wrangler.toml` snippet the app could generate:

```slack_status/worker/wrangler.toml#L1-200
name = "slack-status-worker"
main = "worker.js"
compatibility_date = "2025-01-01"

# Cron trigger can also be set in dashboard; examples included in docs
# environment variables and secrets handled separately
```

### 25.6 Comparison: GitHub Actions vs Cloudflare Worker

- GitHub Actions
  - Pros: Familiar Git-centric UX; GitHub Secrets; easy to test via `workflow_dispatch`; good for users who already use GitHub.
  - Cons: Slightly higher cold-start latency (runner boots), but acceptable since runs are daily.
- Cloudflare Worker
  - Pros: Low-latency, serverless; simple Cron Triggers; runs in user's cloud account; good for users with Cloudflare familiarity.
  - Cons: Requires understanding how to deploy workers and manage secrets; Worker runtime environment differs from Node (some porting needed).

The app should offer both export artefacts and point users to `docs/` for step-by-step setup.

---

## 26. docs/ folder guidance (what to include)

When generating documentation (place in `docs/` in the project root and include as export artifacts), include the following files with clear step-by-step instructions, example commands, and troubleshooting tips.

- `docs/README.md` — Overview of exported options and security guidance.
- `docs/github-actions.md` — Detailed guide for the GitHub Actions export:
  - How to create a repo, add files, create secrets (`SLACK_USER_TOKEN`), and commit workflow.
  - Example YAML (full workflow file).
  - How to test with `workflow_dispatch`.
  - How to optionally keep `schedule.json` out of the repo by using `SCHEDULE_JSON` secret and runner changes.
  - Troubleshooting: checking workflow logs, common permission errors, token errors.
- `docs/cloudflare-worker.md` — Detailed guide for Cloudflare Worker export:
  - How to create and deploy the worker (wrangler commands and Cloudflare dashboard steps).
  - How to add Cron Triggers and set secrets.
  - Example `worker.js` and `wrangler.toml`.
  - Troubleshooting: Cloudflare runtime errors, secret setup.
- `docs/local-mac-app.md` — How to install and configure the macOS menu-bar app:
  - Keychain token setup and validation.
  - Editing `schedule.json`.
  - Running preview and interpreting logs.
- `docs/troubleshooting.md` — General troubleshooting:
  - Slack API error codes and meaning.
  - How to rotate tokens and invalidate old tokens.
  - How to debug timezone issues.
- `docs/security.md` — Security best practices:
  - Never commit tokens.
  - Using platform secrets.
  - Keychain guidance for macOS.
- `docs/export-checklist.md` — Quick checklist for users when exporting and enabling remote runs.

Each `docs/` file should include copyable command examples and manifest/code snippets. Where code is included in the docs, include the matching path-based code examples under the repo so the app can output them directly into the user's repo.

Example top-of-file content for `docs/github-actions.md` (to be generated by app):

```slack_status/docs/github-actions.md#L1-200
# GitHub Actions Setup

1. Create a repository (or use an existing one).
2. Add the runner code under `runner/` and `schedule.json` at repo root (or set `SCHEDULE_JSON` secret).
3. Add a secret named `SLACK_USER_TOKEN` in repository settings -> Secrets.
4. Add `.github/workflows/slack-status.yml` with the provided YAML in this repo.
5. Test with the "Run workflow" button (workflow_dispatch) before relying on the schedule.
6. If you prefer not to commit `schedule.json`, set the content as `SCHEDULE_JSON` secret and update runner to read schedule from `process.env.SCHEDULE_JSON`.
```

Make sure the `docs/` files are written in clear, non-technical language with a "Security checklist" at the top.

## 27. Implementation notes for engineers

- Reuse the same matcher modules across macOS app, Node runner, and exported worker where practical (port logic to Worker runtime as needed).
- A small canonical runner library (`runner/lib/matchers.js`) should:
  - Accept a `Date` or Luxon `DateTime` and the `schedule.json` object.
  - Return either `null` (no match) or `{ ruleIndex, status, expiryEpoch }`.
- CLI `runner/index.js` uses the canonical library and can be called by workflows/workers.
- macOS app transports `schedule.json` unchanged to exported artifacts but warns if it contains sensitive text.
- Tests: unit tests for matchers, integration tests mocking Slack API.

## 28. Acceptance and next steps

- Update repository with:
  - `runner/` headless Node runner and `runner/lib/matchers.js`.
  - `docs/` folder with the files described above (populated with exportable artifacts).
  - `worker/` template for Cloudflare Worker.
  - `.github/workflows/` example in `docs/` and optionally in repo root for anyone who opts-in.
- Build macOS menu-bar app tying into Keychain and the canonical runner library (or bundle runner to call local Node process if preferred).
- Validate exported workflows and worker deployments in staging before publishing docs to users.

## 29. Glossary

- OOO: Out of Office  
- DST: Daylight Saving Time  
- IANA timezone: e.g., `Australia/Sydney`  
- CI: Continuous Integration (e.g., GitHub Actions)  
- Keychain: macOS credential storage facility

---

End of PRD (v2.1). If you want, I can now:
- Draft the `docs/` files described above (full contents for `docs/github-actions.md` and `docs/cloudflare-worker.md`), or
- Scaffold the Node headless runner and matcher modules, or
- Generate the Cloudflare Worker template with runnable worker code.

Which shall I produce next?