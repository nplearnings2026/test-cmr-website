# CRM Dashboard

This repository contains the Manufacturing Operations Dashboard web app.

## Repository

Remote: https://github.com/nplearnings2026/test-cmr-website

## Structure

- `dashboard-app/` - React + Express application
- `dashboard-app/json/` - year-based JSON data files (`2024.json`, `2025.json`, `2026.json`)

## Local development

```bash
cd dashboard-app
npm install
npm run dev
```

The app runs on `http://localhost:3000` and the API proxy is served from `http://localhost:3001`.

## Production run

```bash
cd dashboard-app
npm install
npm run build
npm start
```

## Docker deployment

Build and run the container:

```bash
docker build -t crm-dashboard .
docker run -p 3001:3001 crm-dashboard
```

Then open `http://localhost:3001`.

## Deployment options

Because this project includes an Express backend, the simplest deployment paths are container-friendly hosts such as Render, Railway, or any Docker-compatible service.

### GitHub Actions + GHCR

A GitHub Actions workflow is included at `.github/workflows/docker-publish.yml`. On every push to `main`, it builds the Docker image and pushes it to GitHub Container Registry as:

- `ghcr.io/${{ github.repository_owner }}/test-cmr-website:latest`
- `ghcr.io/${{ github.repository_owner }}/test-cmr-website:${{ github.sha }}

### Fly.io deployment

A Fly.io deployment workflow is included at `.github/workflows/fly-deploy.yml`. To use it, add these GitHub repository secrets:

- `FLY_API_TOKEN` — Fly.io API token
- `FLY_APP_NAME` — Fly app name (defaults to `test-cmr-website` if unset)
- `GHCR_USERNAME` — GitHub username (if the image is private)
- `GHCR_TOKEN` — GitHub token or PAT for GHCR access (if the image is private)

Before using the workflow, create the Fly app and a persistent volume for JSON storage:

```bash
flyctl apps create test-cmr-website --region your-region
flyctl volumes create dashboard-json --region your-region --size 1
```

The app configuration is stored in `fly.toml`, and the volume is mounted into `/app/dashboard-app/json`.

### Self-hosted Docker deployment

This workflow also supports deploying to a self-hosted Docker host via SSH. To enable it, add the following repository secrets in GitHub:

- `SSH_HOST` — hostname or IP of your Docker host
- `SSH_USERNAME` — SSH user
- `SSH_PRIVATE_KEY` — private key contents for SSH login
- `REMOTE_JSON_DIR` — host directory to persist JSON files
- `SSH_PORT` — optional SSH port (default is `22`)
- `GHCR_USERNAME` — GitHub username for container registry authentication (optional if the image is public)
- `GHCR_TOKEN` — PAT or token for GHCR login (optional if the image is public)

The deployment step will:

1. create the remote JSON directory if needed
2. pull the latest image from GHCR
3. stop and remove any existing `crm-dashboard` container
4. run a new container with:
   - port `3001` exposed
   - `REMOTE_JSON_DIR` mounted into `/app/dashboard-app/json`

Make sure Docker is installed on the target host and that port `3001` is available.

If you want a full deployment, connect that container image to any Docker host or managed service.

If you want to deploy on a platform that supports containers, use the included `Dockerfile`.

## Notes

- The refresh button fetches updated CRM data and writes it into the current year JSON file.
- The app expects year files under `dashboard-app/json/`.
