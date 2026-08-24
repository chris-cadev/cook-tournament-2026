<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> orchestrator/task-8-milestone-8-file-upload-multimedia-chat
FROM node:20-alpine

WORKDIR /app

<<<<<<< HEAD
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc
=======
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY dist/ ./dist/
COPY src/migrations/ ./dist/migrations/
>>>>>>> orchestrator/task-8-milestone-8-file-upload-multimedia-chat

RUN mkdir -p data

EXPOSE 3001

CMD ["node", "dist/index.js"]
<<<<<<< HEAD
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
=======
=======
>>>>>>> orchestrator/task-6-milestone-6-score-reveal-ux
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
RUN mkdir -p data
EXPOSE 3001
CMD ["node", "dist/index.js"]
<<<<<<< HEAD
>>>>>>> orchestrator/task-6-milestone-6-score-reveal-ux
=======
>>>>>>> orchestrator/task-6-milestone-6-score-reveal-ux
=======
>>>>>>> orchestrator/task-8-milestone-8-file-upload-multimedia-chat
