# Backend ULYSSE 70 — API Express + moteur partagé.
FROM node:22-alpine

WORKDIR /app

# Tous les manifestes du workspace sont nécessaires pour résoudre l'arbre npm
# (le filtre --workspace n'installe que les deps des workspaces ciblés).
COPY package.json package-lock.json ./
COPY packages/moteur/package.json ./packages/moteur/package.json
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

# Installe uniquement les dépendances de production du workspace.
RUN npm install --omit=dev --workspace=backend --workspace=packages/moteur

COPY packages/moteur ./packages/moteur
COPY backend ./backend

ENV NODE_ENV=production
WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "src/server.js"]
