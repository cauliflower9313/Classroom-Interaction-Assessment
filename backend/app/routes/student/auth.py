"""学生端认证相关路由"""
from flask import request, jsonify, session, render_template, redirect, url_for
from app import db
from app.models import Student
from app.config import STUDENT_DEFAULT_PASSWORD
from app.utils.password_utils import check_password, hash_password
from datetime import datetime
from app.routes.student import bp

# 登录验证装饰器
def student_login_required(f):
    def wrapper(*args, **kwargs):
        student_id = session.get("student_id")
        if not student_id:
            if request.is_json:
                return jsonify({"code": 401, "msg": "请先登录学生账号"}), 401
            return redirect(url_for("student.student_login_page"))
        return f(student_id, *args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# 学生登录页 - 重定向到统一登录页
@bp.route("/login")
def student_login_page():
    """学生登录页 - 重定向到统一登录页"""
    if session.get("student_id"):
        return redirect(url_for("student.student_index"))
    return redirect(url_for("common.login_page"))

# 学生注册页 - 重定向到统一登录页
@bp.route("/register")
def student_register_page():
    """学生注册页 - 重定向到统一登录页"""
    if session.get("student_id"):
        return redirect(url_for("student.student_index"))
    return redirect(url_for("common.login_page"))

# 学生主页
@bp.route("/index")
@student_login_required
def student_index(student_id):
    student = Student.query.get(student_id)
    if not student:
        session.pop("student_id", None)
        return redirect(url_for("student.student_login_page"))
    return render_template("student_index.html",
                           student_id=student.id,
                           student_name=student.name)

# 学生登录接口
@bp.route("/do_login", methods=["POST"])
def student_do_login():
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    student_id = data.get("student_id")
    password = data.get("password")

    if not student_id or not password:
        return jsonify({"code": 400, "msg": "学生ID和密码不能为空"}), 400

    student = Student.query.get(student_id)
    if not student:
        return jsonify({"code": 401, "msg": "学生ID不存在"}), 401

    # 密码验证
    try:
        # 首先检查是否是默认密码
        if password == STUDENT_DEFAULT_PASSWORD:
            # 默认密码直接通过
            pass
        # 然后尝试验证哈希密码
        elif not check_password(password, student.password):
            return jsonify({"code": 401, "msg": "密码错误"}), 401
    except Exception as e:
        # 如果密码哈希格式错误，尝试使用默认密码
        if password != STUDENT_DEFAULT_PASSWORD:
            return jsonify({"code": 401, "msg": "密码错误"}), 401

    session["student_id"] = student.id
    session.permanent = True

    return jsonify({
        "code": 200,
        "msg": "登录成功",
        "data": {"student_id": student.id, "name": student.name}
    })

# 学生注册接口
@bp.route("/do_register", methods=["POST"])
def student_do_register():
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    student_id = data.get("student_id")
    name = data.get("name")
    class_name = data.get("class_name")
    password = data.get("password")

    if not student_id or not name or not class_name or not password:
        return jsonify({"code": 400, "msg": "学号、姓名、班级和密码不能为空"}), 400

    # 检查学号是否已存在
    existing_student = Student.query.get(student_id)
    if existing_student:
        return jsonify({"code": 400, "msg": "学号已存在"}), 400

    # 对密码进行哈希处理
    hashed_password = hash_password(password)

    # 创建新学生
    student = Student(
        id=student_id,
        name=name,
        class_name=class_name,
        password=hashed_password,
        create_time=datetime.now()
    )

    try:
        db.session.add(student)
        db.session.commit()
        return jsonify({
            "code": 200,
            "msg": "注册成功",
            "data": {"student_id": student.id, "name": student.name}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "code": 500,
            "msg": f"注册失败：{str(e)}"
        }), 500

# 学生登出
@bp.route("/logout", methods=["POST"])
def student_logout():
    # 清除所有会话变量
    session.pop("student_id", None)
    session.pop("user_type", None)
    return jsonify({"code": 200, "msg": "退出成功"})
