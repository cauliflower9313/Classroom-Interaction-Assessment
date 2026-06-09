"""学生端问题讨论区相关路由"""
from flask import request, jsonify, session
from app import db
from app.models import QuestionComment, Question, Student, Teacher
from app.routes.student import bp
from app.routes.student.auth import student_login_required
from datetime import datetime


@bp.route("/question/<int:question_id>/comments", methods=["GET"])
@student_login_required
def get_question_comments(student_id, question_id):
    """获取问题的所有评论（包含回复）"""
    try:
        # 检查问题是否存在
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        # 获取所有顶级评论（parent_id为None）
        comments = QuestionComment.query.filter_by(
            question_id=question_id,
            parent_id=None,
            is_deleted=False
        ).order_by(QuestionComment.create_time.desc()).all()

        # 递归构建评论树
        def build_comment_tree(comment, depth=0):
            comment_data = comment.to_dict()
            comment_data['depth'] = depth
            comment_data['is_author'] = (comment.author_id == student_id and comment.author_type == 'student')

            # 获取该评论的所有回复
            replies = QuestionComment.query.filter_by(
                parent_id=comment.id,
                is_deleted=False
            ).order_by(QuestionComment.create_time.asc()).all()

            comment_data['replies'] = []
            for reply in replies:
                comment_data['replies'].append(build_comment_tree(reply, depth + 1))

            return comment_data

        comment_list = [build_comment_tree(comment) for comment in comments]

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "comments": comment_list,
                "total": len(comment_list)
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/question/<int:question_id>/comment", methods=["POST"])
@student_login_required
def add_question_comment(student_id, question_id):
    """学生发表评论"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    content = data.get("content", "").strip()
    parent_id = data.get("parent_id")  # 如果是回复，则有父评论ID

    if not content:
        return jsonify({"code": 400, "msg": "评论内容不能为空"}), 400

    try:
        # 检查问题是否存在
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        # 检查父评论是否存在（如果是回复）
        if parent_id:
            parent_comment = QuestionComment.query.get(parent_id)
            if not parent_comment or parent_comment.is_deleted:
                return jsonify({"code": 404, "msg": "回复的评论不存在"}), 404
            # 确保父评论属于同一个问题
            if parent_comment.question_id != question_id:
                return jsonify({"code": 400, "msg": "回复的评论不属于该问题"}), 400

        # 获取学生信息
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"code": 404, "msg": "学生不存在"}), 404

        # 创建评论
        comment = QuestionComment(
            question_id=question_id,
            author_id=student_id,
            author_type='student',
            author_name=student.name,
            content=content,
            parent_id=parent_id,
            create_time=datetime.now()
        )

        db.session.add(comment)
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "评论成功",
            "data": comment.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"评论失败：{str(e)}"}), 500


@bp.route("/comment/<int:comment_id>", methods=["DELETE"])
@student_login_required
def delete_question_comment(student_id, comment_id):
    """学生删除自己的评论"""
    try:
        comment = QuestionComment.query.get(comment_id)
        if not comment:
            return jsonify({"code": 404, "msg": "评论不存在"}), 404

        # 只能删除自己的评论
        if comment.author_id != student_id or comment.author_type != 'student':
            return jsonify({"code": 403, "msg": "无权删除此评论"}), 403

        # 软删除
        comment.is_deleted = True
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "删除成功"
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"删除失败：{str(e)}"}), 500


@bp.route("/comment/<int:comment_id>", methods=["PUT"])
@student_login_required
def update_question_comment(student_id, comment_id):
    """学生修改自己的评论"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"code": 400, "msg": "评论内容不能为空"}), 400

    try:
        comment = QuestionComment.query.get(comment_id)
        if not comment or comment.is_deleted:
            return jsonify({"code": 404, "msg": "评论不存在"}), 404

        # 只能修改自己的评论
        if comment.author_id != student_id or comment.author_type != 'student':
            return jsonify({"code": 403, "msg": "无权修改此评论"}), 403

        comment.content = content
        comment.update_time = datetime.now()
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "修改成功",
            "data": comment.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"修改失败：{str(e)}"}), 500
