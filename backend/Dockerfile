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
