FROM node:20-alpine

RUN apk add --no-cache bash postgresql redis

RUN adduser -D appuser

WORKDIR /home/appuser/app

COPY --chown=appuser:appuser package*.json ./

USER appuser

RUN npm install
RUN npm install --save-dev @types/node @types/pg @types/ws

COPY --chown=appuser:appuser . .

RUN npm run build

COPY --chown=appuser:appuser entrypoint.sh /home/appuser/app/entrypoint.sh
RUN chmod +x /home/appuser/app/entrypoint.sh

EXPOSE 3000 6379 5432

CMD ["/home/appuser/app/entrypoint.sh"]
