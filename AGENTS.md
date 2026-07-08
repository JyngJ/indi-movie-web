<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Next.js Runtime Rules

- Do not use Turbopack for local development or build verification in this project.
- Use the npm scripts in `package.json`; they must keep `next dev --webpack` and `next build --webpack`.
- If you need to run Next.js directly, pass `--webpack` explicitly.
- Before changing Next.js CLI flags or bundler behavior, read `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md` and update this section plus `README.md`.

## Branching Rules

- Do all non-trivial work on a dedicated branch. Do not implement directly on `main`.
- Always branch from the latest `main` unless the user explicitly asks to continue from another branch.
- Before creating a new work branch, switch to `main` and update it from the remote when network access is available.
- Use branch names that describe the work type and scope:
  - `feature/<short-description>` for product features and user-facing behavior.
  - `fix/<short-description>` for bug fixes.
  - `docs/<short-description>` for documentation-only changes.
  - `refactor/<short-description>` for internal restructuring without behavior changes.
  - `chore/<short-description>` for tooling, dependency, configuration, and maintenance work.
  - `experiment/<short-description>` for throwaway prototypes or research spikes.
- Keep branch names lowercase and hyphen-separated.
- Keep each branch focused on one coherent change. If a task grows into unrelated work, split it into a new branch from `main`.
- Do not merge into `main` without explicit user approval.
- Prefer merging through a pull request. If the user asks for a direct local merge, summarize the diff and verification first.
- Before asking to merge, run the relevant checks for the branch and report any failures clearly.

## Architecture Rules

- Follow Clean Architecture principles for new features and meaningful refactors.
- Keep domain logic independent from UI, framework APIs, database clients, and external services.
- Use a clear dependency direction:
  - Domain types and pure business rules must not import from Next.js, React, Supabase, browser APIs, or route handlers.
  - Application/use-case logic may orchestrate domain logic and repositories, but should not know UI details.
  - Infrastructure code may depend on Supabase, HTTP clients, crawlers, storage, and other external systems.
  - UI components and Next.js route handlers should stay thin and delegate work to application/use-case modules.
- Prefer explicit interfaces for repositories, crawlers, and external service adapters when the code crosses a boundary.
- Do not put business rules directly inside React components, route handlers, or Supabase query code.
- Keep parsing, normalization, matching, approval, and persistence as separate concerns.
- Shared domain types should live in stable modules such as `src/types` or domain-specific `src/lib/<domain>` files, not inside UI components.
- When integrating a new external provider, isolate provider-specific details in an adapter module and return normalized application data.
- Add abstractions only when they protect a real boundary or remove meaningful duplication. Avoid ceremony for tiny, local UI behavior.
- Prefer pure functions for parsing, matching, validation, and normalization so they can be tested without a browser or database.

## Crawler Operations

The crawler runs on a Raspberry Pi (`ssh pi@100.76.84.97`, Tailscale). Full runbook: `docs/RUNBOOK-crawler.md`.

- **dtryx requests must stay at concurrency 1 per domain.** Bursty parallel requests (`Promise.all` over per-theater tasks, high `mapWithConcurrency`) get the RPi's public IP firewall-banned by dtryx. Do not raise concurrency without domain-level rate limiting.
- **If dtryx returns `fetch failed` / connect timeouts (IP ban):** on the RPi, run the IP-rotation script — `ssh pi@100.76.84.97 'sudo systemd-run --unit=mac-rotate --collect /bin/bash /home/pi/mac-rotate.sh'`. It swaps the `eth0` cloned MAC to get a new DHCP public IP, with a 150s self-healing rollback. Verify with `timeout 8 bash -c "cat < /dev/null > /dev/tcp/www.dtryx.com/443" && echo OPEN`. See the runbook for detection, verification, and MAC revert.
- Seat crawling is `npm run crawl:seats` (movie repo, throttled, all parsers). The old standalone `/home/pi/seat-checker` was retired 2026-07-09 — do not resurrect it.
