"""教师端仪表盘模块"""
from flask import request, jsonify
from app import db
from app.models import Student, VideoRecord, AudioRecord, Question, Answer, StudentSessionRecord
from app.routes.teacher.auth import teacher_login_required

from app.routes.teacher import bp


@bp.route("/dashboard/data", methods=["GET"])
@teacher_login_required
def get_dashboard_data(teacher_id):
    """获取仪表盘统计数据"""
    try:
        from app.models import Course, CourseSession
        
        # 1. 总学生数
        total_students = Student.query.count()
        
        # 2. 班级数（根据学生表中的class_name去重统计）
        students = Student.query.all()
        class_names = set(s.class_name for s in students if s.class_name)
        total_classes = len(class_names)
        
        # 获取当前教师的所有课程ID
        teacher_courses = Course.query.filter_by(teacher_id=teacher_id).all()
        teacher_course_ids = [c.id for c in teacher_courses]
        
        # 获取当前教师的所有会话ID
        teacher_sessions = CourseSession.query.filter(CourseSession.course_id.in_(teacher_course_ids)).all() if teacher_course_ids else []
        teacher_session_ids = [s.id for s in teacher_sessions]
        
        # 获取当前教师的所有问题ID
        teacher_questions = Question.query.filter_by(teacher_id=teacher_id).all()
        teacher_question_ids = [q.id for q in teacher_questions]
        
        # 3. 平均抬头率（只统计当前教师课程的学生会话记录）
        if teacher_session_ids:
            session_records = StudentSessionRecord.query.filter(StudentSessionRecord.session_id.in_(teacher_session_ids)).all()
            if session_records:
                avg_head_up_rate = round(sum(r.avg_head_up_rate for r in session_records) / len(session_records), 2)
            else:
                avg_head_up_rate = 0.0
        else:
            avg_head_up_rate = 0.0
        
        # 4. 提问总数（只统计当前教师课程的语音识别记录）
        if teacher_session_ids:
            # 将session_id转换为字符串类型进行查询
            session_id_strs = [str(sid) for sid in teacher_session_ids]
            total_questions = AudioRecord.query.filter(
                AudioRecord.session_id.in_(session_id_strs),
                AudioRecord.is_question == True
            ).count()
        else:
            total_questions = 0
        
        # 5. 平均正确率（只统计当前教师问题的答案）
        if teacher_question_ids:
            answers = Answer.query.filter(Answer.question_id.in_(teacher_question_ids)).all()
            if answers:
                correct_count = sum(1 for a in answers if a.is_correct)
                avg_correct_rate = round((correct_count / len(answers)) * 100, 2)
            else:
                avg_correct_rate = 0.0
        else:
            avg_correct_rate = 0.0
        
        # 6. 答题总数（只统计当前教师问题的答案）
        if teacher_question_ids:
            total_answers = Answer.query.filter(Answer.question_id.in_(teacher_question_ids)).count()
        else:
            total_answers = 0
        
        # 7. 课程数
        total_courses = Course.query.filter_by(teacher_id=teacher_id).count()
        
        # 8. 专业数（根据学生表中的major去重统计）
        majors = set(s.major for s in students if hasattr(s, 'major') and s.major)
        total_majors = len(majors) if majors else 0
        
        # 班级统计（用于图表）
        class_stats = []
        class_head_up_rates = []
        class_correct_rates = []
        for cls in class_names:
            student_count = Student.query.filter_by(class_name=cls).count()
            class_stats.append({
                "class_name": cls,
                "student_count": student_count
            })
            
            # 计算该班级的平均抬头率（只统计当前教师课程）
            class_students = Student.query.filter_by(class_name=cls).all()
            class_student_ids = [s.id for s in class_students]
            # 只统计当前教师会话的记录
            if teacher_session_ids:
                class_session_records = StudentSessionRecord.query.filter(
                    StudentSessionRecord.student_id.in_(class_student_ids),
                    StudentSessionRecord.session_id.in_(teacher_session_ids)
                ).all()
                if class_session_records:
                    class_avg_rate = round(sum(r.avg_head_up_rate for r in class_session_records) / len(class_session_records), 2)
                else:
                    class_avg_rate = 0.0
            else:
                class_avg_rate = 0.0
            class_head_up_rates.append({
                "class_name": cls,
                "avg_head_up_rate": class_avg_rate
            })
            
            # 计算该班级的平均正确率（只统计当前教师问题）
            if teacher_question_ids:
                class_answers = Answer.query.filter(
                    Answer.student_id.in_(class_student_ids),
                    Answer.question_id.in_(teacher_question_ids)
                ).all()
                if class_answers:
                    class_correct_count = sum(1 for a in class_answers if a.is_correct)
                    class_correct_rate = round((class_correct_count / len(class_answers)) * 100, 2)
                else:
                    class_correct_rate = 0.0
            else:
                class_correct_rate = 0.0
            class_correct_rates.append({
                "class_name": cls,
                "avg_correct_rate": class_correct_rate
            })
        
        # 专业统计（用于图表）
        major_stats = []
        for major in (majors if majors else []):
            student_count = Student.query.filter_by(major=major).count()
            major_stats.append({
                "major_name": major,
                "student_count": student_count
            })
        
        # 问题类型分布（用于图表）
        question_type_stats = []
        question_type_accuracy = []
        question_types = db.session.query(Question.question_type, db.func.count(Question.id)).filter_by(teacher_id=teacher_id).group_by(Question.question_type).all()
        for qtype, count in question_types:
            question_type_stats.append({
                "type": qtype,
                "count": count
            })
            
            # 计算该题型的正确率
            type_questions = Question.query.filter_by(teacher_id=teacher_id, question_type=qtype).all()
            type_question_ids = [q.id for q in type_questions]
            type_answers = Answer.query.filter(Answer.question_id.in_(type_question_ids)).all()
            if type_answers:
                correct_count = sum(1 for a in type_answers if a.is_correct)
                accuracy = round((correct_count / len(type_answers)) * 100, 2)
            else:
                accuracy = 0.0
            question_type_accuracy.append({
                "type": qtype,
                "accuracy": accuracy
            })
        
        # 每门课程的提问统计（用于图表）
        course_question_stats = []
        teacher_courses = Course.query.filter_by(teacher_id=teacher_id).all()
        for course in teacher_courses:
            # 统计该课程的提问数（通过session_id关联）
            course_sessions = CourseSession.query.filter_by(course_id=course.id).all()
            session_ids = [str(s.id) for s in course_sessions]  # 转换为字符串
            
            # 从AudioRecord中统计该课程的提问数
            if session_ids:
                question_count = AudioRecord.query.filter(
                    AudioRecord.session_id.in_(session_ids),
                    AudioRecord.is_question == True
                ).count()
            else:
                question_count = 0
            
            course_question_stats.append({
                "course_name": course.course_name,
                "question_count": question_count
            })
        
        # 知识点分类准确率统计（用于图表）
        category_accuracy_stats = []
        # 获取所有知识点分类
        categories = db.session.query(Question.category).filter_by(teacher_id=teacher_id).distinct().all()
        categories = [c[0] for c in categories if c[0]]
        
        for category in categories:
            # 获取该分类下的所有问题
            category_questions = Question.query.filter_by(teacher_id=teacher_id, category=category).all()
            category_question_ids = [q.id for q in category_questions]
            
            # 获取这些问题的所有回答
            category_answers = Answer.query.filter(Answer.question_id.in_(category_question_ids)).all()
            
            if category_answers:
                correct_count = sum(1 for a in category_answers if a.is_correct)
                accuracy = round((correct_count / len(category_answers)) * 100, 2)
            else:
                accuracy = 0.0
            
            category_accuracy_stats.append({
                "category": category,
                "accuracy": accuracy
            })
        
        # 答题趋势（最近7天，只统计当前教师问题）
        from datetime import datetime, timedelta
        today = datetime.now().date()
        answer_trend = []
        for i in range(6, -1, -1):
            date = today - timedelta(days=i)
            if teacher_question_ids:
                count = Answer.query.filter(
                    Answer.question_id.in_(teacher_question_ids),
                    db.func.date(Answer.submit_time) == date
                ).count()
            else:
                count = 0
            answer_trend.append({
                "date": date.strftime("%m-%d"),
                "count": count
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_students": total_students,
                "total_classes": total_classes,
                "avg_head_up_rate": avg_head_up_rate,
                "total_questions": total_questions,
                "avg_correct_rate": avg_correct_rate,
                "total_answers": total_answers,
                "total_courses": total_courses,
                "total_majors": total_majors,
                "class_stats": class_stats,
                "class_head_up_rates": class_head_up_rates,
                "class_correct_rates": class_correct_rates,
                "major_stats": major_stats,
                "question_type_stats": question_type_stats,
                "question_type_accuracy": question_type_accuracy,
                "course_question_stats": course_question_stats,
                "category_accuracy_stats": category_accuracy_stats,
                "answer_trend": answer_trend
            }
        })
        
    except Exception as e:
        import traceback
        print(f"获取仪表盘数据失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/statistics/class", methods=["GET"])
@teacher_login_required
def get_class_statistics(teacher_id):
    """获取班级整体答题统计"""
    try:
        # 获取教师发布的所有问题
        questions = Question.query.filter_by(teacher_id=teacher_id, is_active=True).all()
        
        total_questions = len(questions)
        total_answers = 0
        total_correct = 0
        total_score = 0
        max_score = 0
        
        for question in questions:
            answers = Answer.query.filter_by(question_id=question.id).all()
            total_answers += len(answers)
            total_correct += len([a for a in answers if a.is_correct])
            total_score += sum([a.score for a in answers])
            max_score += question.score * len(answers)
        
        avg_score = total_score / total_answers if total_answers > 0 else 0
        correct_rate = total_correct / total_answers if total_answers > 0 else 0
        total_students = Student.query.count()
        participation_rate = total_answers / (total_questions * total_students) if total_questions > 0 and total_students > 0 else 0
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_questions": total_questions,
                "total_answers": total_answers,
                "total_correct": total_correct,
                "correct_rate": round(correct_rate * 100, 2),
                "avg_score": round(avg_score, 2),
                "participation_rate": round(participation_rate * 100, 2),
                "total_score": total_score,
                "max_score": max_score
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
