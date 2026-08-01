from __future__ import annotations

import importlib.util
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def find_npm() -> str | None:
    """Vollständigen Pfad zu npm suchen.

    Unter Windows heißt npm `npm.cmd`. `subprocess.Popen(["npm", ...])` findet
    das ohne `shell=True` nicht und bricht mit `WinError 2` ab, deshalb wird der
    Pfad hier vorher aufgelöst.
    """
    for name in ("npm.cmd", "npm.exe", "npm") if sys.platform == "win32" else ("npm",):
        found = shutil.which(name)
        if found:
            return found
    return None


def check_requirements() -> list[str]:
    """Fehlende Voraussetzungen als klare Anleitungen zurückgeben."""
    activate = ".venv\\Scripts\\activate" if sys.platform == "win32" else "source .venv/bin/activate"
    problems: list[str] = []

    if importlib.util.find_spec("flask") is None:
        problems.append(
            "Die Python-Abhängigkeiten fehlen (kein Modul 'flask').\n"
            "  Im Projektordner ausführen:\n"
            "    python -m venv .venv\n"
            f"    {activate}\n"
            "    pip install -r requirements.txt"
        )

    if not (ROOT / "client" / "node_modules").is_dir():
        problems.append(
            "Die Client-Abhängigkeiten fehlen (client/node_modules nicht vorhanden).\n"
            "  Im Projektordner ausführen:\n"
            "    npm install --prefix client\n"
            "  Hinweis: 'npm install' im Projekt-Root reicht nicht, die React-App\n"
            "  liegt im Unterordner 'client'."
        )

    if find_npm() is None:
        problems.append(
            "npm wurde nicht gefunden. Bitte Node.js installieren (https://nodejs.org)\n"
            "  und danach die Eingabeaufforderung neu öffnen."
        )

    return problems


def main() -> int:
    problems = check_requirements()
    if problems:
        print("Der Budgetplaner kann noch nicht starten:\n", file=sys.stderr)
        for index, problem in enumerate(problems, start=1):
            print(f"{index}. {problem}\n", file=sys.stderr)
        return 1

    npm = find_npm()
    assert npm is not None  # durch check_requirements bereits sichergestellt

    processes = [
        subprocess.Popen([sys.executable, "-m", "server.app"], cwd=ROOT),
        subprocess.Popen([npm, "start", "--prefix", "client"], cwd=ROOT),
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
