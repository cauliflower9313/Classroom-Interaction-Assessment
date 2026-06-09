"""测试路由模块"""
from app.routes.teacher import bp

@bp.route("/test_route")
def test_route():
    return "测试路由成功"