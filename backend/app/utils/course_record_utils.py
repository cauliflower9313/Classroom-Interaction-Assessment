from app import db
from app.models import Course, CourseRecord, StudentCourseRecord, VideoRecord, AudioRecord, Answer, Question, QuestionComment, CourseStudent
from datetime import datetime, date
import json

def check_and_create_course_record(course_id):
    today = date.today()
    
    existing_record = CourseRecord.query.filter_by(
        course_id=course_id,
        record_date=today
    ).first()
    
    if existing_record:
        return existing_record
    
    course = Course.query.get(course_id)
    if not course:
        return None
    
    record_count = CourseRecord.query.filter_by(course_id=course_id).count()
    
    course_record = CourseRecord(
        course_id=course_id,
        record_date=today,
        record_name=f"第{record_count + 1}次课",
        description=f"{today.strftime('%Y年%m月%d日')}课程记录"
    )
    db.session.add(course_record)
    db.session.commit()
    
    return course_record

def archive_student_data(course_id, record_date=None):
    if record_date is None:
        record_date = date.today()
    
    course_record = CourseRecord.query.filter_by(
        course_id=course_id,
        record_date=record_date
    ).first()
    
    if not course_record:
        course_record = check_and_create_course_record(course_id)
    
    if not course_record:
        return {'success': False, 'message': '课程记录不存在'}
    
    course = Course.query.get(course_id)
    if not course:
        return {'success': False, 'message': '课程不存在'}
    
    course_students = CourseStudent.query.filter_by(course_id=course_id).all()
    archived_count = 0
    
    for cs in course_students:
        student_id = cs.student_id
        
        existing = StudentCourseRecord.query.filter_by(
            course_record_id=course_record.id,
            student_id=student_id
        ).first()
        
        if existing:
            continue
        
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id == student_id,
            db.func.date(VideoRecord.record_time) == record_date
        ).all()
        
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id == student_id,
            db.func.date(AudioRecord.record_time) == record_date
        ).all()
        
        questions = Question.query.filter(
            Question.course_id == course_id,
            db.func.date(Question.publish_time) == record_date
        ).all()
        
        question_ids = [q.id for q in questions]
        answers = Answer.query.filter(
            Answer.student_id == student_id,
            Answer.question_id.in_(question_ids)
        ).all() if question_ids else []
        
        from app.models import Student
        student = Student.query.get(student_id)
        if not student:
            continue
        
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
            audio_count=len(audio_records),
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
    
    return {
        'success': True,
        'archived_count': archived_count,
        'course_record_id': course_record.id
    }

def get_last_activity_date(course_id):
    last_video = VideoRecord.query.join(
        CourseStudent, VideoRecord.student_id == CourseStudent.student_id
    ).filter(
        CourseStudent.course_id == course_id
    ).order_by(VideoRecord.record_time.desc()).first()
    
    last_audio = AudioRecord.query.join(
        CourseStudent, AudioRecord.student_id == CourseStudent.student_id
    ).filter(
        CourseStudent.course_id == course_id
    ).order_by(AudioRecord.record_time.desc()).first()
    
    last_question = Question.query.filter_by(
        course_id=course_id
    ).order_by(Question.publish_time.desc()).first()
    
    dates = []
    if last_video:
        dates.append(last_video.record_time.date())
    if last_audio:
        dates.append(last_audio.record_time.date())
    if last_question:
        dates.append(last_question.publish_time.date())
    
    return max(dates) if dates else None

def should_auto_archive(course_id):
    last_activity = get_last_activity_date(course_id)
    if not last_activity:
        return False
    
    today = date.today()
    
    if last_activity < today:
        existing_record = CourseRecord.query.filter_by(
            course_id=course_id,
            record_date=last_activity
        ).first()
        
        if not existing_record:
            return True
    
    return False

def auto_archive_if_needed(course_id):
    if should_auto_archive(course_id):
        last_activity = get_last_activity_date(course_id)
        return archive_student_data(course_id, last_activity)
    return {'success': False, 'message': '无需归档'}
