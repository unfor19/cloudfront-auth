FROM node:14-alpine3.14 as base
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
