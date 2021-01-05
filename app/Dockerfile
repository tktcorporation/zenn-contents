FROM node:14-alpine

WORKDIR /app
RUN apk add --no-cache git

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm install

COPY articles articles
COPY books books

EXPOSE 8000

CMD ["npx", "zenn", "preview"]