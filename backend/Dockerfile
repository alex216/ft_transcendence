FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY .npmrc ./
COPY backend/package*.json ./
RUN npm install && npm rebuild bcrypt

COPY backend/ .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
