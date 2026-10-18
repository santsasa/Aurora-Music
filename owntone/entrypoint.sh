#!/bin/sh
set -eu

# Use the image's OpenRC service scripts without starting the full init system.
# They set up the runtime user, D-Bus and Avahi the same way as the upstream
# image, while avoiding its privileged proc/cgroup mounts in a regular stack.
mkdir -p /run/openrc
touch /run/openrc/softlevel
rc-service dbus start
rc-service avahi-daemon start
rc-service owntone start

# Keep the container alive while OwnTone runs; let Docker restart it if the
# service exits so Portainer health and restart policies stay meaningful.
while rc-service owntone status >/dev/null 2>&1; do
  sleep 5
done
exit 1
