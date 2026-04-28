## Shoot — AI Headshot Generator

Premium minimal Next.js app that takes a user photo and generates a professional headshot via FAL.

### Run locally

1. Add your FAL key to `.env.local`:

- `FAL_KEY="key_id:key_secret"`

2. Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Stripe (download paywall)

- If `STRIPE_SECRET_KEY` is **not** set, the “Pay to download” button will **simulate** payment in dev so you can test the UX.
- When you’re ready, set `STRIPE_SECRET_KEY` in `.env.local` to enable real Checkout.

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
