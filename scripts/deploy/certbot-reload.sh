#!/bin/sh
# Install as /etc/letsencrypt/renewal-hooks/deploy/shanhe-nginx (root:root, 755).
set -eu
if [ "${RENEWED_LINEAGE:-}" != /etc/letsencrypt/live/shanhe.binnwu.top ]; then
    exit 0
fi
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
