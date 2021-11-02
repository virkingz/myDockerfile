FROM ubuntu:16.04
RUN set -eux \
    && apt update && apt upgrade && apt install curl wget -y \
    && curl -sSO http://download.bt.cn/install/install_panel.sh && echo 'y' | bash install_panel.sh \
    && cd /www/server/panel/install && bash install_soft.sh 4 install nginx 1.18 &>/tmp/panelExec.log \
    && bash install_soft.sh 4 install mysql 5.6 &> /tmp/panelExec.log \
    && bash install_soft.sh 4 install php 7.2 &> /tmp/panelExec.log \
    && echo 'virking' | bt 6 && echo '12345678' | bt 5 && bt 11 \
    && rm install_panel.sh

WORKDIR /www/wwwroot

ENTRYPOINT ["/sbin/init"]
cmd ["crond"]
