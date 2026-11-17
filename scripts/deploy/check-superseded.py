"""Allow a checked application commit when main has only documentation after it."""
import json
from pathlib import Path
import sys


def documentation(path):
    # Keep aligned with ci.yml paths-ignore; renames inspect both names.
    return path.endswith('.md') or path.startswith(('docs/', 'data/testing/'))


def documentation_only(compare):
    files = compare.get('files', [])
    # GitHub's compare response caps files at 300 and commits at 250.
    return (compare.get('status') == 'ahead' and 0 < len(files) < 300
            and compare.get('total_commits', 251) <= 250
            and all(documentation(item['filename'])
                    and documentation(item.get('previous_filename', item['filename']))
                    for item in files))


if __name__ == '__main__':
    sys.exit(0 if documentation_only(json.loads(Path(sys.argv[1]).read_text())) else 1)
