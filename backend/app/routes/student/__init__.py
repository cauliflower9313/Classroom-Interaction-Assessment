"""学生端路由模块初始化"""
from flask import Blueprint

bp = Blueprint("student", __name__, url_prefix="/student")

from app.routes.student import auth
from app.routes.student import dashboard
from app.routes.student import video
from app.routes.student import audio
from app.routes.student import questions
from app.routes.student import records
from app.routes.student import courses
from app.routes.student import comments
from app.routes.student import course_records
from app.routes.student import evaluation
