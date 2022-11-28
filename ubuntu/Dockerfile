FROM ubuntu:18.04
RUN set -eux \
    && apt update && apt upgrade && apt install curl wget g++ make cmake ssh qtbase5-dev -y 

WORKDIR /root
cmd ["crond"]
