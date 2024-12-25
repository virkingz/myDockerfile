FROM debian:10

RUN set -ex \
    && apt update && apt -y install procps curl wget locales \
    && apt-get -y install --reinstall init \
    && locale-gen en_US.UTF-8 && localedef -i en_US -f UTF-8 en_US.UTF-8

RUN set -ex \
        && echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
        && echo 'if command -v bt 14 > /dev/null 2>&1; then' >> /usr/local/bin/docker_entrypoint.sh \
        && echo '    echo "bt is installed!"' >> /usr/local/bin/docker_entrypoint.sh \
        && echo 'else' >> /usr/local/bin/docker_entrypoint.sh \
        && echo '    wget -O install.sh https://download.bt.cn/install/install_lts.sh && echo "y" | bash install.sh ed8484bec' >> /usr/local/bin/docker_entrypoint.sh \
        && echo '    rm install.sh && reboot' >> /usr/local/bin/docker_entrypoint.sh \
                && echo 'fi' >> /usr/local/bin/docker_entrypoint.sh \
        && chmod +x /usr/local/bin/docker_entrypoint.sh

RUN set -ex \
        && echo '#!/bin/sh -e' >  /etc/rc.local \
        && echo '/usr/local/bin/docker_entrypoint.sh' >>  /etc/rc.local \
        && echo 'exit 0' >>  /etc/rc.local \
        && chmod +x /etc/rc.local

cmd ["/sbin/init"]
WORKDIR /www/wwwrooot
VOLUME /www
EXPOSE 8888 80 443 3306 22
