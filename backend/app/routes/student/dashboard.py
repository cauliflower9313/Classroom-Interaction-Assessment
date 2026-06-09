"""学生端仪表盘相关路由"""
from flask import render_template
from app.models import Student, VideoRecord, AudioRecord, Answer
from app.utils.multimodal_analysis import multimodal_analyzer
from app.routes.student import bp
from app.routes.student.auth import student_login_required

# 学生个人仪表盘 - 重定向到主页面
@bp.route("/dashboard")
@student_login_required
def student_dashboard(student_id):
    """学生个人仪表盘 - 重定向到主页面"""
    from flask import redirect, url_for
    return redirect(url_for("student.student_index"))

@bp.route("/dashboard/data", methods=["GET"])
@student_login_required
def get_dashboard_data(student_id):
    """获取仪表盘数据"""
    try:
        from app.models import Course, CourseSession
        from flask import jsonify
        
        student = Student.query.get(student_id)
        
        # 获取学生的所有视频记录
        video_records = VideoRecord.query.filter_by(student_id=student_id).all()
        
        # 获取学生的所有答题记录
        answers = Answer.query.filter_by(student_id=student_id).all()
        
        # 获取学生的所有音频记录
        audio_records = AudioRecord.query.filter_by(student_id=student_id).all()
        
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
        
        # 4. 统计识别提问数
        total_questions = sum(1 for a in audio_records if a.is_question)
        
        # 5. 统计答题次数
        total_answers = len(answers)
        
        # 6. 抬头率趋势
        head_up_trend = []
        if video_records:
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
        
        # 7. 答题正确率分布
        answer_accuracy = {
            "correct": sum(1 for a in answers if a.is_correct),
            "incorrect": sum(1 for a in answers if not a.is_correct)
        }
        
        # 8. 获取最近的记录
        recent_videos = VideoRecord.query.filter_by(student_id=student_id).order_by(VideoRecord.record_time.desc()).limit(5).all()
        recent_audios = AudioRecord.query.filter_by(student_id=student_id).order_by(AudioRecord.record_time.desc()).limit(5).all()
        recent_answers = Answer.query.filter_by(student_id=student_id).order_by(Answer.submit_time.desc()).limit(5).all()
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_courses": total_courses,
                "avg_head_up_rate": avg_head_up_rate,
                "avg_correct_rate": avg_correct_rate,
                "total_questions": total_questions,
                "total_answers": total_answers,
                "head_up_trend": head_up_trend,
                "answer_accuracy": answer_accuracy,
                "recent_videos": [{
                    "head_up_rate": v.head_up_rate,
                    "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
                } for v in recent_videos],
                "recent_audios": [{
                    "content": a.content,
                    "is_question": a.is_question,
                    "record_time": a.record_time.strftime("%Y-%m-%d %H:%M:%S")
                } for a in recent_audios],
                "recent_answers": [{
                    "question_id": a.question_id,
                    "score": a.score,
                    "is_correct": a.is_correct,
                    "submit_time": a.submit_time.strftime("%Y-%m-%d %H:%M:%S")
                } for a in recent_answers]
            }
        })
    except Exception as e:
        import traceback
        print(f"获取仪表盘数据失败: {str(e)}")
        print(traceback.format_exc())
        from flask import jsonify
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
