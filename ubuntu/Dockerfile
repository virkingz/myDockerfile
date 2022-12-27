FROM ubuntu:18.04
RUN set -eux \
    && echo 'deb http://us.archive.ubuntu.com/ubuntu trusty main universe' >> /etc/apt/sources.list \
    && apt update && apt upgrade && apt install curl wget g++ make cmake ssh qtbase5-dev mingw32 -y 
WORKDIR /root
cmd ["crond"]
