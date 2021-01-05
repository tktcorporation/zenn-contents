FROM node:14-alpine

WORKDIR /app
RUN apk add --no-cache --virtual .build-deps git \
    && npm init --yes \
    && npm install zenn-cli \
    && npx zenn init \
    && apk del .build-deps
COPY articles articles
COPY books books

EXPOSE 8000

CMD ["npx", "zenn", "preview"]