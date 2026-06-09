"""教师端智能助手模块"""
from flask import request, jsonify
from app.routes.teacher.auth import teacher_login_required

from app.routes.teacher import bp


@bp.route("/assistant/class_analysis", methods=["GET"])
@teacher_login_required
def get_class_analysis(teacher_id):
    """获取班级分析报告"""
    try:
        from app.utils.teacher_assistant import teacher_assistant
        
        class_name = request.args.get('class_name')
        result = teacher_assistant.get_class_analysis(class_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"code": 500, "msg": f"分析失败：{str(e)}"}), 500


@bp.route("/assistant/student_insights/<student_id>", methods=["GET"])
@teacher_login_required
def get_student_insights(teacher_id, student_id):
    """获取学生洞察"""
    try:
        from app.utils.teacher_assistant import teacher_assistant
        
        result = teacher_assistant.get_student_insights(student_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/assistant/class_report", methods=["GET"])
@teacher_login_required
def generate_class_report(teacher_id):
    """生成班级报告"""
    try:
        from app.utils.teacher_assistant import teacher_assistant
        
        class_name = request.args.get('class_name')
        result = teacher_assistant.generate_class_report(class_name)
        return jsonify(result)
    except Exception as e:
        return jsonify({"code": 500, "msg": f"报告生成失败：{str(e)}"}), 500
