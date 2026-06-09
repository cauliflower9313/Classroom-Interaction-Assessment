"""学生端课程管理模块"""
from flask import jsonify, request, session
from app.routes.student import bp
from app import db
from app.models import Course, Student, CourseStudent, CourseSession, StudentSessionRecord
from datetime import datetime
import json


@bp.route('/courses', methods=['GET'])
def get_student_courses():
    """获取学生的课程列表"""
    try:
        # 从会话中获取学生ID
        student_id = session.get('student_id')
        if not student_id:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        # 查询学生加入的课程
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            return jsonify({'code': 404, 'msg': '学生不存在'}), 404
        
        # 获取学生的课程
        courses = []
        for course in student.courses:
            # 统计课程中的学生人数
            student_count = len(course.students)
            # 假设每个课程有5个课时
            lesson_count = 5
            
            courses.append({
                'id': course.id,
                'name': course.course_name,
                'teacher_name': course.teacher.name,
                'created_at': course.create_time.strftime('%Y-%m-%d'),
                'student_count': student_count,
                'lesson_count': lesson_count,
                'status': '进行中',
                'is_in_session': course.is_in_session
            })
        
        print(f"学生 {student_id} 的课程列表: {[c['name'] for c in courses]}")
        return jsonify({'code': 200, 'data': courses}), 200
    
    except Exception as e:
        print(f"获取课程列表失败: {str(e)}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'}), 500


@bp.route('/courses/<int:course_id>', methods=['GET'])
def get_course_detail(course_id):
    """获取课程详情"""
    try:
        # 从会话中获取学生ID
        student_id = session.get('student_id')
        if not student_id:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        # 查询课程
        course = Course.query.filter_by(id=course_id).first()
        if not course:
            return jsonify({'code': 404, 'msg': '课程不存在'}), 404
        
        # 检查学生是否在课程中
        course_student = CourseStudent.query.filter_by(
            course_id=course_id, student_id=student_id
        ).first()
        if not course_student:
            return jsonify({'code': 403, 'msg': '您不是该课程的学生'}), 403
        
        # 统计课程中的学生人数
        student_count = len(course.students)
        # 假设每个课程有5个课时
        lesson_count = 5
        
        course_detail = {
            'id': course.id,
            'name': course.course_name,
            'teacher_name': course.teacher.name,
            'created_at': course.create_time.strftime('%Y-%m-%d'),
            'student_count': student_count,
            'lesson_count': lesson_count,
            'status': '进行中',
            'is_in_session': course.is_in_session
        }
        
        return jsonify({'code': 200, 'data': course_detail}), 200
    
    except Exception as e:
        print(f"获取课程详情失败: {str(e)}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'}), 500


@bp.route('/course/<int:course_id>/session_status', methods=['GET'])
def get_course_session_status(course_id):
    """获取课程上课状态"""
    try:
        student_id = session.get('student_id')
        if not student_id:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'code': 404, 'msg': '课程不存在'}), 404
        
        # 检查学生是否在课程中
        course_student = CourseStudent.query.filter_by(
            course_id=course_id, student_id=student_id
        ).first()
        if not course_student:
            return jsonify({'code': 403, 'msg': '您不是该课程的学生'}), 403
        
        # 获取当前活动的会话
        active_session = None
        if course.is_in_session:
            active_session = CourseSession.query.filter_by(
                course_id=course_id,
                status='active'
            ).order_by(CourseSession.start_time.desc()).first()
        
        return jsonify({
            'code': 200,
            'data': {
                'course_id': course.id,
                'course_name': course.course_name,
                'is_in_session': course.is_in_session,
                'session_start_time': course.session_start_time.strftime('%Y-%m-%d %H:%M:%S') if course.session_start_time else None,
                'session_id': active_session.id if active_session else None
            }
        })
    
    except Exception as e:
        print(f"获取课程上课状态失败: {str(e)}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'}), 500


@bp.route('/course/<int:course_id>/sessions', methods=['GET'])
def get_student_course_sessions(course_id):
    """获取学生在某课程的课堂记录列表"""
    try:
        student_id = session.get('student_id')
        if not student_id:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'code': 404, 'msg': '课程不存在'}), 404
        
        course_student = CourseStudent.query.filter_by(
            course_id=course_id, student_id=student_id
        ).first()
        if not course_student:
            return jsonify({'code': 403, 'msg': '您不是该课程的学生'}), 403
        
        sessions = CourseSession.query.filter_by(course_id=course_id).order_by(
            CourseSession.start_time.desc()
        ).all()
        
        session_list = []
        for s in sessions:
            student_record = StudentSessionRecord.query.filter_by(
                session_id=s.id, student_id=student_id
            ).first()
            
            if student_record:
                session_list.append({
                    'id': s.id,
                    'session_name': s.session_title,
                    'start_time': s.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'end_time': s.end_time.strftime('%Y-%m-%d %H:%M:%S') if s.end_time else None,
                    'status': s.status,
                    'total_questions': s.total_questions,
                    'answered_count': student_record.answered_count,
                    'correct_count': student_record.correct_count,
                    'total_score': student_record.total_score,
                    'avg_head_up_rate': student_record.avg_head_up_rate,
                    'audio_count': student_record.audio_count,
                    'has_warning': student_record.has_warning
                })
        
        return jsonify({'code': 200, 'data': session_list})
    
    except Exception as e:
        print(f"获取课堂记录失败: {str(e)}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'}), 500


@bp.route('/session/<int:session_id>/detail', methods=['GET'])
def get_student_session_detail(session_id):
    """获取学生在某次课堂的详细记录"""
    try:
        student_id = session.get('student_id')
        if not student_id:
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        session_record = CourseSession.query.get(session_id)
        if not session_record:
            return jsonify({'code': 404, 'msg': '课堂记录不存在'}), 404
        
        student_record = StudentSessionRecord.query.filter_by(
            session_id=session_id, student_id=student_id
        ).first()
        
        if not student_record:
            return jsonify({'code': 404, 'msg': '未找到您的课堂记录'}), 404
        
        unanswered = json.loads(student_record.unanswered_questions) if student_record.unanswered_questions else []
        warning_reasons = json.loads(student_record.warning_reasons) if student_record.warning_reasons else []
        
        return jsonify({
            'code': 200,
            'data': {
                'session': {
                    'id': session_record.id,
                    'session_name': session_record.session_title,
                    'start_time': session_record.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                    'end_time': session_record.end_time.strftime('%Y-%m-%d %H:%M:%S') if session_record.end_time else None,
                    'status': session_record.status,
                    'total_questions': session_record.total_questions
                },
                'student_record': {
                    'student_id': student_record.student_id,
                    'student_name': student_record.student_name,
                    'total_head_up_count': student_record.total_head_up_count,
                    'total_head_down_count': student_record.total_head_down_count,
                    'avg_head_up_rate': student_record.avg_head_up_rate,
                    'audio_count': student_record.audio_count,
                    'question_count': student_record.question_count,
                    'answered_count': student_record.answered_count,
                    'correct_count': student_record.correct_count,
                    'total_score': student_record.total_score,
                    'has_warning': student_record.has_warning,
                    'unanswered_questions': unanswered,
                    'warning_reasons': warning_reasons,
                    'video_records': json.loads(student_record.video_records_json) if student_record.video_records_json else [],
                    'audio_records': json.loads(student_record.audio_records_json) if student_record.audio_records_json else [],
                    'answer_records': json.loads(student_record.answer_records_json) if student_record.answer_records_json else []
                }
            }
        })
    
    except Exception as e:
        print(f"获取课堂详情失败: {str(e)}")
        return jsonify({'code': 500, 'msg': '服务器内部错误'}), 500


@bp.route('/course/<int:course_id>/update_session_record', methods=['POST'])
def update_student_session_record(course_id):
    """学生端在检测数据保存后，更新课程记录
    
    这个API在课程结束后，学生保存了视频/音频检测数据后调用，
    用于更新 StudentSessionRecord 中的统计数据
    """
    print(f"收到更新课程记录请求: course_id={course_id}")
    
    try:
        student_id = session.get('student_id')
        if not student_id:
            print(f"错误: 未登录")
            return jsonify({'code': 401, 'msg': '未登录'}), 401
        
        # 获取请求数据
        data = request.get_json() or {}
        question_count_from_frontend = data.get('question_count', 0)
        
        # 获取该课程最新的已结束会话
        course_session = CourseSession.query.filter_by(
            course_id=course_id,
            status='ended'
        ).order_by(CourseSession.end_time.desc()).first()
        
        if not course_session:
            return jsonify({'code': 404, 'msg': '未找到已结束的课堂记录'}), 404
        
        # 获取学生的课堂记录
        student_record = StudentSessionRecord.query.filter_by(
            session_id=course_session.id,
            student_id=student_id
        ).first()
        
        if not student_record:
            return jsonify({'code': 404, 'msg': '未找到学生课堂记录'}), 404
        
        # 查询该学生的视频记录（使用会话开始时间作为下限）
        from datetime import timedelta
        from app.models import VideoRecord, AudioRecord
        
        buffer_time = course_session.start_time - timedelta(minutes=5)
        session_id_str = str(course_session.id)
        
        # 查询视频记录（使用session_id精确筛选）
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id == student_id,
            VideoRecord.session_id == session_id_str  # 使用session_id精确筛选
        ).order_by(VideoRecord.record_time.desc()).all()
        
        # 如果没有找到记录（兼容旧数据），则回退到时间范围筛选
        if not video_records:
            print(f"使用session_id未找到视频记录，回退到时间范围筛选")
            video_records = VideoRecord.query.filter(
                VideoRecord.student_id == student_id,
                VideoRecord.record_time >= buffer_time,
                VideoRecord.record_time <= course_session.end_time  # 添加结束时间限制
            ).order_by(VideoRecord.record_time.desc()).all()
        
        total_head_up = sum(v.head_up_count or 0 for v in video_records)
        total_head_down = sum(v.head_down_count or 0 for v in video_records)
        total_frames = total_head_up + total_head_down
        avg_rate = (total_head_up / total_frames * 100) if total_frames > 0 else 0
        
        student_record.total_head_up_count = total_head_up
        student_record.total_head_down_count = total_head_down
        student_record.avg_head_up_rate = round(avg_rate, 2)
        
        # 查询音频记录（只统计被判定为提问的，使用session_id精确筛选）
        print(f"[DEBUG] 查询音频记录: student_id={student_id}, session_id={session_id_str}")
        
        # 先查询该学生的所有音频记录（用于调试）
        all_audios_debug = AudioRecord.query.filter(
            AudioRecord.student_id == student_id
        ).order_by(AudioRecord.record_time.desc()).limit(10).all()
        print(f"[DEBUG] 该学生最近10条音频记录:")
        for a in all_audios_debug:
            print(f"  session_id={a.session_id}, is_question={a.is_question}, content={a.content[:30] if a.content else '无'}...")
        
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id == student_id,
            AudioRecord.session_id == session_id_str,  # 使用session_id精确筛选
            AudioRecord.is_question == True
        ).order_by(AudioRecord.record_time.desc()).all()
        
        print(f"[DEBUG] 使用session_id筛选后找到 {len(audio_records)} 条提问记录")
        
        # 如果没有找到记录（兼容旧数据），则回退到时间范围筛选
        if not audio_records:
            print(f"使用session_id未找到记录，回退到时间范围筛选")
            audio_records = AudioRecord.query.filter(
                AudioRecord.student_id == student_id,
                AudioRecord.record_time >= buffer_time,
                AudioRecord.record_time <= course_session.end_time,  # 添加结束时间限制
                AudioRecord.is_question == True
            ).order_by(AudioRecord.record_time.desc()).all()
        
        # 使用前端传递的提问次数（检测界面的本节课累计提问次数）
        # 如果前端没有传递，则使用数据库查询到的音频记录数
        if question_count_from_frontend > 0:
            student_record.audio_count = question_count_from_frontend
            print(f"使用前端传递的提问次数: {question_count_from_frontend}")
        else:
            student_record.audio_count = len(audio_records)
            print(f"使用数据库查询的提问记录数: {len(audio_records)}")
        
        # 保存 JSON 数据
        student_record.video_records_json = json.dumps([{
            "id": v.id,
            "head_up_count": v.head_up_count,
            "head_down_count": v.head_down_count,
            "head_up_rate": round(v.head_up_rate * 100, 2) if v.head_up_rate else 0,  # 转换为百分比
            "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for v in video_records]) if video_records else None
        
        student_record.audio_records_json = json.dumps([{
            "id": a.id,
            "content": a.content,
            "is_question": a.is_question,
            "record_time": a.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for a in audio_records]) if audio_records else None
        
        db.session.commit()
        
        print(f"学生 {student_id} 的课程记录已更新: 抬头率={avg_rate:.1f}%, 提问次数={student_record.audio_count}")
        
        return jsonify({
            'code': 200,
            'msg': '课程记录更新成功',
            'data': {
                'avg_head_up_rate': round(avg_rate, 2),
                'audio_count': student_record.audio_count,
                'video_count': len(video_records)
            }
        })
    
    except Exception as e:
        print(f"更新课程记录失败: {str(e)}")
        db.session.rollback()
        return jsonify({'code': 500, 'msg': f'服务器内部错误: {str(e)}'}), 500
