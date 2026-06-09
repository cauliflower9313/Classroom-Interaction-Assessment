"""学生端问题管理相关路由 - 支持课程关联"""
from flask import request, jsonify, session
from app.models import Question, Answer, Course, CourseStudent
from app.routes.student import bp
from app.routes.student.auth import student_login_required
from datetime import datetime, timedelta
from app import db


@bp.route("/questions/active", methods=["GET"])
@student_login_required
def get_active_questions(student_id):
    """获取当前活跃的问题列表（只返回当前上课会话期间发布的问题）"""
    try:
        # 只获取正在上课的课程的问题
        from app.models import Course, CourseSession
        
        print(f"[DEBUG] get_active_questions: 学生ID={student_id}")
        
        # 获取学生选修的所有正在上课的课程
        active_courses = Course.query.filter(
            Course.is_in_session == True,
            Course.students.any(id=student_id)
        ).all()
        
        active_course_ids = [c.id for c in active_courses]
        print(f"[DEBUG] 正在上课的课程ID: {active_course_ids}")
        
        if not active_course_ids:
            # 没有正在上课的课程，返回空列表
            print(f"[DEBUG] 没有正在上课的课程，返回空列表")
            response = jsonify({
                "code": 200,
                "msg": "获取成功",
                "data": []
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        
        # 获取当前正在进行的会话
        active_sessions = CourseSession.query.filter(
            CourseSession.course_id.in_(active_course_ids),
            CourseSession.status == 'active'
        ).all()
        
        if not active_sessions:
            print(f"[DEBUG] 没有找到正在进行的会话，返回空列表")
            response = jsonify({
                "code": 200,
                "msg": "获取成功",
                "data": []
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        
        # 获取会话开始时间，只查询在该时间之后发布的问题
        session_start_times = {s.course_id: s.start_time for s in active_sessions}
        print(f"[DEBUG] 会话开始时间: {session_start_times}")
        
        # 获取这些课程的活跃问题（只包括当前会话期间发布的）
        questions = Question.query.filter(
            Question.is_active == True,
            Question.course_id.in_(active_course_ids)
        ).order_by(Question.publish_time.desc()).all()
        
        # 过滤出在当前会话期间发布的问题
        filtered_questions = []
        for question in questions:
            course_id = question.course_id
            if course_id in session_start_times and question.publish_time:
                if question.publish_time >= session_start_times[course_id]:
                    filtered_questions.append(question)
        
        questions = filtered_questions
        print(f"[DEBUG] 过滤后的问题数: {len(questions)}")

        question_list = []
        for question in questions:
            # 检查学生是否已经回答过该问题
            existing_answer = Answer.query.filter_by(
                student_id=student_id, 
                question_id=question.id
            ).first()
            
            question_list.append({
                "id": question.id,
                "title": question.title,
                "content": question.content,
                "question_type": question.question_type,
                "options": question.options,
                "score": question.score,
                "time_limit": question.time_limit,
                "publish_time": question.publish_time.strftime("%Y-%m-%d %H:%M:%S"),
                "has_answered": existing_answer is not None,
                "answer_id": existing_answer.id if existing_answer else None,
                "course_id": question.course_id,
                "course_name": question.course.course_name if question.course else ""
            })

        response = jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": question_list
        })
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/questions", methods=["GET"])
@student_login_required
def get_course_questions(student_id, course_id):
    """获取指定课程的问题列表（只返回当前上课会话期间发布的问题）"""
    try:
        from app.models import CourseSession
        
        # 验证学生是否在该课程中
        course_student = CourseStudent.query.filter_by(
            course_id=course_id, 
            student_id=student_id
        ).first()
        
        if not course_student:
            return jsonify({"code": 403, "msg": "您不是该课程的学生"}), 403
        
        # 获取课程信息
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        # 检查课程是否正在上课
        if not course.is_in_session:
            print(f"[DEBUG] 课程 {course_id} 未在上课状态，返回空问题列表")
            response = jsonify({
                "code": 200,
                "msg": "获取成功",
                "data": {
                    "items": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 10,
                    "total_pages": 0,
                    "course_name": course.course_name
                }
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        
        # 获取当前正在进行的会话
        active_session = CourseSession.query.filter_by(
            course_id=course_id,
            status='active'
        ).first()
        
        if not active_session:
            print(f"[DEBUG] 课程 {course_id} 没有正在进行的会话，返回空问题列表")
            response = jsonify({
                "code": 200,
                "msg": "获取成功",
                "data": {
                    "items": [],
                    "total": 0,
                    "page": 1,
                    "page_size": 10,
                    "total_pages": 0,
                    "course_name": course.course_name
                }
            })
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            return response
        
        # 获取分页参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        offset = (page - 1) * page_size
        
        # 查询该课程的已发布问题（只包括当前会话期间发布的）
        query = Question.query.filter(
            Question.course_id == course_id,
            Question.is_active == True,
            Question.publish_time >= active_session.start_time
        )
        total = query.count()
        questions = query.order_by(Question.publish_time.desc()).offset(offset).limit(page_size).all()
        
        question_list = []
        for question in questions:
            # 检查学生是否已经回答过该问题
            existing_answer = Answer.query.filter_by(
                student_id=student_id, 
                question_id=question.id
            ).first()
            
            question_list.append({
                "id": question.id,
                "title": question.title,
                "content": question.content,
                "question_type": question.question_type,
                "options": question.options,
                "score": question.score,
                "time_limit": question.time_limit,
                "publish_time": question.publish_time.strftime("%Y-%m-%d %H:%M:%S") if question.publish_time else "",
                "has_answered": existing_answer is not None,
                "answer_id": existing_answer.id if existing_answer else None,
                "is_correct": existing_answer.is_correct if existing_answer else None,
                "student_score": existing_answer.score if existing_answer else 0
            })

        response = jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "items": question_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
                "course_name": course.course_name
            }
        })
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/submit_answer", methods=["POST"])
@student_login_required
def submit_answer(student_id):
    """学生提交答案（支持多种题型自动评分）"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    question_id = data.get("question_id")
    content = data.get("content")
    time_spent = data.get("time_spent", 0)
    
    print(f"=" * 50)
    print(f"收到答题请求 - 学生ID: {student_id}, 问题ID: {question_id}, 答案: '{content}'")
    print(f"=" * 50)

    if not question_id or content is None:
        return jsonify({"code": 400, "msg": "问题ID和答案不能为空"}), 400

    try:
        # 检查问题是否存在且活跃
        question = Question.query.get(question_id)
        if not question or not question.is_active:
            return jsonify({"code": 404, "msg": "问题不存在或已过期"}), 404

        # 如果问题关联了课程，验证学生是否在课程中
        if question.course_id:
            course_student = CourseStudent.query.filter_by(
                course_id=question.course_id, 
                student_id=student_id
            ).first()
            if not course_student:
                return jsonify({"code": 403, "msg": "您不是该课程的学生，无法回答此问题"}), 403

        # 检查是否已经回答过
        existing_answer = Answer.query.filter_by(
            student_id=student_id, 
            question_id=question_id
        ).first()
        
        if existing_answer:
            return jsonify({"code": 400, "msg": "您已经回答过该问题"}), 400

        # 自动评分逻辑
        is_correct = False
        score = 0
        
        print(f"=" * 50)
        print(f"评分开始 - 问题类型: '{question.question_type}'")
        print(f"检查条件: question_type in ['choice', 'single_choice', 'multiple_choice'] = {question.question_type in ['choice', 'single_choice', 'multiple_choice']}")

        if question.question_type in ["choice", "single_choice", "multiple_choice"]:
            # 选择题评分 - 去除空格后比较
            student_answer = content.strip() if content else ''
            correct_answer = question.correct_answer.strip() if question.correct_answer else ''
            is_correct = (student_answer == correct_answer)
            print(f"=" * 50)
            print(f"选择题评分调试:")
            print(f"  问题ID: {question_id}")
            print(f"  问题类型: {question.question_type}")
            print(f"  学生答案 (原始): '{content}'")
            print(f"  学生答案 (处理后): '{student_answer}'")
            print(f"  正确答案 (原始): '{question.correct_answer}'")
            print(f"  正确答案 (处理后): '{correct_answer}'")
            print(f"  选项 (原始): '{question.options}'")
            print(f"  是否匹配: {is_correct}")
            print(f"=" * 50)
            score = question.score if is_correct else 0
        elif question.question_type == "judgment":
            # 判断题评分
            is_correct = (content.lower() == question.correct_answer.lower())
            score = question.score if is_correct else 0
        elif question.question_type == "fill_blank":
            # 填空题评分（模糊匹配）
            is_correct = (content.strip().lower() == question.correct_answer.strip().lower())
            score = question.score if is_correct else 0
        else:
            # 主观题不自动评分
            print(f"进入else分支 - 主观题不评分，设置is_correct=None")
            is_correct = None
            score = 0

        print(f"评分结果 - is_correct: {is_correct}, score: {score}")
        print(f"=" * 50)

        print(f"准备创建答案记录 - is_correct: {is_correct}, score: {score}")
        
        answer = Answer(
            student_id=student_id,
            question_id=question_id,
            content=content,
            is_correct=is_correct,
            score=score,
            time_spent=time_spent,
            submit_time=datetime.now()
        )
        
        db.session.add(answer)
        print(f"答案记录已添加到session")
        
        db.session.commit()
        print(f"答案记录已提交到数据库 - answer_id: {answer.id}")
        
        response_data = {
            "code": 200,
            "msg": "答题提交成功",
            "data": {
                "answer_id": answer.id,
                "is_correct": is_correct,
                "score": score
            }
        }
        print(f"返回响应: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        db.session.rollback()
        print(f"提交答案时发生错误: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "code": 500,
            "msg": f"提交失败：{str(e)}",
            "data": {}
        }), 500


@bp.route("/question/detail/<int:question_id>", methods=["GET"])
@student_login_required
def get_question_detail(student_id, question_id):
    """获取问题详情"""
    try:
        question = Question.query.get(question_id)
        if not question or not question.is_active:
            return jsonify({"code": 404, "msg": "问题不存在或未发布"}), 404
        
        # 如果问题关联了课程，验证学生是否在课程中
        if question.course_id:
            course_student = CourseStudent.query.filter_by(
                course_id=question.course_id, 
                student_id=student_id
            ).first()
            if not course_student:
                return jsonify({"code": 403, "msg": "您不是该课程的学生"}), 403
        
        # 检查学生是否已经回答过
        existing_answer = Answer.query.filter_by(
            student_id=student_id, 
            question_id=question.id
        ).first()
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "id": question.id,
                "title": question.title,
                "content": question.content,
                "question_type": question.question_type,
                "options": question.options,
                "correct_answer": question.correct_answer if existing_answer else "",
                "score": question.score,
                "time_limit": question.time_limit,
                "has_answered": existing_answer is not None,
                "student_answer": existing_answer.content if existing_answer else None,
                "is_correct": existing_answer.is_correct if existing_answer else None,
                "student_score": existing_answer.score if existing_answer else 0
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/my_answers", methods=["GET"])
@student_login_required
def get_my_answers(student_id):
    """获取学生自己的答题记录（支持分页）"""
    try:
        # 获取分页参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        course_id = request.args.get('course_id')
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建查询
        query = Answer.query.filter_by(student_id=student_id)
        
        # 如果指定了课程ID，筛选该课程的答题记录
        if course_id:
            # 获取该课程的问题ID列表
            course_question_ids = [q.id for q in Question.query.filter_by(course_id=int(course_id)).all()]
            query = query.filter(Answer.question_id.in_(course_question_ids))
        
        # 获取总数
        total = query.count()
        
        # 分页查询
        answers = query.order_by(Answer.submit_time.desc()).offset(offset).limit(page_size).all()
        
        answer_list = []
        for answer in answers:
            question = Question.query.get(answer.question_id)
            answer_list.append({
                "question_id": answer.question_id,
                "question_title": question.title if question else "未知问题",
                "question_type": question.question_type if question else "text",
                "content": answer.content,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "submit_time": answer.submit_time.strftime("%Y-%m-%d %H:%M:%S"),
                "time_spent": answer.time_spent,
                "course_name": question.course.course_name if question and question.course else ""
            })

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "items": answer_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/my_answers", methods=["GET"])
@student_login_required
def get_my_course_answers(student_id, course_id):
    """获取学生在指定课程的答题记录"""
    try:
        # 验证学生是否在该课程中
        course_student = CourseStudent.query.filter_by(
            course_id=course_id, 
            student_id=student_id
        ).first()
        
        if not course_student:
            return jsonify({"code": 403, "msg": "您不是该课程的学生"}), 403
        
        # 获取课程信息
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        # 获取分页参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        offset = (page - 1) * page_size
        
        # 获取该课程的问题ID列表
        course_question_ids = [q.id for q in Question.query.filter_by(course_id=course_id).all()]
        
        # 查询学生在该课程的答题记录
        query = Answer.query.filter(
            Answer.student_id == student_id,
            Answer.question_id.in_(course_question_ids)
        )
        
        total = query.count()
        answers = query.order_by(Answer.submit_time.desc()).offset(offset).limit(page_size).all()
        
        answer_list = []
        for answer in answers:
            question = Question.query.get(answer.question_id)
            answer_list.append({
                "question_id": answer.question_id,
                "question_title": question.title if question else "未知问题",
                "question_type": question.question_type if question else "text",
                "content": answer.content,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "submit_time": answer.submit_time.strftime("%Y-%m-%d %H:%M:%S"),
                "time_spent": answer.time_spent
            })
        
        # 统计信息
        total_questions = len(course_question_ids)
        answered_questions = total
        correct_count = sum(1 for a in answers if a.is_correct)
        total_score = sum(a.score for a in answers)
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "items": answer_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
                "course_name": course.course_name,
                "statistics": {
                    "total_questions": total_questions,
                    "answered_questions": answered_questions,
                    "correct_count": correct_count,
                    "total_score": total_score,
                    "accuracy_rate": round((correct_count / answered_questions * 100), 2) if answered_questions > 0 else 0
                }
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
