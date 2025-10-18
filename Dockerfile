FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --progress=false

# Prisma schema จะมาจาก bind-mount เช่นกัน
EXPOSE 5001
CMD ["npm","run","start:dev"]
