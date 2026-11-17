#!/usr/bin/env bash
set -euo pipefail

ops_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
# Documentation pushed during CI must not suppress a valid application release.
main_sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq .object.sha)
if [[ "$main_sha" != "$GITHUB_SHA" ]]; then
  gh api "repos/$GITHUB_REPOSITORY/compare/$GITHUB_SHA...$main_sha" > "$ssh_dir/compare.json"
  if ! python3 "$ops_dir/check-superseded.py" "$ssh_dir/compare.json"; then
    echo "Skipping superseded commit $GITHUB_SHA (main is $main_sha)."
    exit 0
  fi
fi
python3 "$ops_dir/check-assets.py" --manifest release/release-assets.json --wait-seconds 180
python3 "$ops_dir/package-release.py" stamp
test -s release/code.tar.gz
test -n "$DEPLOY_SSH_KEY"
chmod 700 "$ssh_dir"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$ssh_dir/key"
chmod 600 "$ssh_dir/key"
unset DEPLOY_SSH_KEY
cp "$ops_dir/known_hosts" "$ssh_dir/known_hosts"
ssh -i "$ssh_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes \
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$ssh_dir/known_hosts" \
  -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4 \
  shanhe-deploy@49.233.60.125 \
  "deploy $GITHUB_SHA $GITHUB_RUN_ID $GITHUB_RUN_ATTEMPT" < release/code.tar.gz

for attempt in {1..6}; do
  if curl --fail --silent --show-error --connect-timeout 10 --max-time 30 \
      "https://shanhe.binnwu.top/version.json?run=$GITHUB_RUN_ID" > "$ssh_dir/version.json" \
      && python3 - "$ssh_dir/version.json" <<'PY'
import json, os, sys
version = json.load(open(sys.argv[1]))
assert version['sha'] == os.environ['GITHUB_SHA'], version
assert version['run'] == os.environ['GITHUB_RUN_ID'], version
assert version['attempt'] == os.environ['GITHUB_RUN_ATTEMPT'], version
PY
  then
    echo "Published https://shanhe.binnwu.top ($GITHUB_SHA)."
    printf 'Deployed [%s](https://shanhe.binnwu.top) from `%s`.\n' '山河有名' "$GITHUB_SHA" >> "$GITHUB_STEP_SUMMARY"
    exit 0
  fi
  sleep 5
done
echo 'Public deployment verification failed.' >&2
exit 1
