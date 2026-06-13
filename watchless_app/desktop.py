import socket
import sys
import threading
import time
from pathlib import Path

import webview

from watchless_app.app import create_app
from watchless_app.config import APP_NAME, PORT

APP_ICON_FILENAME = "WatchLess.icns"


def wait_for_server(host: str = "127.0.0.1", port: int = PORT, timeout: int = 10) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def run_server() -> None:
    app = create_app()
    app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False)


def app_icon_path() -> str | None:
    if getattr(sys, "frozen", False):
        candidate = Path(sys.executable).resolve().parents[1] / "Resources" / APP_ICON_FILENAME
    else:
        candidate = Path(__file__).resolve().parents[1] / "App Icons" / APP_ICON_FILENAME
    return str(candidate) if candidate.exists() else None


def main() -> None:
    webview.settings["SHOW_DEFAULT_MENUS"] = True
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    if not wait_for_server():
        raise RuntimeError(f"Local server did not start on port {PORT}.")

    webview.create_window(
        APP_NAME,
        f"http://127.0.0.1:{PORT}/",
        width=1600,
        height=1000,
        min_size=(1100, 720),
        text_select=True,
    )
    webview.start(icon=app_icon_path())


if __name__ == "__main__":
    main()
