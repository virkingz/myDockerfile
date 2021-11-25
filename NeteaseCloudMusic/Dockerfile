FROM ubuntu:16.04

RUN set -eux \
    && apt update && apt install npm wget git vim curl apt-transport-https -y \
    && cd /home && git clone https://github.com/yayxs/NeteaseCloudMusic.git \
    && cd NeteaseCloudMusic && apt upgrade && npm install -g n && n stable && npm install -g cordova@4 \
    && npm install yarn && yarn config set registry https://registry.npm.taobao.org/ && yarn install

EXPOSE 8888
WORKDIR /home/NeteaseCloudMusic

ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
