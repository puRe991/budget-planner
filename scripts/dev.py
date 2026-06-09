from __future__ import annotations

import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    processes = [
        subprocess.Popen([sys.executable, "-m", "server.app"], cwd=ROOT),
        subprocess.Popen(["npm", "start", "--prefix", "client"], cwd=ROOT),
    ]

    def stop_processes(*_: object) -> None:
        for process in processes:
            if process.poll() is None:
                process.terminate()

    signal.signal(signal.SIGINT, stop_processes)
    signal.signal(signal.SIGTERM, stop_processes)

    try:
        while True:
            for process in processes:
                return_code = process.poll()
                if return_code is not None:
                    stop_processes()
                    return return_code
            time.sleep(0.5)
    finally:
        stop_processes()


if __name__ == "__main__":
    raise SystemExit(main())
