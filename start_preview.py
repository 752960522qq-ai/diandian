from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import webbrowser
root=Path(__file__).resolve().parent
server=ThreadingHTTPServer(("127.0.0.1",8080),partial(SimpleHTTPRequestHandler,directory=str(root)))
url="http://127.0.0.1:8080/web/motion-labs/resistance-motion-lab/"
print(url)
webbrowser.open(url)
try: server.serve_forever()
except KeyboardInterrupt: pass
finally: server.server_close()
