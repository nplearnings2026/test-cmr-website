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

If you want to deploy on a platform that supports containers, use the included `Dockerfile`.

## Notes

- The refresh button fetches updated CRM data and writes it into the current year JSON file.
- The app expects year files under `dashboard-app/json/`.
