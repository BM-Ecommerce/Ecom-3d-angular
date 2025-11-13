# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Angular modules, components, and services (e.g., `freesample/`, `orderform/`, `relatedproduct/`, `services/`).
- `src/assets`: Static assets and 3D models (`.glb/.gltf`, images).
- `src/environments`: Environment configs (`environment.ts`, `environment.prod.ts`).
- `src/themes`: Global SCSS theme overrides.
- Config: `angular.json`, `tsconfig*.json`, `karma.conf.js`, `.editorconfig`.
- Build output: `dist/visualizer` (see `angular.json:projects.visualization.architect.build.options.outputPath`).

## Build, Test, and Development Commands
- `npm ci` — install exact dependencies from lockfile.
- `npm start` — run dev server (`ng serve`) at `http://localhost:4200/`.
- `npm run build` — production build to `dist/visualizer`.
- `npm run watch` — development build with file watch.
- `npm test` — run Karma/Jasmine unit tests.

## Coding Style & Naming Conventions
- EditorConfig: 2‑space indentation, UTF‑8, trim trailing whitespace; TypeScript uses single quotes.
- Angular naming: `kebab-name.component.ts|html|css`, `name.service.ts`, `name.directive.ts`, `name.pipe.ts`, tests as `*.spec.ts`.
- Component selector prefix: `app-` (from `angular.json:prefix`).
- Prefer Angular CLI generators: `npx ng g c feature/my-widget`, `npx ng g s services/api`.

## Testing Guidelines
- Framework: Jasmine + Karma; specs co‑located as `*.spec.ts`.
- Add/maintain tests for new or changed logic; keep tests deterministic.
- Run `npm test` locally before PRs. Aim for ≥80% line coverage on changed code.

## Commit & Pull Request Guidelines
- History is informal; adopt Conventional Commits going forward: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- PRs must include: clear description, linked issues, test plan, and before/after screenshots for UI changes.
- Keep diffs focused; avoid unrelated refactors or formatting.

## Security & Configuration Tips
- Do not commit secrets; store API URLs and keys in `src/environments/*` and document changes.
- Base href and asset paths are configured in `angular.json`; avoid hardcoding URLs.

## Agent‑Specific Instructions
- Follow this file’s conventions for all edits in this repo’s scope.
- Make minimal, targeted changes; preserve structure; prefer CLI scaffolding over manual boilerplate.

