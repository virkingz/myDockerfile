FROM debian:10
RUN set -eux \
    && apt update && apt -y install procps curl wget locales \
    && apt-get -y install --reinstall init \
    && locale-gen en_US.UTF-8 && localedef -i en_US -f UTF-8 en_US.UTF-8 \
    && wget -O install.sh https://download.bt.cn/install/install_lts.sh && echo 'y' | bash install.sh ed8484bec \
    && echo 'virking' | bt 6 && echo '12345678' | bt 5 && bt 11 \
    && rm install.sh
RUN cd /www/server/panel/install && /bin/bash install_soft.sh 4 install nginx 1.24  &> /tmp/panelExec.log

WORKDIR /www/wwwroot
ENTRYPOINT ["/sbin/init"]
