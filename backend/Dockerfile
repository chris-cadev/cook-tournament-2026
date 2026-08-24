<<<<<<< HEAD
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

RUN mkdir -p data

EXPOSE 3001

CMD ["node", "dist/index.js"]
=======
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY backend/package.json backend/
RUN cd backend && npm install
COPY backend/ backend/
RUN cd backend && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend/package.json /app/backend/
RUN cd /app/backend && npm install --omit=dev
COPY --from=builder /app/backend/dist /app/backend/dist
COPY backend/migrations /app/backend/migrations
EXPOSE 3001
CMD ["node", "backend/dist/index.js"]
>>>>>>> orchestrator/task-3-milestone-3-team-dashboard
