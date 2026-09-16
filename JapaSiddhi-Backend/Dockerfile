# Node 22+ is required by better-sqlite3; the package ships a musl prebuild,
# so Alpine needs no compiler toolchain.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV DB_ENGINE=sqlite
ENV SQLITE_PATH=/var/data/japa_siddhi.sqlite

EXPOSE 5000

CMD ["npm", "start"]
