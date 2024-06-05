FROM debian
RUN set -eux \
    && apt update && apt -y install procps curl wget locales \
    && apt-get -y install --reinstall init \
    && locale-gen en_US.UTF-8 \
    && wget -O install.sh http://download.bt.cn/install/install-ubuntu_6.0.sh && echo 'y' | bash install.sh ed8484bec \
    && echo 'virking' | bt 6 && echo '12345678' | bt 5 && bt 11 \
    && rm install.sh
#RUN cd /www/server/panel/install && /bin/bash install_soft.sh 4 install nginx 1.20  &> /tmp/panelExec.log
#RUN cd /www/server/panel/install && /bin/bash install_soft.sh 4 install php 7.4  &> /tmp/panelExec.log

WORKDIR /www/wwwroot
ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
