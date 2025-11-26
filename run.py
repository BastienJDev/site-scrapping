import os
import sys
import subprocess
import socket
from pathlib import Path

PORT = 5001
VENV_DIR = Path("venv")
ENV_FILE = Path(".env")
DATA_FILE = Path("data.json")


def print_color(msg, color):
    colors = {
        "red": "\033[0;31m",
        "green": "\033[0;32m",
        "yellow": "\033[1;33m",
        "nc": "\033[0m",
    }
    print(f"{colors.get(color, colors['nc'])}{msg}{colors['nc']}")


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0  # 0 = port occupé [web:52]


def kill_port(port: int):
    # Linux / macOS uniquement (équivalent lsof + kill)
    try:
        subprocess.run(
            ["bash", "-c", f"lsof -ti:{port} | xargs -r kill -9"],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def ensure_venv():
    if not VENV_DIR.exists():
        print_color("Création de l'environnement virtuel...", "yellow")
        subprocess.check_call([sys.executable, "-m", "venv", str(VENV_DIR)])  # [web:48]


def venv_python() -> str:
    if os.name == "nt":
        return str(VENV_DIR / "Scripts" / "python.exe")
    else:
        return str(VENV_DIR / "bin" / "python")


def install_deps():
    print_color("Installation des dépendances...", "yellow")
    py = venv_python()
    subprocess.check_call([py, "-m", "pip", "install", "--upgrade", "pip"])
    subprocess.check_call([py, "-m", "pip", "install", "-r", "requirements.txt"])  # [web:60]


def ensure_env_file():
    if not ENV_FILE.exists():
        print_color("Fichier .env manquant, création...", "red")
        ENV_FILE.write_text("GEMINI_API_KEY=your_api_key_here\n", encoding="utf-8")
        print_color("Fichier .env créé. Ajoute ta clé API Gemini.", "yellow")


def ensure_data_file():
    if not DATA_FILE.exists():
        print_color("Création du fichier data.json...", "yellow")
        DATA_FILE.write_text(
            '{"categories": [], "sites": [], "scraping_results": []}',
            encoding="utf-8",
        )


def main():
    print_color("=== Démarrage de l'application Site Scrapping ===", "green")

    # Vérifier le port
    if port_in_use(PORT):
        print_color(f"Le port {PORT} est déjà utilisé. Tentative d'arrêt du processus...", "yellow")
        kill_port(PORT)

    # (Re)vérifier après tentative de kill
    if port_in_use(PORT):
        print_color(f"Le port {PORT} est toujours occupé, arrêt.", "red")
        sys.exit(1)

    ensure_venv()
    install_deps()
    ensure_env_file()
    ensure_data_file()

    print_color(f"Démarrage du serveur sur http://127.0.0.1:{PORT}", "green")
    print_color("Appuyez sur Ctrl+C pour arrêter", "yellow")

    py = venv_python()
    subprocess.call([py, "app.py"])


if __name__ == "__main__":
    main()