FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache postgresql16-client

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["npm", "start"]