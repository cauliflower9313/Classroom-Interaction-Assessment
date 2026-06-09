"""项目配置文件 - 补充所有缺失的配置项"""
import os
import sys

# 添加项目根目录到Python路径，以便导入mysql_config
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# 导入MySQL配置
from mysql_config import (
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD,
    MYSQL_DATABASE, MYSQL_CHARSET
)

# 项目根目录（backend/ 的上一级）
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))

# 前端模板目录（关键：指向 frontend/templates）
TEMPLATE_FOLDER = os.path.join(BASE_DIR, 'frontend/templates')

# 前端静态文件目录（指向 frontend/static）
STATIC_FOLDER = os.path.join(BASE_DIR, 'frontend/static')

# 数据库配置 - 使用MySQL
DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset={MYSQL_CHARSET}"
DATABASE_TRACK_MODIFICATIONS = False

# 密钥配置（生产环境请改为随机字符串）
SECRET_KEY = 'class_interaction_system_2026_dev'

# 会话配置
SESSION_COOKIE_SECURE = False  # 开发环境设为False，生产环境设为True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

# 默认密码配置（补充缺失的配置项！）
STUDENT_DEFAULT_PASSWORD = '123456'  # 学生默认密码
TEACHER_DEFAULT_PASSWORD = '123456'  # 教师默认密码

# 语音/视频模型配置
WHISPER_MODEL_DIR = os.path.join(BASE_DIR, 'backend/app/static/trained_models/whisper')
YOLO_MODEL_PATH = os.path.join(BASE_DIR, 'backend/app/static/trained_models/video/best.pt')
VIDEO_MODEL_PATH = os.path.join(BASE_DIR, 'backend/app/static/trained_models/video/best.pt')  # 为视频识别工具类添加别名

# 上传/记录路径
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'backend/app/static/uploads')
RECORD_FOLDER = os.path.join(BASE_DIR, 'backend/app/static/records')

# 创建必要目录
for folder in [WHISPER_MODEL_DIR, UPLOAD_FOLDER, RECORD_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Flask 运行配置
DEBUG = True
HOST = '0.0.0.0'
PORT = 5000