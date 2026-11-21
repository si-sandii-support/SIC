FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --omit=dev
COPY packages/shared packages/shared
COPY apps/backend apps/backend
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["node", "src/server.js"]
