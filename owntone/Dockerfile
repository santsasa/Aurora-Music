FROM docker.io/owntone/owntone:latest
COPY owntone.conf /etc/owntone/owntone.conf
COPY entrypoint.sh /usr/local/bin/owntone-entrypoint
RUN chmod +x /usr/local/bin/owntone-entrypoint
ENTRYPOINT ["/usr/local/bin/owntone-entrypoint"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:3689/api/outputs || exit 1
