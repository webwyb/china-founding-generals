#!/usr/bin/env bash
# Run as root from a reviewed copy of this directory. Public key is supplied separately.
set -euo pipefail
test "$(id -u)" = 0
[[ ${DEPLOY_PUBLIC_KEY:-} == 'ssh-ed25519 '* ]]
source_dir=$(cd "$(dirname "$0")" && pwd)
nginx -t
if ! id shanhe-deploy >/dev/null 2>&1; then
  useradd --system --create-home --home-dir /home/shanhe-deploy --shell /bin/sh shanhe-deploy
fi
install -d -o root -g root -m 755 /home/shanhe-deploy /home/shanhe-deploy/.ssh /usr/local/libexec
install -d -o shanhe-deploy -g shanhe-deploy -m 755 /srv/shanhe /srv/shanhe/releases
install -o root -g root -m 755 "$source_dir/receive.py" /usr/local/libexec/shanhe-receive
key_file=$(mktemp)
trap 'rm -f "$key_file"' EXIT
printf 'restrict,command="/usr/local/libexec/shanhe-receive" %s\n' "$DEPLOY_PUBLIC_KEY" > "$key_file"
if [[ -e /home/shanhe-deploy/.ssh/authorized_keys ]]; then
  cmp "$key_file" /home/shanhe-deploy/.ssh/authorized_keys
else
  install -o root -g root -m 644 "$key_file" /home/shanhe-deploy/.ssh/authorized_keys
fi
if [[ -e /etc/nginx/sites-available/shanhe ]]; then
  cmp "$source_dir/nginx.conf" /etc/nginx/sites-available/shanhe
else
  install -o root -g root -m 644 "$source_dir/nginx.conf" /etc/nginx/sites-available/shanhe
fi
ln -sfn /etc/nginx/sites-available/shanhe /etc/nginx/sites-enabled/shanhe
nginx -t
systemctl reload nginx
id shanhe-deploy
stat -c '%U %a %n' /usr/local/libexec/shanhe-receive /home/shanhe-deploy/.ssh/authorized_keys /srv/shanhe
echo 'Shanhe deployment endpoint ready; the first Actions run will publish the site.'
