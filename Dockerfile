FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY packages/core/package.json packages/core/package.json
COPY packages/server/package.json packages/server/package.json

RUN npm ci --workspaces

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN npm run build --workspace=@fundtracer/server

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace=@fundtracer/server"]
