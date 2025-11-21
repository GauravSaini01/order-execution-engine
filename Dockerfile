FROM node:20-alpine

RUN apk add --no-cache bash postgresql redis

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN npm run build

COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

EXPOSE 3000 6379 5432

CMD ["/usr/src/app/entrypoint.sh"]
