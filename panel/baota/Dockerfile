FROM ubuntu:16.04
RUN set -eux \
    && apt update && apt upgrade && apt install curl wget -y \
    && wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && echo 'y' | bash install-ubuntu_6.0.sh \
    && echo 'virking' | bt 6 && echo '12345678' | grep 5 \
    && rm install-ubuntu_6.0.sh

WORKDIR /www/wwwroot

ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
