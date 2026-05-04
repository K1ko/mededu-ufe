### compilation stage
FROM node:latest AS build

RUN mkdir /build
WORKDIR /build

COPY package.json .
RUN npm install

COPY . .
RUN npm run build

### BackEnd for FrontEnd runtime used by Polyfea
FROM ghcr.io/polyfea/spa-base

COPY --from=build /build/www /spa/public

ENV OTEL_SERVICE_NAME=kcrp-mededu-ufe
ENV SPA_BASE_PORT=8080
EXPOSE 8080
