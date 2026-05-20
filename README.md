# NeuroRepo — Frontend

This is the Next.js 16 frontend and serverless API layer for **NeuroRepo**.

For full documentation — tech stack, architecture, features, and real-world problem statement — see the [Root README](../README.md).

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — paste any public GitHub URL and hit **Analyze**.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | GitHub PAT for API access ([generate here](https://github.com/settings/tokens)) |
| `UPSTASH_REDIS_REST_URL` | Production | Auto-injected via Vercel Storage marketplace |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Auto-injected via Vercel Storage marketplace |

Create a `.env.local` file:

```env
GITHUB_TOKEN=ghp_your_token_here
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
