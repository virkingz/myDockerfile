FROM manjarolinux/base:latest

MAINTAINER virking <1057229665@qq.com>

RUN pacman -Syy --noconfirm --needed cmake arm-none-eabi-gcc arm-none-eabi-newlib vim git gcc && \
    rm -f /var/cache/pacman/pkg/*

RUN useradd -m wangzhang
