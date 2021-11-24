FROM ubuntu:16.04

RUN set -eux \
    && apt update && apt install npm wget git vim curl apt-transport-https -y && apt upgrade && npm install -g n && n stable && npm install -g cordova@4 \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && apt update &&  apt install yarn \
    && cd /home && git clone https://github.com/yayxs/NeteaseCloudMusic.git && cd NeteaseCloudMusic && yarn config set registry https://registry.npm.taobao.org/ && yarn install

EXPOSE 8888
WORKDIR /home/NeteaseCloudMusic

ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
