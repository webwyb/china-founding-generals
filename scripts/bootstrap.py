"""Restore Python tooling inside this checkout, without global installation."""
import subprocess
import sys
import venv
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
if sys.version_info<(3,10):raise SystemExit('需要Python 3.10或更新版本，推荐3.11。')
directory=ROOT/'.venv'
python=directory/('Scripts/python.exe' if sys.platform=='win32' else 'bin/python')
if not python.exists():venv.EnvBuilder(with_pip=True).create(directory)
requirements=ROOT/'scripts/requirements-dev.lock'
if not requirements.exists():requirements=ROOT/'scripts/requirements-dev.txt'
subprocess.run([str(python),'-m','pip','install','-r',str(requirements)],cwd=ROOT,check=True)
print('项目Python工具已安装到.venv；npm命令会自动使用它。')
