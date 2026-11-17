#!/usr/bin/env bash
# One-time maintenance on the existing Ubuntu server, before enabling xz releases.
set -euo pipefail
test "$(id -u)" -eq 0 || { echo 'Run this maintenance script as root.' >&2; exit 1; }
ops_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
target=/usr/local/libexec/shanhe-receive
test -f "$target"
before=$(curl --fail --silent --show-error -H 'Host: 49.233.60.125' http://127.0.0.1/version.json)
# These tests use temporary directories and mocked health checks, not the live release.
python3 "$ops_dir/test_receive.py"
old_hash=$(sha256sum "$target" | cut -d ' ' -f 1)
backup="$target.backup-$old_hash"
test -e "$backup" || cp -p -- "$target" "$backup"
install -o root -g root -m 755 "$ops_dir/receive.py" "$target.next"
mv -f -- "$target.next" "$target"
after=$(curl --fail --silent --show-error -H 'Host: 49.233.60.125' http://127.0.0.1/version.json)
test "$before" = "$after"
sha256sum "$target"
stat -c '%U:%G %a' "$target"
echo 'Receiver updated; current application version unchanged.'
