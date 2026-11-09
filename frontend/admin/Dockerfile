# Development image: runs `next dev` against a bind-mounted source tree
# (see compose.yaml) for hot reload, mirroring how backend/compose.yaml
# runs the Laravel app via Sail. Not a production image.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
