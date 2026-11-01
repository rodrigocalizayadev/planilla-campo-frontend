# Guía: pipeline de CI/CD del frontend (Angular)

Guía para armar el pipeline del repo del frontend siguiendo los mismos lineamientos que el
backend (`planilla-campo-backend`). Ambos repos están en la misma cuenta de GitHub
(`rodrigo906`) y se despliegan en el **mismo servidor** con el **mismo usuario `deploy`**.

Referencia del backend: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`,
`deploy/deploy.sh`, `deploy/docker-compose.prod.yml`, `docs/despliegue.md`.

---

## 1. Lineamientos que NO se negocian

Son decisiones ya tomadas en el backend. El front las replica tal cual.

| # | Regla | Cómo se aplica en el front |
|---|---|---|
| 1 | El PR solo verifica, **no despliega** | `ci.yml` corre en PR hacia `dev` y `master` |
| 2 | Se despliega **al mergear a `master`** | `deploy.yml` en `push` a `master` + `workflow_dispatch` |
| 3 | El deploy **vuelve a verificar** antes de construir | `deploy.yml` llama a `ci.yml` con `workflow_call` (la cuenta es Free y la protección de ramas no aplica en repos privados) |
| 4 | **Versión = la del manifiesto del proyecto**, a mano | `version` de `package.json`. Nada de semver automático, release-please ni tags de git |
| 5 | Una versión de release publicada es **inmutable** | Si la versión no es prerelease y ya existe en GHCR, el workflow falla. Prerelease (`1.2.0-SNAPSHOT`, cualquier versión con `-`) sí se republica |
| 6 | Imagen con **tres tags**: `:<sha>`, `:<version>`, `:latest` | Igual |
| 7 | El servidor despliega **siempre por SHA** | Nunca `latest` ni versión |
| 8 | **Retención de 2 imágenes** (actual + anterior) | En GHCR y en el servidor, limpiando **solo después de un deploy sano** |
| 9 | **Health check + rollback automático** | `deploy.sh` verifica el contenedor y vuelve al SHA anterior si falla |
| 10 | **Un deploy a la vez** | `concurrency` con `cancel-in-progress: false` |
| 11 | El contenedor escucha **solo en `127.0.0.1`** | El acceso público va por el reverse proxy con HTTPS (pendiente, compartido) |
| 12 | **Sin secretos en el repo** | Solo `deploy/.env.example` con placeholders; el `.env` real se crea a mano en el servidor |
| 13 | El token de GHCR **no queda en el servidor** | Viaja por stdin, `docker login` → pull → `docker logout` |

---

## 2. Valores que cambian respecto del backend

Elegir y fijar estos valores antes de escribir nada. **No pueden chocar con los del backend.**

| Concepto | Backend | Frontend (propuesto) |
|---|---|---|
| Imagen | `ghcr.io/rodrigo906/planilla-campo-backend` | `ghcr.io/rodrigo906/<nombre-repo-front>` (en minúsculas, GHCR lo exige) |
| `package-name` en la limpieza de GHCR | `planilla-campo-backend` | `<nombre-repo-front>` |
| Directorio en el servidor | `/home/deploy/planilla-campo` | `/home/deploy/planilla-campo-front` |
| `name:` del compose (proyecto Docker) | `planilla-campo` | `planilla-campo-front` |
| Puerto en el host | `127.0.0.1:8080` | `127.0.0.1:8081` (**8080 está ocupado por la API**) |
| `concurrency.group` | `deploy-production` | `deploy-production-front` |
| Health check | `/actuator/health` | `/healthz` (lo sirve nginx, ver §5) |
| Versión | `<version>` de `pom.xml` | `version` de `package.json` |

---

## 3. Cómo llega el front a la API: mismo origen

**El backend no tiene configuración de CORS.** La decisión que lo evita es servir front y API
bajo el **mismo dominio**:

```
https://<dominio>/api/*  → reverse proxy → 127.0.0.1:8080 (API)
https://<dominio>/*      → reverse proxy → 127.0.0.1:8081 (front)
```

Consecuencias para el front:

- Las llamadas HTTP usan rutas **relativas**: `/api/lotes`, nunca `http://host:8080/api/...`.
- La **misma imagen** sirve para cualquier entorno: no se hornea la URL de la API en el build.
- En desarrollo local se usa el proxy del dev server de Angular (`proxy.conf.json`
  apuntando `/api` a `http://localhost:8080`).
- El nginx del contenedor del front **no** hace de proxy hacia la API: son stacks de compose
  distintos, en redes distintas. Ese ruteo es del reverse proxy del servidor.

El reverse proxy (Caddy o Traefik) con HTTPS **todavía no existe**; es infraestructura
compartida y queda fuera de este pipeline. Hasta tenerlo, el front tampoco es accesible
públicamente, igual que la API.

