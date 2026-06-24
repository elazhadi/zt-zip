# Image « tout-en-un » pour déploiement provisoire / mono-service :
# build le frontend, puis le backend Node qui sert l'API ET le frontend buildé.
# Une seule origine → pas de CORS, pas de proxy, une seule URL.
#
# Build : docker build -f app/Dockerfile -t ulysse70 app
# (contexte = dossier app/)

# --- Étape 1 : build du frontend ---
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/moteur/package.json ./packages/moteur/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install
COPY packages/moteur ./packages/moteur
COPY frontend ./frontend
# Pas de VITE_API_URL → le frontend appelle /api en relatif (même origine).
RUN npm run build --workspace=frontend

# --- Étape 2 : backend + frontend buildé ---
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/moteur/package.json ./packages/moteur/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install --omit=dev --workspace=backend --workspace=packages/moteur
COPY packages/moteur ./packages/moteur
COPY backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV STATIC_DIR=/app/frontend/dist
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "src/server.js"]
