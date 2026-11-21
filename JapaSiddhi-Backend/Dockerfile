# Node 22+ is required by better-sqlite3; the package ships a musl prebuild,
# so Alpine needs no compiler toolchain.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DB_ENGINE=postgres
# Only set SQLITE_PATH when a persistent disk is mounted (e.g. Render Mount Path /var/data).
# Leaving it unset avoids EACCES mkdir '/var/data' on hosts without that disk.
# ENV SQLITE_PATH=/var/data/japa_siddhi.sqlite

EXPOSE 5000

CMD ["npm", "start"]
