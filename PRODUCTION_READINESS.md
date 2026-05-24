# Production Readiness Checklist

This file summarizes the changes and recommended next steps to deploy this project to production.

- Added `Dockerfile` (multi-stage) to build the frontend and run the Node server.
- Added `.dockerignore` to keep images small and avoid leaking secrets.
- Added `.github/workflows/ci.yml` to run `npm ci`, `npm run lint` and `npm run build` on push/PR.
- `.env.example` already exists; ensure real secrets are provided via your deployment platform (Vercel, Koyeb, Docker secrets, etc.).
- Server already includes security middleware: `helmet`, `compression`, `express-rate-limit`, `hpp`, and CORS whitelist logic.

Recommended next steps:

1. Run `npm ci` and `npm run build` locally to verify builds.
2. Add runtime monitoring (Sentry, LogDNA) and health checks to your deployment platform.
3. Configure environment variables in the hosting platform — never commit real secrets.
4. Consider adding `PM2` or a process manager when running outside containers.
5. Add routine backup and DB monitoring for MongoDB.

Deployment example (Docker):

Build image:

```bash
docker build -t quiz-platform:latest .
```

Run container (example using env file):

```bash
docker run -p 5000:5000 --env-file .env.production quiz-platform:latest
```
