# Contributing

Thanks for helping improve this QR code generator! The project is a
client-side React + TypeScript app: **everything runs in the user's browser,
nothing is uploaded**, and that property is a hard requirement for any change.

## Getting started

```bash
npm install
npm run dev       # dev server
npm test          # vitest — unit tests for the core
npm run lint      # oxlint
npm run build     # strict typecheck + production build
```

Requirements: **Node.js ≥ 20.19** (Vite 8 requirement).

> **Windows + npm note:** npm has a known bug where optional native
> dependencies of `oxlint`/`rolldown` are skipped, which breaks `npm run
> lint`/`npm run build`. If you see *"Cannot find native binding"*, run:
>
> ```bash
> npm install --no-save "@oxlint/binding-win32-x64-msvc" "@rolldown/binding-win32-x64-msvc"
> ```
>
> (adjust the package names for your platform; no repo files change).

## Project layout

- `src/qr/` — framework-free core: encoding options, geometry, canvas/SVG
  rendering, exporters (PNG/SVG/PDF/EPS), batch, decode, history. **All new
  logic belongs here whenever possible** — it is unit-tested and stays free of
  DOM/React imports (except where browser APIs are the point, e.g. decode).
- `src/qr/__tests__/` — vitest suites for the core.
- `src/qrTypes.ts` — content-type table (URL, Wi-Fi, vCard, …) and payload
  builders.
- `src/components/` — React UI only; keep business logic in `src/qr/`.

## Coding standards

- **TypeScript strict mode** is on (`strict`, `noUncheckedIndexedAccess`).
  No `any`; avoid non-null assertions unless the invariant is structural and
  commented.
- Public functions in `src/qr/` get a short JSDoc comment describing behaviour
  and any assumptions.
- Tests are required for new logic in the core — especially payload encoders
  and anything that affects scannability. Put them in `src/qr/__tests__/`.
- Keep dependencies minimal and well-maintained; every new dependency needs a
  justification in the PR description and an OSI-compatible license (MIT/Apache-2.0/BSD
  preferred).
- UI text should be plain and avoid marketing fluff; no dark patterns, no
  forced signup, no watermarking.

## Pull requests

1. Fork and create a branch from `main`.
2. Make focused, single-purpose commits.
3. Ensure `npm test`, `npm run lint`, and `npm run build` all pass (CI runs
   the same).
4. Update documentation (README, JSDoc) when behaviour changes.
5. Open a PR describing *what* changed and *why*.

## Reporting bugs

Open an issue with: steps to reproduce, browser + OS, what you expected, and
a screenshot or exported file if relevant. Security issues: please email the
maintainer privately instead of opening a public issue.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](./LICENSE) of this project.
