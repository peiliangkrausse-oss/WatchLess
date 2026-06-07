import socket
import threading
import time

import webview

from youtube_summary_app.app import create_app
from youtube_summary_app.config import APP_NAME, PORT


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


def main() -> None:
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
    )
    webview.start()


if __name__ == "__main__":
    main()
