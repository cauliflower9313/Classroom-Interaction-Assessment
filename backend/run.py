"""项目启动入口 - 适配新结构"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.config import HOST, PORT, DEBUG

if __name__ == '__main__':
    app = create_app()
    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG,
        use_reloader=False
    )