"""教师端记录查询相关路由"""
from flask import Blueprint, request, jsonify, send_file
from app.models import Student, VideoRecord, AudioRecord, Answer, Course, CourseSession, StudentCourseRecord, CourseRecord
from app import db
import pandas as pd
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from datetime import datetime, timedelta
import json
from app.routes.teacher import bp

# 创建蓝图
records_bp = Blueprint('records', __name__)

# 注册蓝图到教师端蓝图
bp.register_blueprint(records_bp, url_prefix='/records')

# ==================== 学生课程记录查询API ====================

# 获取学生课程记录列表
@bp.route('/student/<string:student_id>/course-records', methods=['GET'])
def get_student_course_records(student_id):
    """获取指定学生的所有课程记录"""
    try:
        # 验证学生是否存在
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            return jsonify({'code': 404, 'msg': '学生不存在'}), 404
        
        # 获取课程筛选参数
        filter_course_id = request.args.get('course_id', type=int)
        
        # 获取该学生的所有课程记录
        student_records_query = StudentCourseRecord.query.filter_by(student_id=student_id)
        
        # 如果指定了课程筛选，先获取该课程的记录
        if filter_course_id:
            # 获取该课程的所有 course_record_ids
            course_record_ids = [cr.id for cr in CourseRecord.query.filter_by(course_id=filter_course_id).all()]
            student_records_query = student_records_query.filter(StudentCourseRecord.course_record_id.in_(course_record_ids))
        
        student_records = student_records_query.all()
        
        # 统计数据
        total_courses = 0
        total_head_up_rates = []
        total_correct_rates = []
        total_questions = 0
        abnormal_count = 0
        
        records_list = []
        for student_record in student_records:
            # 获取对应的 CourseRecord
            course_record = CourseRecord.query.filter_by(id=student_record.course_record_id).first()
            if not course_record:
                print(f"[DEBUG] 找不到 course_record_id={student_record.course_record_id}")
                continue
            
            # 获取课程信息
            course = Course.query.filter_by(id=course_record.course_id).first()
            course_name = course.course_name if course else '未知课程'
            total_courses += 1
            
            # 解析音频记录JSON
            audio_records = []
            if student_record.audio_records_json:
                try:
                    audio_records = json.loads(student_record.audio_records_json)
                except:
                    audio_records = []
            
            # 统计提问数
            question_count = len([a for a in audio_records if a.get('is_question')])
            total_questions += question_count
            
            # 计算正确率
            correct_count = student_record.correct_count or 0
            total_answered = student_record.answered_count or 0
            correct_rate = (correct_count / total_answered * 100) if total_answered > 0 else 0
            
            # 抬头率 - 优先从VideoRecord实时计算，确保数据准确
            head_up_rate = 0
            total_head_up = 0
            total_head_down = 0
            
            if course_record and course_record.record_date:
                # 查询该学生在该课程日期的所有视频记录
                start_date = datetime.combine(course_record.record_date, datetime.min.time())
                end_date = datetime.combine(course_record.record_date, datetime.max.time())
                
                video_records = VideoRecord.query.filter(
                    VideoRecord.student_id == student_id,
                    VideoRecord.record_time >= start_date,
                    VideoRecord.record_time <= end_date
                ).all()
                
                if video_records:
                    # 实时计算抬头率
                    total_head_up = sum(v.head_up_count or 0 for v in video_records)
                    total_head_down = sum(v.head_down_count or 0 for v in video_records)
                    avg_rate = sum(v.head_up_rate or 0 for v in video_records) / len(video_records)
                    head_up_rate = round(avg_rate * 100, 2)  # 转换为百分比 (0.97 -> 97)
                else:
                    # 没有视频记录时，使用StudentCourseRecord中存储的值
                    head_up_rate = (student_record.avg_head_up_rate or 0) * 100
            else:
                head_up_rate = (student_record.avg_head_up_rate or 0) * 100
            
            if head_up_rate > 0:
                total_head_up_rates.append(head_up_rate)
            
            if correct_rate > 0:
                total_correct_rates.append(correct_rate)
            
            # 异常记录（抬头率低于30%）
            if head_up_rate < 30:
                abnormal_count += 1
            
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
                    'abnormal_count': abnormal_count
                }
            }
        })
    except Exception as e:
        print(f"获取学生课程记录失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'code': 500, 'msg': f'获取失败: {str(e)}'}), 500


# 获取学生单次课程记录详情
@bp.route('/student/<string:student_id>/record/<int:record_id>/detail', methods=['GET'])
def get_student_session_detail(student_id, record_id):
    """获取学生单次课程的详细记录"""
    try:
        # 验证学生是否存在
        student = Student.query.filter_by(id=student_id).first()
        if not student:
            return jsonify({'code': 404, 'msg': '学生不存在'}), 404
        
        # 获取课程记录
        record = StudentCourseRecord.query.filter_by(
            id=record_id,
            student_id=student_id
        ).first()
        
        if not record:
            return jsonify({'code': 404, 'msg': '课程记录不存在'}), 404
        
        # 获取对应的 CourseRecord
        course_record = CourseRecord.query.filter_by(id=record.course_record_id).first()
        
        # 获取课程信息
        course = None
        if course_record:
            course = Course.query.filter_by(id=course_record.course_id).first()
        course_name = course.course_name if course else '未知课程'
        
        # 格式化时间
        session_time = ''
        if course_record and course_record.record_date:
            session_time = course_record.record_date.strftime('%Y-%m-%d')
        
        # 解析音频记录
        audio_records = []
        if record.audio_records_json:
            try:
                audio_data = json.loads(record.audio_records_json)
                for item in audio_data:
                    audio_records.append({
                        'record_time': item.get('record_time', ''),
                        'content': item.get('content', ''),
                        'is_question': item.get('is_question', False)
                    })
            except:
                audio_records = []
        
        # 获取答题记录 - 使用 course_record_id 关联
        answer_records = []
        if course_record:
            # 获取该课程记录关联的所有答案
            answers = Answer.query.filter_by(student_id=student_id).all()
            for answer in answers:
                from app.models import Question
                question = Question.query.filter_by(id=answer.question_id).first()
                if question and question.course_id == course_record.course_id:
                    answer_records.append({
                        'question_title': question.title if question else f'问题{answer.question_id}',
                        'answer': answer.content or '',
                        'is_correct': answer.is_correct or False,
                        'score': answer.score or 0,
                        'submit_time': answer.submit_time.strftime('%Y-%m-%d %H:%M:%S') if answer.submit_time else ''
                    })
        
        # 获取视频记录 - 使用 student_id 和 course_record 的时间范围
        video_records = []
        total_head_up_rate = 0
        if course_record and course_record.record_date:
            start_date = datetime.combine(course_record.record_date, datetime.min.time())
            end_date = datetime.combine(course_record.record_date, datetime.max.time())
            
            video_data = VideoRecord.query.filter(
                VideoRecord.student_id == student_id,
                VideoRecord.record_time >= start_date,
                VideoRecord.record_time <= end_date
            ).all()
            
            for video in video_data:
                # video.head_up_rate 存储的是小数（如0.97表示97%），需要转换为百分比
                video_head_up_rate = (video.head_up_rate or 0) * 100
                video_records.append({
                    'record_time': video.record_time.strftime('%Y-%m-%d %H:%M:%S') if video.record_time else '',
                    'head_up_count': video.head_up_count or 0,
                    'head_down_count': video.head_down_count or 0,
                    'head_up_rate': round(video_head_up_rate, 1)
                })
            
            # 实时计算平均抬头率
            if video_data:
                total_head_up_rate = sum(v.head_up_rate or 0 for v in video_data) / len(video_data) * 100
        
        # 计算统计数据
        correct_count = sum(1 for a in answer_records if a['is_correct'])
        total_answered = len(answer_records)
        correct_rate = (correct_count / total_answered * 100) if total_answered > 0 else 0
        
        question_count = len([a for a in audio_records if a['is_question']])
        
        # 使用实时计算的平均抬头率，如果没有视频记录则使用存储的值
        head_up_rate_value = total_head_up_rate if total_head_up_rate > 0 else (record.avg_head_up_rate or 0) * 100
        
        return jsonify({
            'code': 200,
            'msg': '获取成功',
            'data': {
                'student_name': student.name,
                'course_name': course_name,
                'session_time': session_time,
                'head_up_rate': round(head_up_rate_value, 1),
                'answered_count': total_answered,
                'total_questions': record.question_count or 0,
                'correct_rate': round(correct_rate, 2),
                'audio_question_count': question_count,
                'video_records': video_records,
                'audio_records': audio_records,
                'answer_records': answer_records
            }
        })
    except Exception as e:
        print(f"获取课程记录详情失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'code': 500, 'msg': f'获取失败: {str(e)}'}), 500


# ==================== 原有功能保留 ====================

# 获取学生课堂记录
@records_bp.route('/student-records', methods=['GET'])
def get_student_records():
    try:
        # 获取参数
        student_id = request.args.get('student_id')
        class_name = request.args.get('class_name')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        
        # 构建查询
        from app.models import MultiModalAnalysis
        query = db.session.query(
            MultiModalAnalysis.id,
            MultiModalAnalysis.student_id,
            Student.name,
            Student.class_name,
            MultiModalAnalysis.session_id,
            MultiModalAnalysis.class_id,
            MultiModalAnalysis.start_time,
            MultiModalAnalysis.end_time,
            MultiModalAnalysis.avg_head_up_rate,
            MultiModalAnalysis.participation_score,
            MultiModalAnalysis.understanding_score,
            MultiModalAnalysis.overall_score
        ).join(Student, MultiModalAnalysis.student_id == Student.id)
        
        # 应用过滤器
        if student_id:
            query = query.filter(MultiModalAnalysis.student_id == student_id)
        if class_name:
            query = query.filter(Student.class_name == class_name)
        if start_date:
            query = query.filter(MultiModalAnalysis.start_time >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(MultiModalAnalysis.end_time <= datetime.strptime(end_date, '%Y-%m-%d %H:%M:%S'))
        
        # 计算总数
        total = query.count()
        
        # 分页
        records = query.order_by(MultiModalAnalysis.start_time.desc()).offset((page-1)*page_size).limit(page_size).all()
        
        # 转换为字典列表
        result = []
        for record in records:
            result.append({
                'id': record.id,
                'student_id': record.student_id,
                'student_name': record.name,
                'class_name': record.class_name,
                'session_id': record.session_id,
                'class_id': record.class_id,
                'start_time': record.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end_time': record.end_time.strftime('%Y-%m-%d %H:%M:%S') if record.end_time else None,
                'avg_head_up_rate': round(record.avg_head_up_rate, 2),
                'participation_score': round(record.participation_score, 2),
                'understanding_score': round(record.understanding_score, 2),
                'overall_score': round(record.overall_score, 2)
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'total': total,
            'page': page,
            'page_size': page_size
        })
    except Exception as e:
        print(f"获取学生记录失败: {str(e)}")
        return jsonify({'success': False, 'message': '获取学生记录失败'})


# 获取班级记录
@records_bp.route('/class-records', methods=['GET'])
def get_class_records():
    try:
        # 获取参数
        class_name = request.args.get('class_name')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))
        
        # 构建查询
        from app.models import MultiModalAnalysis
        query = db.session.query(
            MultiModalAnalysis.id,
            MultiModalAnalysis.student_id,
            Student.name,
            Student.class_name,
            MultiModalAnalysis.session_id,
            MultiModalAnalysis.class_id,
            MultiModalAnalysis.start_time,
            MultiModalAnalysis.end_time,
            MultiModalAnalysis.avg_head_up_rate,
            MultiModalAnalysis.participation_score,
            MultiModalAnalysis.understanding_score,
            MultiModalAnalysis.overall_score
        ).join(Student, MultiModalAnalysis.student_id == Student.id)
        
        # 应用过滤器
        if class_name:
            query = query.filter(Student.class_name == class_name)
        if start_date:
            query = query.filter(MultiModalAnalysis.start_time >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            query = query.filter(MultiModalAnalysis.end_time <= datetime.strptime(end_date, '%Y-%m-%d %H:%M:%S'))
        
        # 计算总数
        total = query.count()
        
        # 分页
        records = query.order_by(MultiModalAnalysis.start_time.desc()).offset((page-1)*page_size).limit(page_size).all()
        
        # 转换为字典列表
        result = []
        for record in records:
            result.append({
                'id': record.id,
                'student_id': record.student_id,
                'student_name': record.name,
                'class_name': record.class_name,
                'session_id': record.session_id,
                'class_id': record.class_id,
                'start_time': record.start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end_time': record.end_time.strftime('%Y-%m-%d %H:%M:%S') if record.end_time else None,
                'avg_head_up_rate': round(record.avg_head_up_rate, 2),
                'participation_score': round(record.participation_score, 2),
                'understanding_score': round(record.understanding_score, 2),
                'overall_score': round(record.overall_score, 2)
            })
        
        return jsonify({
            'success': True,
            'data': result,
            'total': total,
            'page': page,
            'page_size': page_size
        })
    except Exception as e:
        print(f"获取班级记录失败: {str(e)}")
        return jsonify({'success': False, 'message': '获取班级记录失败'})
