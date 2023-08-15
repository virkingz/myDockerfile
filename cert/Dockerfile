FROM alpine:latest
 
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

RUN apk add --update --no-cache curl jq python2 py2-pip git

RUN pip install flask pycrypto cryptography gunicorn

RUN cd /root && git clone https://github.com/wossl33/wossl.git 
