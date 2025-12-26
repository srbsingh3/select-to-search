# Repository Guidelines

## Project Structure & Modules
- MV3 manifest at `manifest.json` defines the content script, background service worker, options page, and permissions (`storage`, `scripting`, `tabs`, `activeTab`, `<all_urls>`).
- Code lives in `src/`: `contentScript.ts` (selection detection, floating UI with inlined Shadow DOM styles), `background.ts` (tab creation), `options/main.tsx` + `OptionsPage.tsx` (settings UI), and `options.css` with tokens in `:root`. Content script styles are inlined in Shadow DOM using `:host` selectors for isolation.
- `public/options.html` hosts the options shell; Vite builds to `dist/` for loading as an unpacked extension. Co-locate tests with sources (e.g., `contentScript.test.ts`).

## Build, Test, and Development
- Install dependencies: `npm install` (Node 18+).
- Build bundles: `npm run build` → `dist/` with manifest, scripts, and options assets.
- Dev server for options UI: `npm run dev` and open the printed URL; content/background flows require a full build and Chrome load.
- Tests: `npx jest` or target a path (`npx jest src/options/OptionsPage.test.tsx`). Load unpacked via `chrome://extensions` → Developer Mode → Load `dist/`.

## Coding Style & Naming
- TypeScript-first; prefer `const`, explicit types at module boundaries, and guard clauses. Keep JSX semantic and small.
- Indentation: 2 spaces; ~100 character lines. Components/classes `PascalCase`; functions/variables `camelCase`; files descriptive `*.ts`/`*.tsx`; CSS/asset names `kebab-case`.
- Maintain tokens in `:root` (`--space-*`, `--font-size-*`, `--radius-*`, `--color-*`); namespace content styles to avoid host-page collisions. Avoid inline scripts and never commit secrets.

## Testing Guidelines
- Use Jest; favor behavior-first tests for selection filtering, provider URL encoding, storage defaults, and background messaging. Mock Chrome APIs; keep tests fast and deterministic.

## Commit & Pull Request Guidelines
- Commits: imperative mood with scoped prefix (e.g., `feat: add selection affordance`, `chore: align storage defaults`). Branch per task (`feature/selection-ui`, `fix/storage-defaults`).
- PRs: summarize change and rationale, include verification steps (commands run, options UI screenshots if touched), link issues/tasks, and list known gaps.

## Security & Performance Notes
- Do not embed credentials; providers rely on user sessions only. Validate URLs before messaging the background; ignore empty/whitespace selections and editable fields.
- Keep the content script lightweight (target ≈100ms render); clean up DOM/UI and listeners on deselect or navigation to prevent leaks.
