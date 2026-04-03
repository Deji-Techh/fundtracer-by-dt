FROM node:20-slim

WORKDIR /app

COPY package.json packages/core/package.json packages/server/package.json ./

RUN npm install

COPY packages/core/ packages/core/
RUN cd packages/core && npm run build

COPY packages/server/ packages/server/
RUN cd packages/server && npm run build

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
