FROM node:20-slim

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./

RUN npm install

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN cd packages/core && npm install && npm run build && \
    cd ../server && npm install && npm run build

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]