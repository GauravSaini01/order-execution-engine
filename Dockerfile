FROM node:20-alpine AS builder

RUN adduser -D appuser

WORKDIR /home/appuser/app
RUN chown -R appuser:appuser /home/appuser/app

COPY --chown=appuser:appuser package*.json ./

USER appuser

RUN npm ci 

COPY --chown=appuser:appuser . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /home/appuser/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /home/appuser/app/dist ./dist

USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]