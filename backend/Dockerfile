FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN ./wait_db_script.sh

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
