# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev       # Start dev server (localhost:5173)
npm run build     # Production build → dist/
npm run lint      # ESLint checks
npm run preview   # Preview production build

# Firebase Functions (from genesisfunctions/)
npm run serve     # Local Firebase emulator
npm run deploy    # Deploy functions only
```

No test suite is configured.

## Architecture

**Genesis Airsoft** is a React 19 + Vite e-commerce SPA for airsoft equipment, deployed on Firebase Hosting with Node.js Cloud Functions.

### State Management

Three React Context providers wrap the app (no Redux):

- **AuthContext** (`src/context/`) — Firebase Auth user, `isAdmin` role (from JWT custom claims), session persistence via `browserSessionPersistence`. Clears MP redirect tokens after Mercado Pago returns.
- **CartContext** — Cart items synced to Firestore at `/carts/{userId}/items`. Skips loading on `/checkout-success` to avoid race conditions.
- **CheckoutContext** — Checkout form state. Pre-fills name/email from Firebase user; locks email for logged-in users.

### Routing

React Router v7. Admin routes (`/admin/*`) are guarded by `AdminRoute.jsx`, which checks both `user` and `isAdmin` from AuthContext.

### Firebase Integration (`src/firebase/`)

- `config.js` — Firebase init and auth configuration
- `db.js` — Firestore queries for products and categories
- `uploadProductImage.js` — Firebase Storage uploads for admin product management

### Cloud Functions (`genesisfunctions/index.js`)

ESM Node.js 22. Key responsibilities:
- Create Mercado Pago payment preferences and Firestore orders
- Handle MP webhooks to update order status
- Send email notifications via Nodemailer (Gmail)
- CORS whitelist: `localhost:5173`, `genesis-airsoft.web.app`, `genesisairsoft.com.ar`

Secrets are stored in Firebase Secret Manager: `MP_ACCESS_TOKEN`, `GMAIL_EMAIL`, `GMAIL_PASSWORD`.

### Payment Flow

Checkout → order created in Firestore → MP preference generated via Cloud Function → redirect to MP → webhook updates order status → user lands on `/checkout-success|failure|pending`.

Key business constants in `Checkout.jsx`:
- `FREE_SHIPPING_FROM = 350_000` ARS
- `SHIPPING_COST = 16_000` ARS

### Firestore Collections

`products`, `categories`, `carts/{userId}`, `orders`

### Styling

Per-component CSS files. `useIsMobile.js` hook (768px breakpoint) drives mobile-specific layout. Dark/light mode is toggled globally.
