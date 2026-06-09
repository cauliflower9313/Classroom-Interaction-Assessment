"""学生端互动评估模块"""
from flask import request, jsonify, render_template
from app import db
from app.models import (
    Student, VideoRecord, AudioRecord, Question, Answer,
    Course, CourseSession, StudentSessionRecord
)
from app.routes.student.auth import student_login_required
from app.routes.student import bp
from datetime import datetime, timedelta


@bp.route("/evaluation", methods=["GET"])
@student_login_required
def evaluation_page(student_id):
    """互动评估页面 - 重定向到主页面"""
    from flask import redirect, url_for
    return redirect(url_for("student.student_index"))


@bp.route("/evaluation/report", methods=["GET"])
@student_login_required
def get_evaluation_report(student_id):
    """获取学生个人互动评估报告"""
    try:
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"code": 404, "msg": "学生不存在"}), 404

        # 获取学生的所有视频记录
        video_records = VideoRecord.query.filter_by(student_id=student_id).all()
        
        # 获取学生的所有答题记录
        answers = Answer.query.filter_by(student_id=student_id).all()
        
        # 获取学生参与的所有课程
        session_ids = list(set([v.session_id for v in video_records if v.session_id]))
        sessions = CourseSession.query.filter(CourseSession.id.in_(session_ids)).all() if session_ids else []
        course_ids = list(set([s.course_id for s in sessions]))
        courses = Course.query.filter(Course.id.in_(course_ids)).all() if course_ids else []
        
        # 1. 统计参与课程数
        total_courses = len(courses)
        
        # 2. 计算平均抬头率
        if video_records:
            avg_head_up_rate = round(
                sum(v.head_up_rate or 0 for v in video_records) / len(video_records) * 100, 2
            )
        else:
            avg_head_up_rate = 0.0
        
        # 3. 计算平均正确率
        if answers:
            correct_count = sum(1 for a in answers if a.is_correct)
            avg_correct_rate = round((correct_count / len(answers)) * 100, 2)
        else:
            avg_correct_rate = 0.0
        
        # 4. 计算班级排名
        class_students = Student.query.filter_by(class_name=student.class_name).all()
        class_student_ids = [s.id for s in class_students]
        
        # 计算班级所有学生的平均抬头率
        student_head_up_rates = []
        for class_student in class_students:
            class_student_videos = VideoRecord.query.filter_by(student_id=class_student.id).all()
            if class_student_videos:
                class_student_avg = sum(v.head_up_rate or 0 for v in class_student_videos) / len(class_student_videos) * 100
                student_head_up_rates.append({
                    'student_id': class_student.id,
                    'avg_rate': class_student_avg
                })
            else:
                student_head_up_rates.append({
                    'student_id': class_student.id,
                    'avg_rate': 0
                })
        
        # 按抬头率排序，计算排名
        student_head_up_rates.sort(key=lambda x: x['avg_rate'], reverse=True)
        class_rank = next((i + 1 for i, s in enumerate(student_head_up_rates) if s['student_id'] == student_id), None)
        total_class_students = len(class_students)
        
        # 5. 抬头率趋势（按日期统计）
        head_up_trend = []
        if video_records:
            # 按日期分组
            date_records = {}
            for record in video_records:
                if record.record_time:
                    date_key = record.record_time.strftime("%m-%d")
                    if date_key not in date_records:
                        date_records[date_key] = []
                    date_records[date_key].append(record.head_up_rate or 0)
            
            for date_key in sorted(date_records.keys()):
                avg_rate = sum(date_records[date_key]) / len(date_records[date_key]) * 100
                head_up_trend.append({"date": date_key, "rate": round(avg_rate, 2)})
        
        # 6. 答题正确率趋势
        correct_rate_trend = []
        if answers:
            # 按日期分组
            date_records = {}
            for answer in answers:
                if answer.submit_time:
                    date_key = answer.submit_time.strftime("%m-%d")
                    if date_key not in date_records:
                        date_records[date_key] = []
                    date_records[date_key].append(1 if answer.is_correct else 0)
            
            for date_key in sorted(date_records.keys()):
                correct_rate = sum(date_records[date_key]) / len(date_records[date_key]) * 100
                correct_rate_trend.append({"date": date_key, "rate": round(correct_rate, 2)})
        
        # 7. 各课程表现
        course_performance = []
        for course in courses:
            # 获取该课程的所有session
            course_sessions = CourseSession.query.filter_by(course_id=course.id).all()
            course_session_ids = [s.id for s in course_sessions]
            
            # 计算该课程的抬头率
            course_videos = VideoRecord.query.filter(
                VideoRecord.student_id == student_id,
                VideoRecord.session_id.in_(course_session_ids)
            ).all() if course_session_ids else []
            
            if course_videos:
                course_avg_head_up = round(
                    sum(v.head_up_rate or 0 for v in course_videos) / len(course_videos) * 100, 2
                )
            else:
                course_avg_head_up = 0.0
            
            # 计算该课程的正确率
            course_questions = Question.query.filter_by(course_id=course.id).all()
            course_question_ids = [q.id for q in course_questions]
            course_answers = Answer.query.filter(
                Answer.student_id == student_id,
                Answer.question_id.in_(course_question_ids)
            ).all() if course_question_ids else []
            
            if course_answers:
                course_correct_count = sum(1 for a in course_answers if a.is_correct)
                course_avg_correct = round((course_correct_count / len(course_answers)) * 100, 2)
            else:
                course_avg_correct = 0.0
            
            course_performance.append({
                "course_name": course.course_name,
                "avg_head_up_rate": course_avg_head_up,
                "avg_correct_rate": course_avg_correct
            })
        
        # 8. 课堂参与度统计
        participation_stats = {"high": 0, "medium": 0, "low": 0}
        for session in sessions:
            session_videos = VideoRecord.query.filter_by(
                student_id=student_id,
                session_id=session.id
            ).all()
            if session_videos:
                session_avg_rate = sum(v.head_up_rate or 0 for v in session_videos) / len(session_videos) * 100
                if session_avg_rate >= 80:
                    participation_stats["high"] += 1
                elif session_avg_rate >= 60:
                    participation_stats["medium"] += 1
                else:
                    participation_stats["low"] += 1
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_courses": total_courses,
                "avg_head_up_rate": avg_head_up_rate,
                "avg_correct_rate": avg_correct_rate,
                "class_rank": class_rank,
                "total_class_students": total_class_students,
                "head_up_trend": head_up_trend,
                "correct_rate_trend": correct_rate_trend,
                "course_performance": course_performance,
                "participation_stats": participation_stats
            }
        })

    except Exception as e:
        import traceback
        print(f"获取学生评估报告失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
