FROM alpine:latest
 
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
 
RUN apk add --update --no-cache curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev

RUN pip install fastapi requests

RUN pip install uvicorn
