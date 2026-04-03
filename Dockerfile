FROM node:20-slim

WORKDIR /app

COPY package.json packages/core/package.json packages/server/package.json ./

RUN npm install && \
    cd packages/core && npm install && \
    cd ../server && npm install

COPY packages/core/ packages/core/
COPY packages/server/ packages/server/

RUN cd packages/core && npm run build

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
