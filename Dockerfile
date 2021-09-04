ARG NODE_VERSION="14"
ARG ALPINE_VERSION="3.14"

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} as base
RUN apk add --no-cache --update bash openssh-keygen openssl zip
SHELL ["bash", "-c"]
WORKDIR /usr/src/app/


FROM base as dependencies
COPY package*.json yarn.lock ./
RUN yarn install --production
WORKDIR /usr/src/app/build/
COPY build-ci/package*.json build-ci/yarn.lock ./
RUN yarn install --production
WORKDIR /usr/src/app/


FROM dependencies as dev
ENTRYPOINT [ "bash" ]


FROM dependencies as app
COPY . .
ENTRYPOINT [ "yarn", "build:ci" ]
