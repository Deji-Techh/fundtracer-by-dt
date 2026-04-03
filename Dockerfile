FROM node:20-slim

WORKDIR /app

COPY package.json \
      packages/core/package.json \
      packages/server/package.json \
      packages/cli/package.json \
      packages/web/package.json \
      packages/video/package.json \
      packages/extension/package.json \
      packages/api/package.json \
      packages/admin/package.json ./

RUN npm install --workspaces

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN npm run build --workspace=fundtracer-core && \
    npm run build --workspace=@fundtracer/server

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
