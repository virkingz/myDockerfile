FROM ubuntu:16.04
RUN set -eux \
    && apt update && apt upgrade && apt install curl wget -y \
    && curl -sSO http://download.bt.cn/install/install_panel.sh && echo 'y' | bash install_panel.sh \
    && echo 'virking' | bt 6 && echo '12345678' | bt 5 && bt 11\
    && rm install_panel.sh

WORKDIR /www/wwwroot

ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
