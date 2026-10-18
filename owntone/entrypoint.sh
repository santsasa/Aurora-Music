#!/bin/sh
set -eu

# Use the image OpenRC service scripts without starting the full init system.
# They configure the runtime user, D-Bus, and Avahi as in the upstream image.
# This avoids privileged proc and cgroup mounts in a regular Portainer stack.
mkdir -p /run/openrc
touch /run/openrc/softlevel
rc-service dbus start
rc-service avahi-daemon start

# Remove the stale temporary log before OwnTone starts as its unprivileged user.
rm -f /tmp/owntone.log
rc-service owntone start

# OpenRC can report a daemonized service as stopped after it started successfully.
# Keep the container alive and let Docker health-check the OwnTone HTTP API.
while :; do
  sleep 3600
done
