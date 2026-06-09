"""学生端路由模块 - 重定向到新的模块化结构"""
from app.routes.student import bp

# 导入新的模块化路由结构
from app.routes.student import auth
from app.routes.student import dashboard
from app.routes.student import video
from app.routes.student import audio
from app.routes.student import questions
from app.routes.student import records
