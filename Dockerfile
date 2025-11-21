FROM node:20-alpine

RUN apk add --no-cache bash postgresql redis

RUN adduser -D appuser
USER appuser

WORKDIR /home/appuser/app

COPY package*.json ./
RUN npm install
RUN npm install --save-dev @types/node @types/pg @types/ws

COPY . .

RUN npm run build

COPY entrypoint.sh /home/appuser/app/entrypoint.sh
RUN chmod +x /home/appuser/app/entrypoint.sh

EXPOSE 3000 6379 5432

CMD ["/home/appuser/app/entrypoint.sh"]