---

## 4. Estructura de archivos del repo del front

```
.github/workflows/
├── ci.yml                  PR → lint + tests + build
└── deploy.yml              merge a master → verify → imagen → deploy
deploy/
├── deploy.sh               deploy por SHA + health check + rollback + limpieza
├── docker-compose.prod.yml solo el servicio web
└── .env.example            placeholders (puerto/bind)
nginx/
└── default.conf            SPA fallback + /healthz + caché de assets
Dockerfile
.dockerignore
.nvmrc                      versión de Node fijada en un solo lugar
```

---

## 5. Plantillas

Son **esqueletos de referencia**. Ajustar a la versión de Angular y al runner de tests que
use el proyecto; no asumir desde memoria.

### 5.1 `ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [master, dev]
  workflow_call:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci
      - run: npm run lint            # si el proyecto tiene lint configurado
      # Tests sin modo watch. Si el runner es Karma, además --browsers=ChromeHeadless.
      - run: npx ng test --watch=false
      - run: npx ng build --configuration production
```

El job se llama `verify`, igual que en el backend, para que el check tenga el mismo nombre.

### 5.2 `deploy.yml`

Misma forma que el del backend. Diferencias marcadas con `# FRONT`.

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

concurrency:
  group: deploy-production-front            # FRONT
  cancel-in-progress: false

permissions:
  contents: read

env:
  IMAGE: ghcr.io/rodrigo906/<nombre-repo-front>   # FRONT: minúsculas, igual que en el compose
  DEPLOY_DIR: planilla-campo-front                # FRONT

