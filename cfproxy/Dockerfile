FROM node

COPY ./work /root/work
RUN npm install -g wrangler

WORKDIR /root/work
CMD ["wrangler", "dev", "--ip", "0.0.0.0"]
