FROM alpine:3.12 as goBuild
RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories

RUN set -ex \
    && apk update \
    && apk upgrade \
    && apk add --no-cache make g++ readline readline-dev openssl openssl-dev zlib zlib-dev \
    && cd /home && wget https://github.com/SoftEtherVPN/SoftEtherVPN_Stable/archive/refs/heads/master.zip \
    && unzip master.zip && cd SoftEtherVPN_Stable-master && ./configure && make

FROM alpine:3.12

RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories && mkdir /usr/vpnclient/

COPY --from=goBuild /home/SoftEtherVPN_Stable-master/bin/vpnclient/* /usr/vpmclient/
COPY --from=goBuild /home/SoftEtherVPN_Stable-master/bin/vpncmd/* /usr/vpmclient/

RUN set -ex \
    && apk update \
    && apk upgrade \
    && apk add readline \
    && cd /usr/vpnclient \
    && echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
    && echo '/usr/vpnclient/vpnclient start' >> /usr/local/bin/docker_entrypoint.sh \
    && echo 'crond -f' >> /usr/local/bin/docker_entrypoint.sh && chmod 755 /usr/local/bin/docker_entrypoint.sh \
    && echo '#!/bin/sh' > /usr/bin/vpncmd \
    && echo '/usr/vpnclient/vpncmd "$@"' >> /usr/bin/vpncmd \
    && echo 'exit $?' >> /usr/bin/vpncmd && chmod 755 /usr/bin/vpncmd

WORKDIR /usr/vpnclient

ENTRYPOINT ["docker_entrypoint.sh"]
cmd ["crond"]