# Slack Status Scheduler — Project Roadmap (PROJECT.md)

This document breaks the PRD into actionable tasks and milestones, phased for incremental delivery. It is written for you (the implementer / team) and describes what I recommend you build, test, and ship in each phase. Use this as a living checklist: update statuses, owners, estimates and issues as you make progress.

Table of contents
- Phases & milestones
- Phase task lists (detailed)
- Acceptance criteria by phase
- Testing & QA plan
- Docs, exports and templates to deliver
- Security & privacy checklist
- References & example snippets

---

## High-level phases

- Phase 0 — Discovery & scaffolding (1 week)
  - Finalize PRD details, scheduling rules and time/DST behaviour.
  - Create repo structure, CI, and initial `README`.
  - Scaffolding for headless runner and CLI.

- Phase 1 — MVP: Headless runner + GitHub Actions & Cloudflare Worker exports (2–3 weeks)
  - Implement canonical scheduling logic in a Node.js runner.
  - Provide a CLI for validating `schedule.json` and performing dry-runs.
  - Add export templates and docs for GitHub Actions and Cloudflare Worker (user-owned deployments).
  - Add example `schedule.json` rules and tests.

- Phase 2 — macOS menu bar UI + packaging (3–4 weeks)
  - Build macOS menu bar app that surfaces scheduling UI and preview.
  - Integrate with local runner; store Slack token in macOS Keychain.
  - Add "Export" flows inside the app for GitHub Actions and Cloudflare Worker.
  - Implement background runner (launch agent) local option.

- Phase 3 — Polishing, observability, and optional server integrations (2–4 weeks)
  - UX polish, analytics opt-in, logging controls, accessibility.
  - Slack App approach (if pursued) and enterprise considerations.
  - Additional export targets (GitLab CI, other serverless providers).

- Phase 4 — Scaling & optional hosted service (deferred)
  - Optionally provide a hosted service (requires infrastructure).
  - Enterprise features: team deployment, provisioning, multi-user support.

---

## Phase task lists (detailed)

Each task entry includes suggested deliverables and acceptance criteria.

Phase 0 — Discovery & scaffolding
- [x] Review PRD sections: `Scheduling rules`, `Time and DST behaviour`, `Security and privacy`.
- [x] Create repo skeleton: `slack_status/` with `src/`, `cli/`, `macos/`, `docs/`, `examples/`, `tests/`.
- [x] Setup basic CI (linting + tests) and a `pre-commit` hook.
- [x] Create an initial `README` and `CONTRIBUTING`.

Phase 1 — MVP: Headless runner + Exports
- Runner & scheduler
  - [x] Implement `runner` package with canonical scheduling logic (rules parsing, matching, timezones).
  - [x] Expose a programmatic API and a small CLI: `bin/slack-status-cli validate|preview|run --schedule schedule.json --dry-run`.
  - [x] Unit tests covering schedule parsing and matching (including DST edge cases).
- Slack integration
  - [x] Implement an adapter for Slack updates that calls `users.profile.set` with `profile.status_text`, `profile.status_emoji`, and `profile.status_expiration`.
  - [x] Support both user tokens (recommended) and bot tokens (document limitations).
  - Acceptance: runner updates status in a test workspace using a token stored as env var.
- Exports & docs
  - [x] GitHub Actions export template + step-by-step `docs/github-actions.md`.
  - [x] Cloudflare Worker export template + step-by-step `docs/cloudflare-worker.md`.
  - [x] Example `schedule.json` variants: daily, weekly, every-N-days, fixed dates.
- Deliverables:
  - [x] `examples/set_status_demo.js`
  - [x] `examples/schedule.json`
  - [x] `docs/` with how-to deploy exports and set secrets.

Phase 2 — macOS menu bar app
- App UX & core integration
  - [ ] Create macOS menu bar app skeleton (Electron or native SwiftUI — pick one based on constraints).
  - [ ] UI screens: schedule editor, preview, tokens & secrets (Keychain), exports, logs.
  - [ ] Integrate local runner via an API or bundled Node runtime.
- Security & storage
  - [ ] Use macOS Keychain to store Slack tokens; never print secrets to logs.
  - [ ] Option for users to use GitHub Actions / Cloudflare exports instead of storing tokens locally.
- Packaging & distribution
  - [ ] Provide notarized .app or DMG and clear install/uninstall instructions.
