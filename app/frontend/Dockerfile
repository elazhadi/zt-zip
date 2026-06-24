# Frontend ULYSSE 70 — build Vite, servi par nginx.
FROM node:22-alpine AS build

WORKDIR /app

# Tous les manifestes du workspace (résolution de l'arbre npm).
COPY package.json package-lock.json ./
COPY packages/moteur/package.json ./packages/moteur/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json

RUN npm install --workspace=frontend --workspace=packages/moteur

COPY packages/moteur ./packages/moteur
COPY frontend ./frontend

RUN npm run build --workspace=frontend

# --- Étape de service ---
FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
