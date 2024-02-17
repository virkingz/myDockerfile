FROM ubuntu:20.04

MAINTAINER supperthomas <78900636@qq.com>

ARG DEST_DIR=/root

WORKDIR ${DEST_DIR}

#china change sourcelist
RUN sed -i 's/http:\/\/archive.ubuntu.com\/ubuntu\//http:\/\/mirrors.aliyun.com\/ubuntu\//g' /etc/apt/sources.list && apt-get update

#system
RUN apt-get update

RUN apt-get upgrade -y

RUN apt-get install -y vim

RUN apt-get install -y git

#env
RUN mkdir /root/.env

RUN mkdir /root/.env/tools

RUN mkdir /root/.env/packages

RUN mkdir /root/.env/packages/packages

RUN mkdir /root/.env/tools/scripts

#RUN git clone https://github.com/RT-Thread/env.git /root/.env/tools/scripts/
RUN git clone https://hub.fastgit.org/RT-Thread/env.git /root/.env/tools/scripts/

#RUN git clone https://github.com/RT-Thread/packages.git /root/.env/packages/packages/
RUN git clone https://hub.fastgit.org/RT-Thread/packages.git /root/.env/packages/packages/

ENV PATH="/root/.env/tools/scripts:$PATH"

RUN apt-get install -y wget

RUN apt-get install -y python3 python-is-python3 

RUN apt-get install -y pip
#arm-none-eabi
RUN apt-get install -y gcc-arm-none-eabi
#rtthread
RUN apt-get install -y scons

RUN apt-get install -y libncurses5-dev

RUN pip install requests -qq

ENV RTT_EXEC_PATH=/usr/bin

RUN apt-get clean

RUN rm -rf /var/lib/apt/lists/*

ENV RTT_CC=gcc

WORKDIR /root

#RUN git clone https://github.com/RT-Thread/rt-thread.git --depth=1
#RUN git clone https://hub.fastgit.org/RT-Thread/rt-thread.git --depth=1

