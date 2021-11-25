FROM alpine:3.12
RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories \
	&& apk update \
	&& apk upgrade \
	&& apk add --no-cache make g++ npm git bash python2 python3 \
	&& cd /home && git clone https://github.com/yayxs/NeteaseCloudMusic.git \
	&& npm install -g n && n v12
RUN     set -ex && cd /home && npm install -g cordova@8
RUN     set -ex && cd /home && npm install -g yarn && npm install -g @vue/cli && npm install next@canary
RUN     set -ex && cd /home/NeteaseCloudMusic && npm install && yarn install
RUN     echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
	&& echo 'cd /home/NeteaseCloudMusic && yarn run start' >> /usr/local/bin/docker_entrypoint.sh \
	&& echo 'crond -f' >> /usr/local/bin/docker_entrypoint.sh && chmod 755 /usr/local/bin/docker_entrypoint.sh

WORKDIR /home/NeteaseCloudMusic


ENTRYPOINT ["docker_entrypoint.sh"]
CMD ["crond"]
