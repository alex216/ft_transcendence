FROM node:22-alpine

WORKDIR /usr/src/app

# COPY package.json package-lock.json ./

COPY . .

RUN npm install

CMD ["sh", "-c", "npm run start:dev"]