jobs:
  verify:
    uses: ./.github/workflows/ci.yml

  image:
    needs: verify
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v5

      - name: Leer versión del package.json      # FRONT
        id: version
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Una versión de release es inmutable; solo una prerelease (con "-") puede republicarse.
      - name: Verificar que la versión no esté publicada
        if: ${{ !contains(steps.version.outputs.version, '-') }}
        env:
          VERSION: ${{ steps.version.outputs.version }}
        run: |
          if docker buildx imagetools inspect "$IMAGE:$VERSION" > /dev/null 2>&1; then
            echo "::error::La versión $VERSION ya está publicada. Subí version en package.json."
            exit 1
          fi

      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          provenance: false   # sin attestations: la limpieza cuenta imágenes reales
          tags: |
            ${{ env.IMAGE }}:${{ github.sha }}
            ${{ env.IMAGE }}:${{ steps.version.outputs.version }}
            ${{ env.IMAGE }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: image
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      packages: write
    steps:
      # Copiar sin cambios del backend: "Configurar SSH", "Copiar archivos de deploy"
      # y "Desplegar" (token por stdin, login → deploy.sh <sha> → logout).

      - name: Limpiar versiones viejas en GHCR
        uses: actions/delete-package-versions@v5
        with:
          package-name: <nombre-repo-front>   # FRONT
          package-type: container
          min-versions-to-keep: 2
```

### 5.3 `Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1

# --- Build: los tests corren en CI, no acá.
FROM node:<version-de-.nvmrc>-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npx ng build --configuration production

# --- Runtime: nginx sin root.
FROM nginxinc/nginx-unprivileged:<version>-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# Con el builder "application" (Angular 17+) el output está en dist/<proyecto>/browser.
COPY --from=build /build/dist/<proyecto>/browser /usr/share/nginx/html
EXPOSE 8080
```

- La versión de Node sale de `.nvmrc` (un solo lugar, misma lección que `mysql:8.4` en el
  backend, que hoy está repetida en tres archivos y no debería).
- `nginx-unprivileged` escucha en `8080` **dentro** del contenedor; en el host se publica en
  `127.0.0.1:8081`. No hay choque: son puertos de espacios distintos.
- `.dockerignore` mínimo: `node_modules`, `dist`, `.angular`, `.git`.

### 5.4 `nginx/default.conf`

```nginx
server {
    listen 8080;
    root /usr/share/nginx/html;

    location = /healthz {
        access_log off;
        default_type text/plain;
        return 200 "ok";
    }

    # index.html nunca se cachea: así un deploy nuevo se ve sin forzar recarga.
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # Los bundles llevan hash en el nombre: se pueden cachear para siempre.
    location ~* \.(?:js|css|woff2?|png|jpg|svg|ico)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    # Fallback de SPA: cualquier ruta del router de Angular devuelve index.html.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 5.5 `deploy/docker-compose.prod.yml`

```yaml
name: planilla-campo-front

services:
  web:
    image: ghcr.io/rodrigo906/<nombre-repo-front>:${IMAGE_TAG:?falta IMAGE_TAG (lo escribe deploy.sh)}
    restart: unless-stopped
    ports:
      # Solo localhost: el acceso público va por el reverse proxy con HTTPS.
      - "${WEB_BIND:-127.0.0.1}:${WEB_PORT:-8081}:8080"
```

### 5.6 `deploy/deploy.sh`

Copiar el `deploy/deploy.sh` del backend y cambiar **solo**:

| Qué | Backend | Frontend |
|---|---|---|
| Servicio en `compose pull` / `logs` | `api` | `web` |
| Variable de puerto leída del `.env` | `API_PORT` (default `8080`) | `WEB_PORT` (default `8081`) |
| URL del health check | `/actuator/health` | `/healthz` |
| Reintentos del health check | 36 × 5 s (la JVM tarda) | ~12 × 5 s alcanza para nginx |
| `image=` en `remove_old_images` | `.../planilla-campo-backend` | `.../<nombre-repo-front>` |

Se mantiene todo lo demás: `set -eu`, `image.env` con el SHA, rollback al `PREVIOUS_TAG` y
limpieza de imágenes **solo si el deploy quedó sano**.

**Ojo**: el `.env` del front no tiene secretos (el front es estático), pero `deploy.sh`
exige que exista. Crearlo igual en el servidor a partir de `.env.example`.

---

## 6. Configuración inicial (una sola vez)

### Servidor

El usuario `deploy` ya existe y ya está en el grupo `docker`. Solo hace falta el directorio:

```bash
sudo -u deploy mkdir -p /home/deploy/planilla-campo-front
sudo -u deploy nano /home/deploy/planilla-campo-front/.env   # a partir de deploy/.env.example
sudo chmod 600 /home/deploy/planilla-campo-front/.env
```

### Clave SSH

Recomendado: **una clave dedicada por repo**, instalada en el mismo
`/home/deploy/.ssh/authorized_keys`. Así se puede revocar el acceso de un repo sin cortar el
otro. Reutilizar la del backend funciona, pero ata la revocación de ambos.

Mismo procedimiento que `docs/despliegue.md` §2 del backend, con comentario
`github-actions-planilla-campo-front` y generando la clave en `~/.ssh/`, **no** en el repo.

### GitHub (repo del front)

Los environments y sus secrets son **por repo**: hay que crearlos de nuevo en el front.

*Settings → Environments* → `production` con: `SSH_HOST`, `SSH_USER` (`deploy`),
`SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS`. Mismos valores de host que el backend; la clave
privada es la del front.

---

## 7. Errores que ya nos pasaron en el backend

| Síntoma | Causa | Prevención en el front |
|---|---|---|
| `TARGET: @` en el log del deploy | Secrets vacíos: GitHub **crea solo** un environment vacío si el workflow referencia uno que no existe | El nombre del environment en `deploy.yml` y en *Settings* tiene que coincidir exacto (`production`) |
| `Permission denied` al ejecutar un script en CI | Archivo commiteado desde Windows sin bit de ejecución | `git update-index --chmod=+x deploy/deploy.sh` (en el server se invoca con `sh`, pero conviene tenerlo bien) |
| `ssh-copy-id deploy@host` falla | `deploy` no tiene contraseña | Instalar la clave pública desde la sesión de root |
| Host key verification failed | `ssh-keyscan` contra un host distinto de `SSH_HOST` | Usar exactamente el mismo valor (IP o dominio) en ambos |
| Clave privada en la raíz del repo | `ssh-keygen -f deploy_key` con ruta relativa | `ssh-keygen -f ~/.ssh/deploy_key_front` |
| Fingerprints que "no coinciden" | Se comparó el de la deploy key con el de la host key | Comparar `ssh-keyscan ... \| ssh-keygen -lf -` contra `/etc/ssh/ssh_host_ed25519_key.pub` |

---

## 8. Checklist de aceptación

- [ ] Un PR hacia `dev` o `master` corre `verify` (lint, tests, build) y no despliega.
- [ ] Un merge a `master` vuelve a correr `verify` antes de construir la imagen.
- [ ] La imagen se publica con `:<sha>`, `:<version>` y `:latest`.
- [ ] Repetir un merge sin subir una versión de release hace fallar el workflow.
- [ ] El servidor despliega por SHA en `/home/deploy/planilla-campo-front`.
- [ ] `curl http://127.0.0.1:8081/healthz` responde `ok` en el servidor.
- [ ] Una ruta profunda del router (ej. `/lotes/1`) devuelve `index.html`, no 404.
- [ ] Un deploy con health check fallido vuelve solo al SHA anterior.
- [ ] Tras un deploy sano quedan 2 versiones en GHCR y 2 imágenes en el servidor.
- [ ] El stack de la API (`planilla-campo`) no se tocó: `docker compose ls` muestra ambos.
- [ ] Ningún secreto en el repo; las llamadas a la API usan rutas relativas `/api/...`.
