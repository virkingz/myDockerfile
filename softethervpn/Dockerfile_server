FROM alpine:3.12 as goBuild
RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories

RUN set -ex \
    && apk update \
    && apk upgrade \
    && apk add --no-cache make g++ readline readline-dev openssl openssl-dev zlib zlib-dev \
    && cd /home && wget https://github.com/SoftEtherVPN/SoftEtherVPN_Stable/archive/refs/heads/master.zip \
    && unzip master.zip && cd SoftEtherVPN_Stable-master && ./configure && make

FROM alpine:3.12

RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories && mkdir /usr/vpnserver/

COPY --from=goBuild /home/SoftEtherVPN_Stable-master/bin/vpnserver/* /usr/vpnserver/

RUN set -ex \
    && apk update \
    && apk upgrade \
    && apk add readline \
    && cd /usr/vpnserver \
    && echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
    && echo '/usr/vpnserver/vpnserver start' >> /usr/local/bin/docker_entrypoint.sh \
    && echo 'crond -f' >> /usr/local/bin/docker_entrypoint.sh && chmod 755 /usr/local/bin/docker_entrypoint.sh

WORKDIR /usr/vpnserver

ENTRYPOINT ["docker_entrypoint.sh"]

cmd ["crond"]

