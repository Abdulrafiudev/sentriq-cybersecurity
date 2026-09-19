# Sentriq — client

The analyst-facing frontend. See the [root README](../README.md) for setup, architecture and the API contract.

- `src/app` — routes. `(app)` is the authenticated shell; `/login` sits outside it.
- `src/components` — presentational primitives and blocks. `ui/primitives.tsx` is the design system.
- `src/features` — screen-level composition.
- `src/hooks` — TanStack Query hooks. Components consume these, never the services.
- `src/services` — every HTTP call. Components never import axios.

The living component sheet is at `/design-system` and renders the same components the product uses.
