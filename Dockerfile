# ─── deps stage ─────────────────────────────────────────────────────────────
# Full install (incl. dev deps — Tailwind, ESLint, types). Standalone
# output still needs the dev tooling to produce `.next/standalone`.
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# `--allow-build=unrs-resolver` whitelists unrs-resolver's postinstall
# (pnpm 12+ blocks lifecycle scripts by default with
# `ERR_PNPM_IGNORED_BUILDS`). unrs-resolver is needed by the Next.js
# ESLint plugin for module resolution.
RUN pnpm install --frozen-lockfile --allow-build=unrs-resolver

# ─── build stage ────────────────────────────────────────────────────────────
# Compiles the Next.js app with `output: 'standalone'`. The two
# `NEXT_PUBLIC_*` ARGs are the values that get inlined into the
# client bundle at build time (Next.js does NOT read them at runtime
# for client code) — we have to pass them here, not via compose
# `environment:` on the runtime stage.
FROM deps AS build
COPY . .

# Only `NEXT_PUBLIC_*` values are inlined into the client bundle.
# `DEVICE_SECRET` and `BACKEND_BASE_URL` are server-only and MUST
# stay out of `ARG`/`ENV` here — they're added at runtime via
# docker-compose so the scanner API route can attach the secret
# without ever shipping it to the browser.
ARG NEXT_PUBLIC_BASE_API
ENV NEXT_PUBLIC_BASE_API=$NEXT_PUBLIC_BASE_API

RUN pnpm run build

# ─── runner stage ───────────────────────────────────────────────────────────
# Production image. `output: 'standalone'` in next.config.ts makes
# `.next/standalone` a self-contained Node server that already includes
# the production node_modules subset it needs — we don't copy
# node_modules here.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Static assets + the standalone server bundle.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

# Standalone output produces `server.js` at the project root.
CMD ["node", "server.js"]
