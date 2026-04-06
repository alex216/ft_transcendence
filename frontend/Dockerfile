FROM node:22-alpine

WORKDIR /app

COPY .npmrc ./
COPY frontend/package*.json ./
RUN npm install && npm rebuild esbuild

COPY frontend/ .

EXPOSE 3001

CMD ["npm", "run", "dev"]
