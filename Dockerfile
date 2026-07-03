FROM node:20-slim

WORKDIR /app

COPY dashboard-app/package.json dashboard-app/package-lock.json ./dashboard-app/
RUN cd dashboard-app && npm install --production

COPY dashboard-app ./dashboard-app

WORKDIR /app/dashboard-app
EXPOSE 3001
CMD ["node", "server.js"]
