FROM node:24-bookworm-slim

WORKDIR /app

COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node public ./public

ENV NODE_ENV=production
ENV DASHBOARD_PORT=8080

USER node
EXPOSE 8080

CMD ["node", "server.mjs"]
