"""学生端记录管理相关路由"""
from flask import jsonify
from app.models import VideoRecord, AudioRecord, Answer, Course, Question, CourseStudent, StudentCourseRecord, CourseRecord
from app import db
from app.routes.student import bp
from app.routes.student.auth import student_login_required
from datetime import datetime, timedelta

@bp.route("/my_records", methods=["GET"])
@student_login_required
def get_my_records(student_id):
    """获取学生个人记录统计"""
    try:
        video_records = VideoRecord.query.filter_by(student_id=student_id).all()
        total_video_records = len(video_records)
        last_video_time = video_records[-1].record_time.strftime("%Y-%m-%d %H:%M:%S") if video_records else None
        
        audio_records = AudioRecord.query.filter_by(student_id=student_id).all()
        total_audio_records = len(audio_records)
        last_audio_time = audio_records[-1].record_time.strftime("%Y-%m-%d %H:%M:%S") if audio_records else None
        
        answer_records = Answer.query.filter_by(student_id=student_id).all()
        total_answers = len(answer_records)
        last_answer_time = answer_records[-1].submit_time.strftime("%Y-%m-%d %H:%M:%S") if answer_records else None
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_video_records": total_video_records,
                "total_audio_records": total_audio_records,
                "total_answers": total_answers,
                "last_video_time": last_video_time,
                "last_audio_time": last_audio_time,
                "last_answer_time": last_answer_time
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/my_records", methods=["GET"])
@student_login_required
def get_my_course_records(student_id, course_id):
    """获取学生在特定课程中的个人记录"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        enrollment = CourseStudent.query.filter_by(course_id=course_id, student_id=student_id).first()
        if not enrollment:
            return jsonify({"code": 403, "msg": "您未加入此课程"}), 403
        
        video_records = VideoRecord.query.filter_by(student_id=student_id).order_by(VideoRecord.record_time.desc()).limit(50).all()
        total_head_up = sum(v.head_up_count or 0 for v in video_records)
        total_head_down = sum(v.head_down_count or 0 for v in video_records)
        total_frames = total_head_up + total_head_down
        avg_head_up_rate = (total_head_up / total_frames * 100) if total_frames > 0 else 0
        
        questions = Question.query.filter_by(course_id=course_id, is_active=True).all()
        question_ids = [q.id for q in questions]
        answers = Answer.query.filter_by(student_id=student_id).filter(Answer.question_id.in_(question_ids)).all()
        
        total_answers = len(answers)
        correct_answers = len([a for a in answers if a.is_correct])
        total_score = sum(a.score or 0 for a in answers)
        
        video_list = [{
            "id": v.id,
            "head_up_count": v.head_up_count,
            "head_down_count": v.head_down_count,
            "head_up_rate": round(v.head_up_rate * 100, 2) if v.head_up_rate else 0,
            "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for v in video_records]
        
        question_list = []
        for q in questions:
            my_answer = Answer.query.filter_by(student_id=student_id, question_id=q.id).first()
            question_list.append({
                "question_id": q.id,
                "title": q.title,
                "question_type": q.question_type,
                "score": q.score,
                "publish_time": q.publish_time.strftime("%Y-%m-%d %H:%M:%S") if q.publish_time else None,
                "my_answer": my_answer.content if my_answer else None,
                "is_correct": my_answer.is_correct if my_answer else None,
                "my_score": my_answer.score if my_answer else 0,
                "submit_time": my_answer.submit_time.strftime("%Y-%m-%d %H:%M:%S") if my_answer else None
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "course_name": course.course_name,
                "video_record_count": len(video_records),
                "avg_head_up_rate": round(avg_head_up_rate, 2),
                "total_questions": len(questions),
                "total_answers": total_answers,
                "correct_answers": correct_answers,
                "accuracy_rate": round(correct_answers / total_answers * 100, 2) if total_answers > 0 else 0,
                "total_score": total_score,
                "video_records": video_list,
                "question_records": question_list
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/my_course_records", methods=["GET"])
@student_login_required
def get_my_course_records_all(student_id):
    """获取学生所有课程记录 - 参考教师端记录查询格式"""
    try:
        # 获取学生信息
        from app.models import Student
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            return jsonify({'code': 404, 'msg': '学生不存在'}), 404
        
        # 获取学生加入的所有课程
        course_students = CourseStudent.query.filter_by(student_id=student_id).all()
        course_ids = [cs.course_id for cs in course_students]
        
        # 统计数据
        total_courses = 0
        total_head_up_rates = []
        total_correct_rates = []
        total_questions = 0
        
        records_list = []
        video_records_list = []
        audio_records_list = []
        answer_records_list = []
        
        # 获取学生的所有课程记录
        student_records = StudentCourseRecord.query.filter_by(student_id=student_id).all()
        
        for student_record in student_records:
            # 获取对应的 CourseRecord
            course_record = CourseRecord.query.filter_by(id=student_record.course_record_id).first()
            if not course_record:
                continue
            
            # 获取课程信息
            course = Course.query.filter_by(id=course_record.course_id).first()
            if not course or course.id not in course_ids:
                continue
            
            course_name = course.course_name
            total_courses += 1
            
            # 解析音频记录JSON
            audio_records = []
            if student_record.audio_records_json:
                try:
                    import json
                    audio_records = json.loads(student_record.audio_records_json)
                except:
                    audio_records = []
            
            # 统计提问数并添加到音频记录列表
            question_count = 0
            for a in audio_records:
                if a.get('is_question'):
                    question_count += 1
                # 添加到音频记录列表 - 包含课程信息
                audio_records_list.append({
                    'date': a.get('record_time', ''),
                    'course_name': course_name,
                    'is_question': a.get('is_question', False),
                    'content': a.get('content', ''),
                    'record_time': a.get('record_time', '')
                })
            total_questions += question_count
            
            # 计算正确率
            correct_count = student_record.correct_count or 0
            total_answered = student_record.answered_count or 0
            correct_rate = (correct_count / total_answered * 100) if total_answered > 0 else 0
            
            # 抬头率 - 优先从VideoRecord实时计算
            head_up_rate = 0
            if course_record and course_record.record_date:
                start_date = datetime.combine(course_record.record_date, datetime.min.time())
                end_date = datetime.combine(course_record.record_date, datetime.max.time())
                
                video_records = VideoRecord.query.filter(
                    VideoRecord.student_id == student_id,
                    VideoRecord.record_time >= start_date,
                    VideoRecord.record_time <= end_date
                ).all()
                
                if video_records:
                    avg_rate = sum(v.head_up_rate or 0 for v in video_records) / len(video_records)
                    head_up_rate = round(avg_rate * 100, 2)
                    
                    # 添加到视频记录列表 - 包含课程信息
                    for v in video_records:
                        video_records_list.append({
                            'record_time': v.record_time.strftime('%Y-%m-%d %H:%M:%S') if v.record_time else '',
                            'date': v.record_time.strftime('%m月%d日') if v.record_time else '',
                            'course_name': course_name,
                            'head_up_count': v.head_up_count or 0,
                            'head_down_count': v.head_down_count or 0,
                            'head_up_rate': round((v.head_up_rate or 0) * 100, 1)
                        })
                else:
                    head_up_rate = (student_record.avg_head_up_rate or 0) * 100
            else:
                head_up_rate = (student_record.avg_head_up_rate or 0) * 100
            
            if head_up_rate > 0:
                total_head_up_rates.append(head_up_rate)
            
            if correct_rate > 0:
                total_correct_rates.append(correct_rate)
            
            # 格式化时间
            record_date = course_record.record_date.strftime('%Y-%m-%d') if course_record.record_date else ''
            
            records_list.append({
                'record_id': student_record.id,
                'course_record_id': student_record.course_record_id,
                'course_id': course_record.course_id if course_record else None,
                'course_name': course_name,
                'session_time': record_date,
                'head_up_rate': head_up_rate,
                'answered_questions': total_answered,
                'total_questions': student_record.question_count or 0,
                'correct_rate': round(correct_rate, 2),
                'audio_question_count': question_count,
                'status': 'completed'
            })
        
        # 获取所有答题记录
        answers = Answer.query.filter_by(student_id=student_id).all()
        for ans in answers:
            question = Question.query.filter_by(id=ans.question_id).first()
            if question:
                # 获取问题所属课程
                question_course = Course.query.filter_by(id=question.course_id).first()
                course_name_for_answer = question_course.course_name if question_course else '未知课程'
                
                answer_records_list.append({
                    'date': ans.submit_time.strftime('%m月%d日') if ans.submit_time else '',
                    'course_name': course_name_for_answer,
                    'question_title': question.title if question else f'问题{ans.question_id}',
                    'my_answer': ans.content or '',
                    'correct_answer': question.correct_answer if question else '',
                    'is_correct': ans.is_correct or False,
                    'score': ans.score or 0,
                    'submit_time': ans.submit_time.strftime('%Y-%m-%d %H:%M:%S') if ans.submit_time else ''
                })
        
        # 计算平均数据
        avg_head_up_rate = sum(total_head_up_rates) / len(total_head_up_rates) if total_head_up_rates else 0
        avg_correct_rate = sum(total_correct_rates) / len(total_correct_rates) if total_correct_rates else 0
        
        return jsonify({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'student_info': {
                    'id': student.id,
                    'name': student.name,
                    'class_name': student.class_name
                },
                'course_records': records_list,
                'statistics': {
                    'total_courses': total_courses,
                    'avg_head_up_rate': round(avg_head_up_rate, 2),
                    'avg_correct_rate': round(avg_correct_rate, 2),
                    'total_questions': total_questions,
                    'total_answers': len(answer_records_list)
                },
                'video_records': video_records_list,
                'audio_records': audio_records_list,
                'answer_records': answer_records_list
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'code': 500, 'msg': f'获取失败: {str(e)}'}), 500
