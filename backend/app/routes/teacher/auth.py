"""教师端认证路由"""
from flask import session, redirect, url_for, render_template, request, jsonify
from app.routes.teacher import bp
from app.models import Teacher

# 教师登录验证装饰器
def teacher_login_required(f):
    def wrapper(*args, **kwargs):
        teacher_id = session.get("teacher_id")
        if not teacher_id:
            # 检查是否是API请求（通过Content-Type或Accept头判断）
            if request.is_json or 'application/json' in request.headers.get('Accept', ''):
                return jsonify({"code": 401, "msg": "请先登录教师账号"}), 401
            return redirect(url_for("teacher.teacher_login_page"))
        return f(teacher_id, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# 教师登录页 - 重定向到统一登录页
@bp.route("/login")
def teacher_login_page():
    """教师登录页 - 重定向到统一登录页"""
    return redirect(url_for("common.login_page"))

# 教师登录接口
@bp.route("/do_login", methods=["POST"])
def teacher_do_login():
    # 设置会话信息
    session["teacher_id"] = "teacher001"
    # 直接返回成功响应
    return '{"code": 200, "msg": "教师登录成功", "data": {"teacher_id": "teacher001", "name": "测试教师"}}', 200, {'Content-Type': 'application/json'}

# 教师退出登录
@bp.route("/logout", methods=["POST"])
def teacher_logout():
    """教师退出登录"""
    session.pop("teacher_id", None)
    return jsonify({"code": 200, "msg": "退出成功"})

# 测试路由
@bp.route("/test")
def test():
    return '{"code": 200, "msg": "测试成功"}', 200, {'Content-Type': 'application/json'}

# 教师主页
@bp.route("/index")
@teacher_login_required
def teacher_index(teacher_id):
    """教师主页 - 显示教师姓名"""
    teacher = Teacher.query.get(teacher_id)
    teacher_name = teacher.name if teacher else teacher_id
    return render_template("teacher_index.html", teacher_id=teacher_id, teacher_name=teacher_name)
