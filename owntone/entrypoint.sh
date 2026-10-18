#!/bin/sh
set -eu

# The upstream container boots OpenRC, which attempts privileged mounts that
# are unavailable in Portainer's normal Docker container. Start only the two
# daemons OwnTone needs for receiver discovery, then run OwnTone in foreground.
mkdir -p /run/dbus /run/avahi-daemon
dbus-daemon --system --fork --nopidfile --syslog-only
avahi-daemon --daemonize --no-chroot

exec su-exec "${UID:-1000}:${GID:-1000}" \
  /usr/sbin/owntone -f -c /etc/owntone/owntone.conf
