FROM debian:buster-slim

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update  \
    && apt-get install -y locales curl wget \
    && apt-get install -y --no-install-recommends build-essential \
    asciidoc binutils bzip2 gawk gettext git libncurses5-dev \
    libz-dev patch python3 unzip zlib1g-dev lib32gcc1 \
    libc6-dev-i386 subversion flex uglifyjs git-core \
    gcc-multilib p7zip p7zip-full msmtp libssl-dev texinfo \
    libglib2.0-dev xmlto qemu-utils upx libelf-dev autoconf \
    automake libtool autopoint device-tree-compiler \
    proxychains4 sudo vim \
    && groupadd -r build && useradd -r -u 1000 -g build build \
    && passwd -d root \
    && passwd -d build \
    && echo '%build ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

ENV LANG en_US.utf8

USER build
WORKDIR /home/build

ENV FORCE_UNSAFE_CONFIGURE=1
CMD ["/bin/bash"]