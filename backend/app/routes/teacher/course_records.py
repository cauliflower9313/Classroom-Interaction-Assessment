from flask import request, jsonify, session
from app import db
from app.models import Teacher, Course, CourseRecord, StudentCourseRecord, Student, VideoRecord, AudioRecord, Answer, Question, QuestionComment, CourseStudent
from datetime import datetime, date
import json
from app.routes.teacher import bp

@bp.route('/course/<int:course_id>/records', methods=['GET'])
def get_teacher_course_records(course_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'code': 404, 'msg': '课程不存在'}), 404
    
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权访问此课程'}), 403
    
    course_records = CourseRecord.query.filter_by(course_id=course_id).order_by(CourseRecord.record_date.desc()).all()
    
    records_list = []
    for record in course_records:
        student_count = StudentCourseRecord.query.filter_by(course_record_id=record.id).count()
        
        records_list.append({
            'id': record.id,
            'record_date': record.record_date.strftime('%Y-%m-%d'),
            'record_name': record.record_name or f"课程记录",
            'description': record.description,
            'student_count': student_count,
            'create_time': record.create_time.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify({
        'code': 200,
        'msg': '获取成功',
        'data': {
            'course_name': course.course_name,
            'records': records_list
        }
    })

@bp.route('/course_record/<int:record_id>/students', methods=['GET'])
def get_record_students(record_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course_record = CourseRecord.query.get(record_id)
    if not course_record:
        return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
    
    course = Course.query.get(course_record.course_id)
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权访问此记录'}), 403
    
    student_records = StudentCourseRecord.query.filter_by(course_record_id=record_id).all()
    
    students_list = []
    for sr in student_records:
        students_list.append({
            'id': sr.id,
            'student_id': sr.student_id,
            'student_name': sr.student_name,
            'total_head_up_count': sr.total_head_up_count,
            'total_head_down_count': sr.total_head_down_count,
            'avg_head_up_rate': round(sr.avg_head_up_rate, 2),
            'audio_count': sr.audio_count,
            'question_count': sr.question_count,
            'answered_count': sr.answered_count,
            'correct_count': sr.correct_count,
            'total_score': sr.total_score
        })
    
    students_list.sort(key=lambda x: x['student_name'])
    
    return jsonify({
        'code': 200,
        'msg': '获取成功',
        'data': {
            'record_info': {
                'id': course_record.id,
                'record_date': course_record.record_date.strftime('%Y-%m-%d'),
                'record_name': course_record.record_name or '课程记录',
                'description': course_record.description
            },
            'students': students_list
        }
    })

@bp.route('/student_record/<int:student_record_id>/detail', methods=['GET'])
def get_student_record_detail_teacher(student_record_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    student_record = StudentCourseRecord.query.get(student_record_id)
    if not student_record:
        return jsonify({'code': 404, 'msg': '学生记录不存在'}), 404
    
    course_record = CourseRecord.query.get(student_record.course_record_id)
    if not course_record:
        return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
    
    course = Course.query.get(course_record.course_id)
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权访问此记录'}), 403
    
    video_records = []
    if student_record.video_records_json:
        try:
            video_records = json.loads(student_record.video_records_json)
        except:
            pass
    
    audio_records = []
    if student_record.audio_records_json:
        try:
            audio_records = json.loads(student_record.audio_records_json)
        except:
            pass
    
    answer_records = []
    if student_record.answer_records_json:
        try:
            answer_records = json.loads(student_record.answer_records_json)
        except:
            pass
    
    comment_records = []
    if student_record.comment_records_json:
        try:
            comment_records = json.loads(student_record.comment_records_json)
        except:
            pass
    
    return jsonify({
        'code': 200,
        'msg': '获取成功',
        'data': {
            'record_info': {
                'id': course_record.id,
                'record_date': course_record.record_date.strftime('%Y-%m-%d'),
                'record_name': course_record.record_name or '课程记录',
                'description': course_record.description
            },
            'student_record': {
                'id': student_record.id,
                'student_id': student_record.student_id,
                'student_name': student_record.student_name,
                'total_head_up_count': student_record.total_head_up_count,
                'total_head_down_count': student_record.total_head_down_count,
                'avg_head_up_rate': round(student_record.avg_head_up_rate, 2),
                'audio_count': student_record.audio_count,
                'question_count': student_record.question_count,
                'answered_count': student_record.answered_count,
                'correct_count': student_record.correct_count,
                'total_score': student_record.total_score
            },
            'video_records': video_records,
            'audio_records': audio_records,
            'answer_records': answer_records,
            'comment_records': comment_records
        }
    })

@bp.route('/course/<int:course_id>/auto_create_today_record', methods=['POST'])
def auto_create_today_record(course_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'code': 404, 'msg': '课程不存在'}), 404
    
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权操作此课程'}), 403
    
    today = date.today()
    
    existing_record = CourseRecord.query.filter_by(
        course_id=course_id,
        record_date=today
    ).first()
    
    if existing_record:
        return jsonify({
            'code': 200,
            'msg': '今日记录已存在',
            'data': {
                'id': existing_record.id,
                'record_date': existing_record.record_date.strftime('%Y-%m-%d'),
                'record_name': existing_record.record_name,
                'exists': True
            }
        })
    
    record_count = CourseRecord.query.filter_by(course_id=course_id).count()
    
    course_record = CourseRecord(
        course_id=course_id,
        record_date=today,
        record_name=f"第{record_count + 1}次课",
        description=f"{today.strftime('%Y年%m月%d日')}课程记录"
    )
    db.session.add(course_record)
    db.session.flush()
    
    course_students = CourseStudent.query.filter_by(course_id=course_id).all()
    archived_count = 0
    
    for cs in course_students:
        student_id = cs.student_id
        
        student = Student.query.get(student_id)
        if not student:
            continue
        
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id == student_id,
            db.func.date(VideoRecord.record_time) == today
        ).all()
        
        # 只获取被判定为提问的音频记录
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id == student_id,
            db.func.date(AudioRecord.record_time) == today,
            AudioRecord.is_question == True
        ).all()
        
        questions = Question.query.filter(
            Question.course_id == course_id,
            db.func.date(Question.publish_time) == today
        ).all()
        
        question_ids = [q.id for q in questions]
        answers = Answer.query.filter(
            Answer.student_id == student_id,
            Answer.question_id.in_(question_ids)
        ).all() if question_ids else []
        
        total_head_up = sum(vr.head_up_count for vr in video_records)
        total_head_down = sum(vr.head_down_count for vr in video_records)
        avg_head_up_rate = sum(vr.head_up_rate for vr in video_records) / len(video_records) if video_records else 0
        
        video_json = json.dumps([{
            'id': vr.id,
            'head_up_count': vr.head_up_count,
            'head_down_count': vr.head_down_count,
            'head_up_rate': round(vr.head_up_rate, 2),
            'record_time': vr.record_time.strftime('%Y-%m-%d %H:%M:%S')
        } for vr in video_records], ensure_ascii=False)
        
        audio_json = json.dumps([{
            'id': ar.id,
            'content': ar.content,
            'is_question': ar.is_question,
            'record_time': ar.record_time.strftime('%Y-%m-%d %H:%M:%S')
        } for ar in audio_records], ensure_ascii=False)
        
        answer_json = json.dumps([{
            'id': ans.id,
            'question_id': ans.question_id,
            'question_title': Question.query.get(ans.question_id).title if Question.query.get(ans.question_id) else '',
            'content': ans.content,
            'is_correct': ans.is_correct,
            'score': ans.score,
            'submit_time': ans.submit_time.strftime('%Y-%m-%d %H:%M:%S')
        } for ans in answers], ensure_ascii=False)
        
        comment_records = []
        for q in questions:
            comments = QuestionComment.query.filter_by(question_id=q.id).all()
            student_comments = [c for c in comments if c.author_id == student_id and c.author_type == 'student']
            for c in student_comments:
                comment_records.append({
                    'id': c.id,
                    'question_id': q.id,
                    'question_title': q.title,
                    'content': c.content,
                    'create_time': c.create_time.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        comment_json = json.dumps(comment_records, ensure_ascii=False)
        
        student_course_record = StudentCourseRecord(
            course_record_id=course_record.id,
            student_id=student_id,
            student_name=student.name,
            total_head_up_count=total_head_up,
            total_head_down_count=total_head_down,
            avg_head_up_rate=avg_head_up_rate,
            audio_count=len(audio_records),  # 识别提问数（只统计被判定为提问的音频）
            question_count=len(questions),
            answered_count=len(answers),
            correct_count=sum(1 for a in answers if a.is_correct),
            total_score=sum(a.score for a in answers),
            video_records_json=video_json,
            audio_records_json=audio_json,
            answer_records_json=answer_json,
            comment_records_json=comment_json
        )
        db.session.add(student_course_record)
        archived_count += 1
    
    db.session.commit()
    
    return jsonify({
        'code': 200,
        'msg': '创建成功',
        'data': {
            'id': course_record.id,
            'record_date': course_record.record_date.strftime('%Y-%m-%d'),
            'record_name': course_record.record_name,
            'archived_count': archived_count,
            'exists': False
        }
    })

@bp.route('/course/<int:course_id>/create_record', methods=['POST'])
def create_course_record(course_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'code': 404, 'msg': '课程不存在'}), 404
    
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权操作此课程'}), 403
    
    data = request.get_json() or {}
    record_name = data.get('record_name', '')
    description = data.get('description', '')
    
    today = date.today()
    
    existing_record = CourseRecord.query.filter_by(course_id=course_id, record_date=today).first()
    if existing_record:
        return jsonify({'code': 400, 'msg': '今日已有课程记录，请勿重复创建'}), 400
    
    course_record = CourseRecord(
        course_id=course_id,
        record_date=today,
        record_name=record_name or f"第{(CourseRecord.query.filter_by(course_id=course_id).count() + 1)}次课",
        description=description
    )
    db.session.add(course_record)
    db.session.commit()
    
    return jsonify({
        'code': 200,
        'msg': '创建成功',
        'data': {
            'id': course_record.id,
            'record_date': course_record.record_date.strftime('%Y-%m-%d'),
            'record_name': course_record.record_name
        }
    })

@bp.route('/course_record/<int:record_id>/archive', methods=['POST'])
def archive_course_record(record_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course_record = CourseRecord.query.get(record_id)
    if not course_record:
        return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
    
    course = Course.query.get(course_record.course_id)
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权操作此记录'}), 403
    
    course_students = CourseStudent.query.filter_by(course_id=course.id).all()
    
    for cs in course_students:
        student = Student.query.get(cs.student_id)
        if not student:
            continue
        
        existing = StudentCourseRecord.query.filter_by(
            course_record_id=record_id,
            student_id=student.id
        ).first()
        
        if existing:
            continue
        
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id == student.id,
            db.func.date(VideoRecord.record_time) == course_record.record_date
        ).all()
        
        # 只获取被判定为提问的音频记录
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id == student.id,
            db.func.date(AudioRecord.record_time) == course_record.record_date,
            AudioRecord.is_question == True
        ).all()
        
        questions = Question.query.filter(
            Question.course_id == course.id,
            db.func.date(Question.publish_time) == course_record.record_date
        ).all()
        
        question_ids = [q.id for q in questions]
        answers = Answer.query.filter(
            Answer.student_id == student.id,
            Answer.question_id.in_(question_ids)
        ).all() if question_ids else []
        
        total_head_up = sum(vr.head_up_count for vr in video_records)
        total_head_down = sum(vr.head_down_count for vr in video_records)
        avg_head_up_rate = sum(vr.head_up_rate for vr in video_records) / len(video_records) if video_records else 0
        
        video_json = json.dumps([{
            'id': vr.id,
            'head_up_count': vr.head_up_count,
            'head_down_count': vr.head_down_count,
            'head_up_rate': round(vr.head_up_rate, 2),
            'record_time': vr.record_time.strftime('%Y-%m-%d %H:%M:%S')
        } for vr in video_records])
        
        audio_json = json.dumps([{
            'id': ar.id,
            'content': ar.content,
            'is_question': ar.is_question,
            'record_time': ar.record_time.strftime('%Y-%m-%d %H:%M:%S')
        } for ar in audio_records])
        
        answer_json = json.dumps([{
            'id': ans.id,
            'question_id': ans.question_id,
            'question_title': Question.query.get(ans.question_id).title if Question.query.get(ans.question_id) else '',
            'content': ans.content,
            'is_correct': ans.is_correct,
            'score': ans.score,
            'submit_time': ans.submit_time.strftime('%Y-%m-%d %H:%M:%S')
        } for ans in answers])
        
        comment_records = []
        for q in questions:
            comments = QuestionComment.query.filter_by(question_id=q.id).all()
            student_comments = [c for c in comments if c.author_id == student.id and c.author_type == 'student']
            for c in student_comments:
                comment_records.append({
                    'id': c.id,
                    'question_id': q.id,
                    'question_title': q.title,
                    'content': c.content,
                    'create_time': c.create_time.strftime('%Y-%m-%d %H:%M:%S')
                })
        
        comment_json = json.dumps(comment_records)
        
        student_course_record = StudentCourseRecord(
            course_record_id=record_id,
            student_id=student.id,
            student_name=student.name,
            total_head_up_count=total_head_up,
            total_head_down_count=total_head_down,
            avg_head_up_rate=avg_head_up_rate,
            audio_count=len(audio_records),  # 识别提问数（只统计被判定为提问的音频）
            question_count=len(questions),
            answered_count=len(answers),
            correct_count=sum(1 for a in answers if a.is_correct),
            total_score=sum(a.score for a in answers),
            video_records_json=video_json,
            audio_records_json=audio_json,
            answer_records_json=answer_json,
            comment_records_json=comment_json
        )
        db.session.add(student_course_record)
    
    db.session.commit()
    
    return jsonify({
        'code': 200,
        'msg': '归档成功',
        'data': {
            'archived_count': StudentCourseRecord.query.filter_by(course_record_id=record_id).count()
        }
    })

@bp.route('/course_record/<int:record_id>', methods=['DELETE'])
def delete_course_record(record_id):
    teacher_id = session.get('teacher_id')
    if not teacher_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course_record = CourseRecord.query.get(record_id)
    if not course_record:
        return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
    
    course = Course.query.get(course_record.course_id)
    if course.teacher_id != teacher_id:
        return jsonify({'code': 403, 'msg': '无权操作此记录'}), 403
    
    StudentCourseRecord.query.filter_by(course_record_id=record_id).delete()
    db.session.delete(course_record)
    db.session.commit()
    
    return jsonify({
        'code': 200,
        'msg': '删除成功'
    })
