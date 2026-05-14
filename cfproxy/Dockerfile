FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
ENV PORT=3000
ENV PROXY_PASSWORD=123
ENV SHOW_PASSWORD_PAGE=true
ENV LOG_LEVEL=info
CMD ["node", "server.js"]
