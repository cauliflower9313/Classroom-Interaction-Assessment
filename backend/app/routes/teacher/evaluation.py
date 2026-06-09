"""教师端互动评估模块"""
from flask import request, jsonify
from app import db
from app.models import (
    Student, VideoRecord, AudioRecord, Question, Answer,
    Course, CourseSession, StudentSessionRecord, CourseRecord, CourseStudent
)
from app.routes.teacher.auth import teacher_login_required
from app.routes.teacher import bp
from datetime import datetime, timedelta


@bp.route("/evaluation/report", methods=["GET"])
@teacher_login_required
def get_evaluation_report(teacher_id):
    """获取互动效果评估报告"""
    try:
        # 获取筛选参数
        course_id = request.args.get('course_id', type=int)
        class_name = request.args.get('class_name')

        # 获取当前教师的所有课程
        teacher_courses = Course.query.filter_by(teacher_id=teacher_id).all()
        teacher_course_ids = [c.id for c in teacher_courses]

        # 如果指定了课程，只统计该课程
        if course_id:
            if course_id not in teacher_course_ids:
                return jsonify({"code": 403, "msg": "无权访问该课程数据"}), 403
            target_course_ids = [course_id]
        else:
            target_course_ids = teacher_course_ids

        # 获取目标课程的所有课堂会话
        sessions = CourseSession.query.filter(
            CourseSession.course_id.in_(target_course_ids)
        ).all()
        session_ids = [s.id for s in sessions]
        session_id_strs = [str(sid) for sid in session_ids]

        # 1. 统计课堂次数
        total_sessions = len(sessions)

        # 2. 统计涉及课程数
        total_courses = len(set(s.course_id for s in sessions)) if sessions else 0

        # 3. 获取覆盖的学生
        if class_name:
            # 如果指定了班级，只统计该班级的学生
            students = Student.query.filter_by(class_name=class_name).all()
        else:
            # 获取所有与目标课程相关的学生
            # 方法1：从CourseStudent关联表中获取
            course_students = db.session.query(CourseStudent.student_id).filter(
                CourseStudent.course_id.in_(target_course_ids)
            ).distinct().all()
            course_student_ids = [cs[0] for cs in course_students]
            
            # 方法2：从参与过课堂的学生中获取
            student_ids_from_records = db.session.query(StudentSessionRecord.student_id).filter(
                StudentSessionRecord.session_id.in_(session_ids)
            ).distinct().all()
            record_student_ids = [sid[0] for sid in student_ids_from_records]
            
            # 合并两种方法获取的学生ID，确保包含所有相关学生
            all_student_ids = list(set(course_student_ids + record_student_ids))
            
            if all_student_ids:
                students = Student.query.filter(Student.id.in_(all_student_ids)).all()
            else:
                students = []

        total_students = len(students)
        student_ids = [s.id for s in students]

        # 4. 统计发布问题数
        questions = Question.query.filter(
            Question.teacher_id == teacher_id,
            Question.course_id.in_(target_course_ids) if target_course_ids else True
        ).all()
        total_questions = len(questions)
        question_ids = [q.id for q in questions]

        # 5. 计算平均抬头率（基于VideoRecord实时计算）
        if session_ids and student_ids:
            video_records = VideoRecord.query.filter(
                VideoRecord.session_id.in_(session_ids),
                VideoRecord.student_id.in_(student_ids)
            ).all()
            if video_records:
                avg_head_up_rate = round(
                    sum(v.head_up_rate or 0 for v in video_records) / len(video_records) * 100, 2
                )
            else:
                avg_head_up_rate = 0.0
        else:
            avg_head_up_rate = 0.0

        # 6. 计算平均正确率
        if question_ids and student_ids:
            answers = Answer.query.filter(
                Answer.question_id.in_(question_ids),
                Answer.student_id.in_(student_ids)
            ).all()
            if answers:
                correct_count = sum(1 for a in answers if a.is_correct)
                avg_correct_rate = round((correct_count / len(answers)) * 100, 2)
            else:
                avg_correct_rate = 0.0
        else:
            avg_correct_rate = 0.0

        # 7. 抬头率趋势（按日期统计）
        head_up_trend = []
        if session_ids:
            # 获取所有课堂日期
            session_dates = {}
            for session in sessions:
                if session.start_time:
                    date_key = session.start_time.strftime("%m-%d")
                    if date_key not in session_dates:
                        session_dates[date_key] = []
                    session_dates[date_key].append(session.id)

            for date_key, sids in sorted(session_dates.items()):
                day_records = VideoRecord.query.filter(
                    VideoRecord.session_id.in_(sids),
                    VideoRecord.student_id.in_(student_ids) if student_ids else True
                ).all()
                if day_records:
                    avg_rate = round(
                        sum(v.head_up_rate or 0 for v in day_records) / len(day_records) * 100, 2
                    )
                else:
                    avg_rate = 0.0
                head_up_trend.append({"date": date_key, "rate": avg_rate})

        # 8. 各课程正确率对比
        course_correct_rates = []
        for course in teacher_courses:
            if course_id and course.id != course_id:
                continue

            course_questions = Question.query.filter_by(
                teacher_id=teacher_id,
                course_id=course.id
            ).all()
            course_question_ids = [q.id for q in course_questions]

            if course_question_ids and student_ids:
                course_answers = Answer.query.filter(
                    Answer.question_id.in_(course_question_ids),
                    Answer.student_id.in_(student_ids)
                ).all()
                if course_answers:
                    correct_count = sum(1 for a in course_answers if a.is_correct)
                    correct_rate = round((correct_count / len(course_answers)) * 100, 2)
                else:
                    correct_rate = 0.0
            else:
                correct_rate = 0.0

            course_correct_rates.append({
                "course_name": course.course_name,
                "correct_rate": correct_rate
            })

        # 9. 学生参与度分布
        participation_distribution = {"high": 0, "medium": 0, "low": 0}
        for student in students:
            student_video_records = VideoRecord.query.filter(
                VideoRecord.session_id.in_(session_ids),
                VideoRecord.student_id == student.id
            ).all()
            if student_video_records:
                student_avg_rate = sum(v.head_up_rate or 0 for v in student_video_records) / len(student_video_records) * 100
                if student_avg_rate >= 80:
                    participation_distribution["high"] += 1
                elif student_avg_rate >= 60:
                    participation_distribution["medium"] += 1
                else:
                    participation_distribution["low"] += 1

        # 10. 异常学生列表（抬头率低于60%或无上课记录）
        abnormal_students = []
        for student in students:
            student_video_records = VideoRecord.query.filter(
                VideoRecord.session_id.in_(session_ids),
                VideoRecord.student_id == student.id
            ).all()
            if student_video_records:
                student_avg_rate = sum(v.head_up_rate or 0 for v in student_video_records) / len(student_video_records) * 100
                if student_avg_rate < 60:
                    # 统计参与课程数
                    course_count = db.session.query(VideoRecord.session_id).filter(
                        VideoRecord.student_id == student.id,
                        VideoRecord.session_id.in_(session_ids)
                    ).distinct().count()
                    abnormal_students.append({
                        "student_id": student.id,
                        "name": student.name,
                        "class_name": student.class_name,
                        "avg_head_up_rate": round(student_avg_rate, 2),
                        "course_count": course_count
                    })
            else:
                # 无上课记录的学生，直接添加到异常学生列表
                # 统计该学生在目标课程中的课程数
                student_course_count = db.session.query(CourseStudent).filter(
                    CourseStudent.student_id == student.id,
                    CourseStudent.course_id.in_(target_course_ids)
                ).count()
                abnormal_students.append({
                    "student_id": student.id,
                    "name": student.name,
                    "class_name": student.class_name,
                    "avg_head_up_rate": 0.0,
                    "course_count": student_course_count
                })

        # 按抬头率排序（从低到高）
        abnormal_students.sort(key=lambda x: x["avg_head_up_rate"])

        # 11. 优秀学生列表（抬头率高于90%）
        excellent_students = []
        for student in students:
            student_video_records = VideoRecord.query.filter(
                VideoRecord.session_id.in_(session_ids),
                VideoRecord.student_id == student.id
            ).all()
            if student_video_records:
                student_avg_rate = sum(v.head_up_rate or 0 for v in student_video_records) / len(student_video_records) * 100
                if student_avg_rate >= 90:
                    # 计算答题正确率
                    student_answers = Answer.query.filter(
                        Answer.student_id == student.id,
                        Answer.question_id.in_(question_ids)
                    ).all()
                    if student_answers:
                        correct_count = sum(1 for a in student_answers if a.is_correct)
                        correct_rate = round((correct_count / len(student_answers)) * 100, 2)
                    else:
                        correct_rate = 0.0

                    excellent_students.append({
                        "student_id": student.id,
                        "name": student.name,
                        "class_name": student.class_name,
                        "avg_head_up_rate": round(student_avg_rate, 2),
                        "correct_rate": correct_rate
                    })

        # 按抬头率排序（从高到低）
        excellent_students.sort(key=lambda x: x["avg_head_up_rate"], reverse=True)

        # 12. 易错题目列表（错误率高于50%）
        difficult_questions = []
        for question in questions:
            question_answers = Answer.query.filter_by(question_id=question.id).all()
            if question_answers:
                wrong_count = sum(1 for a in question_answers if not a.is_correct)
                error_rate = round((wrong_count / len(question_answers)) * 100, 2)
                if error_rate > 50:
                    difficult_questions.append({
                        "id": question.id,
                        "title": question.title,
                        "type": question.question_type,
                        "category": question.category,
                        "answer_count": len(question_answers),
                        "error_rate": error_rate
                    })

        # 按错误率排序（从高到低）
        difficult_questions.sort(key=lambda x: x["error_rate"], reverse=True)

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_sessions": total_sessions,
                "total_courses": total_courses,
                "total_students": total_students,
                "total_questions": total_questions,
                "avg_head_up_rate": avg_head_up_rate,
                "avg_correct_rate": avg_correct_rate,
                "head_up_trend": head_up_trend,
                "course_correct_rates": course_correct_rates,
                "participation_distribution": participation_distribution,
                "abnormal_students": abnormal_students,
                "excellent_students": excellent_students,
                "difficult_questions": difficult_questions
            }
        })

    except Exception as e:
        import traceback
        print(f"获取评估报告失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/evaluation/classes", methods=["GET"])
@teacher_login_required
def get_evaluation_classes(teacher_id):
    """获取评估页面使用的班级列表"""
    try:
        students = Student.query.all()
        class_names = sorted(set(s.class_name for s in students if s.class_name))
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": class_names
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
