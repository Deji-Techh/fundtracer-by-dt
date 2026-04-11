FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY package-lock.json* ./

RUN npm install

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/
COPY packages/web/ packages/web/

RUN cd packages/core && npm install && npm run build && \
    cd ../server && npm install && npm run build && \
    cd ../web && npm install && npm run build

EXPOSE 8080

CMD ["node", "packages/server/dist/index.js"]