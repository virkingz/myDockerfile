FROM alpine:3.12
RUN set -eux && sed -i "s/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g" /etc/apk/repositories \
	&& apk update \
	&& apk upgrade \
	&& apk add --no-cache make g++ npm git bash python2 python3 \
	&& cd /home && git clone https://github.com/Ignorance-of-Dong/optimization_open_neteasy_cloud.git \
	&& cd /home/optimization_open_neteasy_cloud && npm install or yarn
	
RUN     echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
	&& echo 'cd /home/optimization_open_neteasy_cloud && npm run dev' >> /usr/local/bin/docker_entrypoint.sh \
	&& echo 'crond -f' >> /usr/local/bin/docker_entrypoint.sh && chmod 755 /usr/local/bin/docker_entrypoint.sh

WORKDIR /home/optimization_open_neteasy_cloud

ENTRYPOINT ["docker_entrypoint.sh"]
CMD ["crond"]
