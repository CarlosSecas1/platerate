# PlateRate

PlateRate helps independent restaurants build a fair, data-informed price range for creator promotional videos. It combines audience size, engagement, campaign scope, usage rights, exclusivity, and travel into an explainable planning estimate.

## Features

- Live creator campaign price estimates
- Public YouTube subscriber lookup by channel handle
- Transparent pricing-factor breakdown
- Side-by-side comparison for up to three creators
- Estimated cost per 1,000 views
- Ready-to-copy negotiation message
- Responsive, accessible blue-and-white interface

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, CSS
- **Backend:** Python 3 HTTP service
- **API integration:** YouTube Data API v3
- **Testing:** Node test runner and Python `unittest`

## Architecture

```text
Browser
  ├── Next.js application
  │     └── /api/youtube → YouTube Data API
  └── /api/estimate → Python pricing service
```

The browser calculates an immediate fallback estimate if the optional Python service is unavailable. The YouTube API key is only read by the server-side Next.js route.

## Local setup

### Frontend

Requirements: Node.js 22 or newer.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`.

### Python pricing service

In a second terminal:

```bash
cd backend
python3 app.py
```

The API will listen on `http://127.0.0.1:8000`.

To enable YouTube lookup, add your own server-side key to `.env.local`:

```env
YOUTUBE_API_KEY=your_key_here
```

Never commit a real API key.

## Tests

```bash
pnpm test
pnpm build
pnpm lint
```

## Pricing disclaimer

PlateRate provides planning estimates only. Actual creator fees and campaign performance vary by creator, market, audience quality, production requirements, and negotiated terms.

## Roadmap

- Campaign history and status tracking
- Actual-results and ROI reporting
- Authentication and persistent storage
- Instagram and TikTok data integrations through approved providers
- AWS deployment and observability

## License

Released under the [MIT License](LICENSE).
