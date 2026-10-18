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

# OpenRC's service status command can return non-zero for a daemonized service
# even after it started successfully. Keep the container alive and let the
# Docker health check monitor OwnTone's HTTP API instead of restarting it in a
# tight loop based on OpenRC's status code.
while :; do
  sleep 3600
done
