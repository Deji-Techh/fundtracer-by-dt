FROM node:20-slim

WORKDIR /app

COPY packages/server/package.json packages/server/
COPY packages/core/package.json packages/core/
COPY package.json ./
COPY tsconfig.json ./

RUN npm install --workspaces

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN npm run build --workspace=fundtracer-core && \
    npm run build --workspace=@fundtracer/server

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
