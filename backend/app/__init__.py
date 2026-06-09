"""Flask应用初始化 - 适配新的项目结构"""
from flask import Flask, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
import sys

# 将backend目录加入Python路径（解决模块导入问题）
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# 全局数据库实例
db = SQLAlchemy()


def create_app():
    """创建Flask应用实例（适配自定义模板/静态文件路径）"""
    # 导入配置
    from app.config import (
        TEMPLATE_FOLDER, STATIC_FOLDER,
        DATABASE_URI, DATABASE_TRACK_MODIFICATIONS,
        SECRET_KEY, DEBUG
    )
    
    # 关键：指定模板文件夹和静态文件夹路径
    app = Flask(
        __name__,
        template_folder=TEMPLATE_FOLDER,  # 指向 frontend/templates
        static_folder=STATIC_FOLDER       # 指向 frontend/static
    )

    # 基础配置
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = DATABASE_TRACK_MODIFICATIONS
    app.config['DEBUG'] = DEBUG

    # 允许跨域（前后端分离）
    if DEBUG:
        # 开发环境允许所有来源
        CORS(app, supports_credentials=True, resources={"/*": {"origins": "*"}})
    else:
        # 生产环境限制来源
        CORS(app, supports_credentials=True, resources={"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

    # 初始化数据库
    db.init_app(app)

    # 延迟导入模型，确保数据库初始化完成后再导入
    with app.app_context():
        from app.models import Student, Teacher, VideoRecord, AudioRecord, Question, Answer, OperationRecord
        # 延迟导入蓝图，确保数据库初始化完成后再导入
        # 导入学生端蓝图
        from app.routes.student import bp as student_bp
        # 导入教师端蓝图
        from app.routes.teacher import bp as teacher_bp
        # 导入通用蓝图
        from app.routes.common import bp as common_bp, api_bp
        # 注册蓝图
        app.register_blueprint(student_bp)
        app.register_blueprint(teacher_bp)
        app.register_blueprint(common_bp)
        app.register_blueprint(api_bp)
        print("蓝图注册成功", file=sys.stderr)
        
        # 添加请求日志中间件
        @app.before_request
        def log_request():
            from flask import request
            print(f"[REQUEST] {request.method} {request.path}", file=sys.stderr)

    # 根路由返回统一登录页
    @app.route('/')
    def index():
        """首页 - 重定向到统一登录页"""
        return redirect(url_for('common.login_page'))

    # 创建数据库表（首次运行）
    # 注释掉自动创建表的代码，避免每次启动都重新创建表
    # with app.app_context():
    #     from app.models import Student, Teacher, VideoRecord, AudioRecord, Question, Answer
    #     db.create_all()
    #     print("✅ 数据库表创建成功")

    return app