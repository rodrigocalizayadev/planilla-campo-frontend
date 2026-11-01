# syntax=docker/dockerfile:1

# La CI pasa NODE_VERSION desde .nvmrc; el default es solo para builds locales.
ARG NODE_VERSION=24

# --- Build: los tests corren en CI, no acá.
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npx ng build --configuration production

# --- Runtime: nginx sin root, escucha en 8080 dentro del contenedor.
FROM nginxinc/nginx-unprivileged:1.30-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist/planilla-campo-frontend/browser /usr/share/nginx/html
EXPOSE 8080
