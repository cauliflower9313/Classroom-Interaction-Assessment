from flask import request, jsonify, session
from app import db
from app.models import Student, Course, CourseRecord, StudentCourseRecord, VideoRecord, AudioRecord, Answer, Question, QuestionComment
from datetime import datetime, date
import json
from app.routes.student import bp

@bp.route('/course/<int:course_id>/records', methods=['GET'])
def get_student_course_records(course_id):
    student_id = session.get('student_id')
    if not student_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'code': 404, 'msg': '学生不存在'}), 404
    
    course = Course.query.get(course_id)
    if not course:
        return jsonify({'code': 404, 'msg': '课程不存在'}), 404
    
    course_records = CourseRecord.query.filter_by(course_id=course_id).order_by(CourseRecord.record_date.desc()).all()
    
    records_list = []
    for record in course_records:
        student_record = StudentCourseRecord.query.filter_by(
            course_record_id=record.id,
            student_id=student_id
        ).first()
        
        record_data = {
            'id': record.id,
            'record_date': record.record_date.strftime('%Y-%m-%d'),
            'record_name': record.record_name or f"第{len(records_list)+1}次课",
            'description': record.description,
            'create_time': record.create_time.strftime('%Y-%m-%d %H:%M:%S'),
            'has_record': student_record is not None
        }
        
        if student_record:
            record_data['student_record'] = {
                'total_head_up_count': student_record.total_head_up_count,
                'total_head_down_count': student_record.total_head_down_count,
                'avg_head_up_rate': round(student_record.avg_head_up_rate, 2),
                'audio_count': student_record.audio_count,
                'question_count': student_record.question_count,
                'answered_count': student_record.answered_count,
                'correct_count': student_record.correct_count,
                'total_score': student_record.total_score
            }
        
        records_list.append(record_data)
    
    return jsonify({
        'code': 200,
        'msg': '获取成功',
        'data': {
            'course_name': course.course_name,
            'records': records_list
        }
    })

@bp.route('/course_record/<int:record_id>/detail', methods=['GET'])
def get_student_record_detail(record_id):
    student_id = session.get('student_id')
    if not student_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    course_record = CourseRecord.query.get(record_id)
    if not course_record:
        return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
    
    student_record = StudentCourseRecord.query.filter_by(
        course_record_id=record_id,
        student_id=student_id
    ).first()
    
    if not student_record:
        return jsonify({'code': 404, 'msg': '该学生无此课程记录'}), 404
    
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

@bp.route('/course_records/all', methods=['GET'])
def get_all_student_records():
    student_id = session.get('student_id')
    if not student_id:
        return jsonify({'code': 401, 'msg': '未登录'}), 401
    
    student = Student.query.get(student_id)
    if not student:
        return jsonify({'code': 404, 'msg': '学生不存在'}), 404
    
    student_records = StudentCourseRecord.query.filter_by(student_id=student_id).all()
    
    records_list = []
    for sr in student_records:
        course_record = CourseRecord.query.get(sr.course_record_id)
        if course_record:
            course = Course.query.get(course_record.course_id)
            records_list.append({
                'id': sr.id,
                'course_record_id': course_record.id,
                'course_id': course_record.course_id,
                'course_name': course.course_name if course else '未知课程',
                'record_date': course_record.record_date.strftime('%Y-%m-%d'),
                'record_name': course_record.record_name or '课程记录',
                'total_head_up_count': sr.total_head_up_count,
                'total_head_down_count': sr.total_head_down_count,
                'avg_head_up_rate': round(sr.avg_head_up_rate, 2),
                'audio_count': sr.audio_count,
                'question_count': sr.question_count,
                'answered_count': sr.answered_count,
                'correct_count': sr.correct_count,
                'total_score': sr.total_score,
                'create_time': sr.create_time.strftime('%Y-%m-%d %H:%M:%S')
            })
    
    records_list.sort(key=lambda x: x['record_date'], reverse=True)
    
    return jsonify({
        'code': 200,
        'msg': '获取成功',
        'data': {
            'records': records_list
        }
    })
