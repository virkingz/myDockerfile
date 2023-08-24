FROM alpine:latest
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev git && pip install flask && pip install requests
RUN cd /root/ && git clone https://github.com/chris5641/163music.git
RUN echo '#!/bin/sh' > /usr/local/bin/docker_entrypoint.sh \
    && echo 'cd /root/163music && python3 run.py' >> /usr/local/bin/docker_entrypoint.sh \
    && chmod 755 /usr/local/bin/docker_entrypoint.sh

ENTRYPOINT ["docker_entrypoint.sh"]
