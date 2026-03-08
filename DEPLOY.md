# 🚀 EduFactory — Auto-Deploy Guide

## Architektura Deploymentu

```
GitHub Push (main) 
  → GitHub Actions CI/CD
    → Quality Gate (TypeScript + Vitest)
    → Build (Vite + esbuild)
    → Deploy to Vercel (Production)
  
Manus UI
  → Publish Button
    → Manus Hosting (manus.space)
```

## Opcja 1: Manus Publish (Zalecana — Zero Konfiguracji)

**Najszybsza ścieżka.** Manus ma wbudowany hosting z custom domenami.

1. Kliknij **Publish** w prawym górnym rogu panelu Manus
2. Gotowe — aplikacja jest dostępna pod `english-teacher-factory.manus.space`
3. Opcjonalnie: dodaj własną domenę w Settings → Domains

**Zalety:** Zero konfiguracji, automatyczne SSL, CDN, baza danych już podłączona.

---

## Opcja 2: GitHub Actions + Vercel (Auto-Deploy przy każdym push)

### Wymagane GitHub Secrets

Dodaj w: `https://github.com/szachmacik/english-teacher-factory/settings/secrets/actions`

| Secret | Opis | Skąd wziąć |
|--------|------|------------|
| `VERCEL_TOKEN` | Token API Vercel | https://vercel.com/account/tokens |
| `DATABASE_URL` | MySQL connection string | Panel Manus → Database → Connection Info |
| `JWT_SECRET` | Secret do podpisywania sesji | Panel Manus → Settings → Secrets |
| `VITE_APP_ID` | Manus OAuth App ID | Panel Manus → Settings → Secrets |
| `OAUTH_SERVER_URL` | Manus OAuth backend URL | Panel Manus → Settings → Secrets |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL | Panel Manus → Settings → Secrets |
| `VITE_FRONTEND_FORGE_API_KEY` | Manus Forge API key (frontend) | Panel Manus → Settings → Secrets |
| `VITE_FRONTEND_FORGE_API_URL` | Manus Forge API URL (frontend) | Panel Manus → Settings → Secrets |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | https://dashboard.stripe.com/apikeys |
| `BUILT_IN_FORGE_API_KEY` | Manus Forge API key (backend) | Panel Manus → Settings → Secrets |
| `BUILT_IN_FORGE_API_URL` | Manus Forge API URL (backend) | Panel Manus → Settings → Secrets |
| `STRIPE_SECRET_KEY` | Stripe secret key | https://dashboard.stripe.com/apikeys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | https://dashboard.stripe.com/webhooks |

### Konfiguracja Vercel

```bash
# Zainstaluj Vercel CLI
npm i -g vercel

# Zaloguj się
vercel login

# Połącz projekt z Vercel (jednorazowo)
cd english-teacher-factory
vercel link

# Ustaw zmienne środowiskowe w Vercel
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
# ... (wszystkie powyższe secrets)
```

### Jak działa pipeline

1. **Push do `main`** → GitHub Actions startuje automatycznie
2. **Quality Gate** (2-3 min): TypeScript check + Vitest (16 testów)
3. **Build** (3-5 min): `vite build` + `esbuild` → artefakty w `dist/`
4. **Deploy** (1-2 min): `vercel deploy --prebuilt --prod`
5. **Gotowe** — URL produkcyjny w output Actions

### Weryfikacja

```bash
# Sprawdź status ostatniego deployu
gh run list --repo szachmacik/english-teacher-factory --limit 5

# Sprawdź logi konkretnego runu
gh run view <run-id> --log
```

---

## Opcja 3: Vercel MCP (Bezpośredni deploy przez Manus)

Manus ma skonfigurowany Vercel MCP (`team_thX9pn94O34HAZrWaMi5hR9g`).
Można wywołać `deploy_to_vercel` bezpośrednio z sesji Manus bez GitHub Actions.

---

## Zmienne Środowiskowe — Kompletna Lista

### Automatycznie wstrzykiwane przez Manus (nie potrzeba konfigurować)
```
DATABASE_URL          — MySQL/TiDB connection string
JWT_SECRET            — Session cookie signing secret
VITE_APP_ID           — Manus OAuth application ID
OAUTH_SERVER_URL      — Manus OAuth backend base URL
VITE_OAUTH_PORTAL_URL — Manus login portal URL
OWNER_OPEN_ID         — Owner's Manus OpenID
OWNER_NAME            — Owner's name
BUILT_IN_FORGE_API_URL — Manus built-in APIs URL
BUILT_IN_FORGE_API_KEY — Manus built-in APIs key (server-side)
VITE_FRONTEND_FORGE_API_KEY — Manus APIs key (frontend)
VITE_FRONTEND_FORGE_API_URL — Manus APIs URL (frontend)
VITE_ANALYTICS_ENDPOINT — Analytics endpoint
VITE_ANALYTICS_WEBSITE_ID — Analytics website ID
VITE_APP_TITLE        — App title
VITE_APP_LOGO         — App logo URL
```

### Wymagane do Stripe (aktywuj sandbox najpierw)
```
STRIPE_SECRET_KEY          — Klucz serwera Stripe
STRIPE_WEBHOOK_SECRET      — Secret do weryfikacji webhooków
VITE_STRIPE_PUBLISHABLE_KEY — Klucz publiczny Stripe (frontend)
```

**Aktywuj Stripe sandbox:** https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVDdIYnJJR0czeVFScmNJLDE3NzMyNTQ5OTAv1006wbu4VrZ

---

## Diagram Architektury Produkcyjnej

```
User Browser
    │
    ▼
Vercel Edge Network (CDN)
    │
    ├── Static Assets (Vite build) → client/dist/
    │
    └── API Routes (/api/*) → Express Server
            │
            ├── tRPC (/api/trpc) → Procedures
            ├── ZIP Download (/api/download/:id)
            ├── Audio Upload (/api/upload/audio)
            └── Stripe Webhook (/api/stripe/webhook)
                    │
                    ├── MySQL Database (TiDB)
                    ├── S3 Storage (file uploads)
                    ├── Manus LLM API (AI generation)
                    ├── Manus Image API (cover generation)
                    ├── Manus Whisper API (transcription)
                    ├── Canva MCP (design generation)
                    └── Stripe API (payments)
```

---

## Troubleshooting

### Build fails: "Cannot find module"
```bash
pnpm install --frozen-lockfile
pnpm check  # TypeScript check
```

### Database connection error w Vercel
- Sprawdź czy `DATABASE_URL` jest ustawiony w Vercel env
- TiDB wymaga SSL: dodaj `?ssl={"rejectUnauthorized":true}` do connection string

### Stripe webhook 400
- Sprawdź `STRIPE_WEBHOOK_SECRET` — musi być z aktualnego endpointu w Stripe Dashboard
- Endpoint: `https://your-domain.vercel.app/api/stripe/webhook`

### Canva MCP nie działa w produkcji
- Canva MCP działa tylko w środowisku Manus (sandbox z `manus-mcp-cli`)
- W produkcji Vercel: Canva features są niedostępne — dodaj fallback w `canva-mcp.ts`

---

## Szybki Start (5 minut do produkcji)

```bash
# 1. Kliknij Publish w Manus UI — gotowe!
# LUB
# 2. GitHub Actions (po dodaniu secrets):
git push origin main
# → Automatyczny deploy w ~8 minut
```
