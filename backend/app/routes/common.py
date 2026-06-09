"""通用接口路由 - 登录、文件上传等"""
from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from app import db
from app.models import Student, Teacher
from app.config import STUDENT_DEFAULT_PASSWORD, TEACHER_DEFAULT_PASSWORD
from app.utils.password_utils import check_password, hash_password
from datetime import datetime

# 初始化通用蓝图（带前缀）
bp = Blueprint("common", __name__, url_prefix="/common")

# 初始化API蓝图（不带前缀，用于 /api/* 路由）
api_bp = Blueprint("api", __name__)

# -------------------------- 通用登录接口 --------------------------
@bp.route("/login", methods=["POST"])
def common_login():
    """通用登录接口（区分学生/教师）"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    user_type = data.get("user_type")  # student/teacher
    user_id = data.get("user_id")
    password = data.get("password")

    # 验证参数
    if not user_type or not user_id or not password:
        return jsonify({"code": 400, "msg": "用户类型、ID、密码不能为空"}), 400

    # 学生登录
    if user_type == "student":
        student = Student.query.get(user_id)
        if not student:
            return jsonify({"code": 401, "msg": "学生ID不存在"}), 401

        # 验证密码（使用默认密码配置）
        if not check_password(password, student.password) and password != STUDENT_DEFAULT_PASSWORD:
            return jsonify({"code": 401, "msg": "密码错误"}), 401

        # 记录会话
        session["user_type"] = "student"
        session["student_id"] = student.id
        session.permanent = True

        return jsonify({
            "code": 200,
            "msg": "学生登录成功",
            "data": {"user_id": student.id, "name": student.name, "user_type": "student"}
        })

    # 教师登录
    elif user_type == "teacher":
        teacher = Teacher.query.get(user_id)
        if not teacher:
            return jsonify({"code": 401, "msg": "教师ID不存在"}), 401

        # 验证密码（使用默认密码配置）
        if not check_password(password, teacher.password) and password != TEACHER_DEFAULT_PASSWORD:
            return jsonify({"code": 401, "msg": "密码错误"}), 401

        # 记录会话
        session["user_type"] = "teacher"
        session["teacher_id"] = teacher.id
        session.permanent = True

        return jsonify({
            "code": 200,
            "msg": "教师登录成功",
            "data": {"user_id": teacher.id, "name": teacher.name, "user_type": "teacher"}
        })

    # 未知用户类型
    else:
        return jsonify({"code": 400, "msg": "用户类型只能是student或teacher"}), 400

# -------------------------- 通用登出接口 --------------------------
@bp.route("/logout", methods=["POST"])
def common_logout():
    """通用登出接口"""
    # 清空会话
    session.pop("user_type", None)
    session.pop("student_id", None)
    session.pop("teacher_id", None)

    return jsonify({"code": 200, "msg": "退出登录成功"})

# -------------------------- 文件上传接口 --------------------------
@bp.route("/upload", methods=["POST"])
def upload_file():
    """通用文件上传接口（问题文件、头像等）"""
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({"code": 400, "msg": "未选择文件"}), 400

        file = request.files['file']
        file_type = request.form.get("file_type", "other")  # question/avatar/other

        # 检查文件名
        if file.filename == '':
            return jsonify({"code": 400, "msg": "文件名不能为空"}), 400

        # 保存文件
        from app.config import UPLOAD_FOLDER
        import os
        from werkzeug.utils import secure_filename

        # 创建子目录
        upload_subdir = os.path.join(UPLOAD_FOLDER, file_type)
        os.makedirs(upload_subdir, exist_ok=True)

        # 安全文件名
        filename = secure_filename(file.filename)
        # 添加时间戳避免重复
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{filename}"

        # 保存文件
        file_path = os.path.join(upload_subdir, filename)
        file.save(file_path)

        # 返回文件路径
        relative_path = f"/static/uploads/{file_type}/{filename}"

        return jsonify({
            "code": 200,
            "msg": "文件上传成功",
            "data": {"file_path": relative_path, "filename": filename}
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"上传失败：{str(e)}"}), 500

# -------------------------- 首页接口 --------------------------
@bp.route("/index")
def common_index():
    """通用首页（跳转到登录页）"""
    return redirect(url_for("common.login_page"))

# -------------------------- 通用登录页 --------------------------
@bp.route("/login_page")
def login_page():
    """通用登录页（学生/教师切换）"""
    return render_template("login.html")


# ========================== 统一登录注册API ==========================

# -------------------------- 统一登录接口 --------------------------
@api_bp.route("/api/login", methods=["POST"])
def api_login():
    """统一登录接口（教师/学生）"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    role = data.get("role")  # teacher/student
    account = data.get("account")
    password = data.get("password")

    # 验证参数
    if not role or not account or not password:
        return jsonify({"code": 400, "msg": "角色、账号、密码不能为空"}), 400

    # 教师登录
    if role == "teacher":
        teacher = Teacher.query.get(account)
        if not teacher:
            return jsonify({"code": 401, "msg": "教师账号不存在"}), 401

        # 验证密码
        try:
            if not check_password(password, teacher.password) and password != TEACHER_DEFAULT_PASSWORD:
                return jsonify({"code": 401, "msg": "密码错误"}), 401
        except Exception:
            if password != TEACHER_DEFAULT_PASSWORD:
                return jsonify({"code": 401, "msg": "密码错误"}), 401

        # 记录会话
        session["user_type"] = "teacher"
        session["teacher_id"] = teacher.id
        session.permanent = True

        return jsonify({
            "code": 200,
            "msg": "登录成功",
            "data": {
                "user_id": teacher.id,
                "name": teacher.name,
                "role": "teacher"
            }
        })

    # 学生登录
    elif role == "student":
        student = Student.query.get(account)
        if not student:
            return jsonify({"code": 401, "msg": "学号不存在"}), 401

        # 验证密码
        try:
            # 首先检查是否是默认密码
            if password == STUDENT_DEFAULT_PASSWORD:
                pass
            # 然后尝试验证哈希密码
            elif not check_password(password, student.password):
                return jsonify({"code": 401, "msg": "密码错误"}), 401
        except Exception:
            # 如果密码哈希格式错误，尝试使用默认密码
            if password != STUDENT_DEFAULT_PASSWORD:
                return jsonify({"code": 401, "msg": "密码错误"}), 401

        # 记录会话
        session["user_type"] = "student"
        session["student_id"] = student.id
        session.permanent = True

        return jsonify({
            "code": 200,
            "msg": "登录成功",
            "data": {
                "user_id": student.id,
                "name": student.name,
                "role": "student"
            }
        })

    # 未知角色
    else:
        return jsonify({"code": 400, "msg": "角色只能是teacher或student"}), 400


