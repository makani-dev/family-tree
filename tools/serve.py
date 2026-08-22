#!/usr/bin/env python3
"""
Local preview server for the family tree.

    python tools/serve.py            -> http://localhost:8777
    python tools/serve.py 9000       -> http://localhost:9000

Why not just double-click index.html?
    That works, and you are welcome to do it. But some browsers treat
    file:// pages strictly, and more importantly the browser will happily
    keep serving you a CACHED copy of js/data.js after you have edited it,
    which is very confusing. This server sends no-cache headers, so every
    refresh shows exactly what is on disk.

Why not just use `python -m http.server`?
    Same reason - it caches. Everything else here is identical to it.

Stop the server with Ctrl+C.
"""

import functools
import http.server
import sys
import os
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    # Keep the console readable: hide the 404s for photos that do not exist
    # yet, since those are expected until you add the pictures.
    def log_message(self, fmt, *args):
        msg = fmt % args
        if "/photos/" in msg and " 404 " in msg:
            self._quiet = True
            return
        sys.stderr.write("  %s\n" % msg)

    def log_error(self, fmt, *args):
        if self.path.startswith("/photos/"):
            return
        sys.stderr.write("  %s\n" % (fmt % args))


def main():
    args = [a for a in sys.argv[1:] if a != "--open"]
    port = int(args[0]) if args else 8777
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    # Threaded on purpose: browsers hold several keep-alive connections open at
    # once, and a single-threaded server would sit there deadlocked.
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    http.server.ThreadingHTTPServer.daemon_threads = True
    with http.server.ThreadingHTTPServer(("", port), handler) as httpd:
        url = "http://localhost:%d/" % port
        print("Family tree running at %s" % url)
        print("Serving %s" % ROOT)
        print("Edit js/data.js and just refresh the browser. Ctrl+C to stop.\n")
        if "--open" in sys.argv:
            try:
                webbrowser.open(url)
            except Exception:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")


if __name__ == "__main__":
    main()
