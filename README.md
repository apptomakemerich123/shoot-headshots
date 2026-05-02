## Portr — AI headshots

Next.js app: upload one photo, pay once, get **40** AI headshot variations (stored server-side by Stripe session).

### Run locally

1. Add secrets to `.env.local`:

- `FAL_KEY="key_id:key_secret"` — browser uploads zip/preview to FAL CDN only.
- `ASTRIA_API_KEY="sd_..."` — Astria fine-tuning + headshot generation.
- `ASTRIA_WEBHOOK_BASE="https://xxxx.ngrok-free.app"` — required so Astria can `POST` tune/prompt callbacks when not on Vercel (or set `NEXT_PUBLIC_APP_URL` to the same HTTPS origin).

2. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Stripe

- Set `STRIPE_SECRET_KEY` for Checkout ($29 product configured in code).
- Without KV, uploads/orders persist in `.data/portr-store.json` locally. Use `PORT_MEMORY_STORE_ONLY=1` only if you explicitly want RAM-only storage.

### Astria callbacks

- Production: deploy on Vercel so `VERCEL_URL` resolves; tune + prompt webhooks hit **`/api/webhook/astria`** automatically (query params include Stripe `session_id`).
- Add **`ASTRIA_API_KEY`** in Vercel environment variables.

### Resend (ready email)

- Set `RESEND_API_KEY` so customers get the ready email after all 40 images land (Astria **`POST /api/webhook/astria`** completes the order; Stripe **`POST /api/webhook`** starts training).
- Ready emails link to **`https://www.getportr.com/results/{session_id}`** by default. Override with `EMAIL_RESULTS_ORIGIN` (e.g. `http://localhost:3000`) for local testing.
- Stripe Dashboard: endpoint URL **`https://www.getportr.com/api/webhook`** (or your deploy URL + `/api/webhook`), event **`checkout.session.completed`**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