# -------------------------- 统一注册接口 --------------------------
@api_bp.route("/api/register", methods=["POST"])
def api_register():
    """统一注册接口（支持学生和教师注册）"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    role = data.get("role")  # student/teacher
    account = data.get("account")
    name = data.get("name")
    password = data.get("password")

    # 验证参数
    if not role or not account or not name or not password:
        return jsonify({"code": 400, "msg": "角色、账号、姓名、密码不能为空"}), 400

    # 学生注册
    if role == "student":
        # 验证学号格式：12位数字，格式为 年份(4位) + 专业代码(4位) + 班级(2位) + 个人编号(2位)
        import re
        if not re.match(r'^\d{12}$', account):
            return jsonify({"code": 400, "msg": "学号格式错误，必须是12位数字，格式：202235150101"}), 400
        
        # 提取学号各部分
        year = account[:4]
        major_code = account[4:8]
        class_num = account[8:10]
        
        # 验证专业代码
        MAJOR_CODE_MAP = {
            '3501': '计算机科学与技术',
            '3502': '软件工程',
            '3503': '大数据科学与技术',
            '3515': '人工智能',
        }
        
        if major_code not in MAJOR_CODE_MAP:
            return jsonify({"code": 400, "msg": f"专业代码{major_code}不存在，可选：3501, 3502, 3503, 3515"}), 400
        
        # 自动生成班级名称
        major = MAJOR_CODE_MAP[major_code]
        year_suffix = year[2:4]
        class_num_str = str(int(class_num))
        
        if major == '计算机科学与技术':
            class_name = f"{year_suffix}计科{class_num_str}班"
        elif major == '软件工程':
            class_name = f"{year_suffix}软工{class_num_str}班"
        elif major == '大数据科学与技术':
            class_name = f"{year_suffix}大数据{class_num_str}班"
        elif major == '人工智能':
            class_name = f"{year_suffix}人工智能{class_num_str}班"
        else:
            class_name = f"{year_suffix}{major}{class_num_str}班"

        # 检查学号是否已存在
        existing_student = Student.query.get(account)
        if existing_student:
            return jsonify({"code": 400, "msg": "学号已存在"}), 400

        # 对密码进行哈希处理
        hashed_password = hash_password(password)

        # 创建新学生
        student = Student(
            id=account,
            name=name,
            class_name=class_name,
            grade=year,  # 年级
            major=major,  # 专业
            password=hashed_password,
            create_time=datetime.now()
        )

        try:
            db.session.add(student)
            db.session.commit()
            return jsonify({
                "code": 200,
                "msg": "注册成功",
                "data": {
                    "user_id": student.id,
                    "name": student.name,
                    "role": "student"
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "code": 500,
                "msg": f"注册失败：{str(e)}"
            }), 500

    # 教师注册
    elif role == "teacher":
        # 验证账号格式：6-20位字母数字
        import re
        if not re.match(r'^[a-zA-Z0-9]{6,20}$', account):
            return jsonify({"code": 400, "msg": "教师账号必须是6-20位字母或数字"}), 400
        
        # 检查教师账号是否已存在
        existing_teacher = Teacher.query.get(account)
        if existing_teacher:
            return jsonify({"code": 400, "msg": "教师账号已存在"}), 400
        
        # 对密码进行哈希处理
        hashed_password = hash_password(password)
        
        # 创建新教师
        teacher = Teacher(
            id=account,
            name=name,
            password=hashed_password,
            create_time=datetime.now()
        )
        
        try:
            db.session.add(teacher)
            db.session.commit()
            return jsonify({
                "code": 200,
                "msg": "注册成功",
                "data": {
                    "user_id": teacher.id,
                    "name": teacher.name,
                    "role": "teacher"
                }
            })
        except Exception as e:
            db.session.rollback()
            return jsonify({
                "code": 500,
                "msg": f"注册失败：{str(e)}"
            }), 500

    # 未知角色
    else:
        return jsonify({"code": 400, "msg": "角色只能是teacher或student"}), 400