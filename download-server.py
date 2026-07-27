from http.server import HTTPServer, SimpleHTTPRequestHandler
import os

class DLHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory='/workspace/english-game', **kwargs)

    def do_GET(self):
        if '/english-game-offline.html' in self.path:
            fpath = '/workspace/english-game/english-game-offline.html'
            fsize = os.path.getsize(fpath)
            self.send_response(200)
            self.send_header('Content-Type', 'application/octet-stream')
            self.send_header('Content-Disposition', 'attachment; filename="英语小达人.html"')
            self.send_header('Content-Length', str(fsize))
            self.end_headers()
            with open(fpath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            super().do_GET()

HTTPServer(('0.0.0.0', 8001), DLHandler).serve_forever()