- Deliverables:
  - `macos/` app project (or electron wrapper), `docs/macos-setup.md`.

Phase 3 — polish & optional server approaches
- [ ] Add telemetry opt-in, error reporting, and user-facing logs with scrubbed sensitive info.
- [ ] Add more export types (GitLab CI, self-hosted runners).
- [ ] Evaluate Slack App + hosted scheduling (document cost, token flow, required scopes).

---

## Acceptance criteria by phase

Phase 1 (MVP) ✅ COMPLETED
- [x] `runner` can evaluate a `schedule.json` and decide status changes correctly (automated tests cover DST scenarios).
- [x] Slack status updates succeed in a test workspace using `users.profile.set` with required scopes.
- [x] GitHub Actions and Cloudflare Worker export templates are usable by end users (step-by-step docs exist).
- [x] CLI can preview next N changes with `--dry-run`.

Phase 2 (macOS app)
- App runs in menu bar, allows schedule editing, preview, and exports to GH Actions / Cloudflare.
- Slack token stored in Keychain and used to update status when local runner active.
- Installer/packaging produced and basic smoke tests pass.

---

## Testing & QA plan

- Unit tests for schedule parsing and matching (cover every rule type in PRD).
- Integration tests (sandbox workspace) for Slack API calls — use a test Slack workspace and a dedicated token secret.
- End-to-end test for GitHub Actions export: create a demo repo (private), add exported workflow, ensure it runs on schedule.
- Manual macOS test plan: install, set a schedule, verify local updates, test Keychain behaviours, test app quit/restart.

---

## Docs, exports & templates (deliverables)

- `docs/github-actions.md` — how to export a workflow, set up repository secrets, and validate.
- `docs/cloudflare-worker.md` — how to deploy the worker, set environment variables, and schedule triggers.
- `docs/macos-setup.md` — installation, Keychain usage, troubleshooting.
- `examples/schedule.json` — canonical examples and inline comments.

Example schedule (illustrative)
```/dev/null/examples/schedule.json#L1-20
{
  "version": 1,
  "rules": [
    {
      "id": "weekday-morning",
      "type": "weekly",
      "days": ["mon","tue","wed","thu","fri"],
      "time": "09:00",
      "tz": "America/Los_Angeles",
      "status": {
        "text": "In focus time",
        "emoji": ":focus:"
      },
      "duration_minutes": 120
    }
  ]
}
```

Example Node.js snippet (using `@slack/web-api`) to set status
```/dev/null/examples/set_status.js#L1-40
const { WebClient } = require('@slack/web-api');

const token = process.env.SLACK_TOKEN; // user or user-level token with users.profile:write
const web = new WebClient(token);

async function setStatus(text, emoji, expirationUnixTimestamp = 0) {
  const profile = {
    status_text: text,
    status_emoji: emoji,
    status_expiration: expirationUnixTimestamp
  };
  const res = await web.users.profile.set({ profile: JSON.stringify(profile) });
  if (!res.ok) {
    throw new Error(`Slack API error: ${res.error}`);
  }
  return res;
}

// Example usage
setStatus('In a meeting', ':spiral_calendar_pad:', 0).then(() => {
  console.log('Status set');
}).catch(console.error);
```

Example curl (HTTP) call to `users.profile.set`
```/dev/null/examples/curl_set_status.sh#L1-10
curl -X POST https://slack.com/api/users.profile.set \
  -H "Authorization: Bearer $SLACK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profile": {"status_text":"Heads down","status_emoji":":headphones:","status_expiration":0}}'
```

Important Slack scopes
- `users.profile:write` — required to set a user's status programmatically.
- `users.profile:read` — if you need to read current status for previews.

References:
- Slack Web API method: `users.profile.set` — https://api.slack.com/methods/users.profile.set
- Slack scopes documentation: https://api.slack.com/scopes/users.profile:write
(Include direct links in docs pages for convenience.)

---

## Security & privacy checklist

- Do not log tokens or full profiles. Mask any secret values in logs.
- Store tokens in macOS Keychain (for app) and GitHub Secrets (for GH Actions).
- For Cloudflare Worker, instruct users to store tokens as Worker secrets.
- Document threat models and recommend least-privilege tokens.
- Provide a user-visible audit log with scrubbing and an option to export logs locally.
