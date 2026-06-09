"""教师端课程管理模块"""
from flask import request, jsonify
from app import db
from app.models import Course, CourseStudent, Student, VideoRecord, AudioRecord, Answer, CourseSession, StudentSessionRecord, Question
from app.routes.teacher.auth import teacher_login_required
from datetime import datetime
import json
import uuid

from app.routes.teacher import bp


@bp.route("/course/create", methods=["POST"])
@teacher_login_required
def create_course(teacher_id):
    """创建课程"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        course_name = data.get("course_name")
        description = data.get("description", "")
        student_ids = data.get("student_ids", [])
        
        if not course_name:
            return jsonify({"code": 400, "msg": "课程名称不能为空"}), 400
        
        # 创建课程
        course = Course(
            course_name=course_name,
            teacher_id=teacher_id,
            description=description,
            create_time=datetime.now()
        )
        db.session.add(course)
        db.session.flush()  # 获取课程ID
        
        # 添加学生到课程
        for student_id in student_ids:
            # 检查学生是否存在
            student = Student.query.get(student_id)
            if student:
                # 检查学生是否已在课程中
                existing = CourseStudent.query.filter_by(
                    course_id=course.id,
                    student_id=student_id
                ).first()
                if not existing:
                    course_student = CourseStudent(
                        course_id=course.id,
                        student_id=student_id,
                        join_time=datetime.now()
                    )
                    db.session.add(course_student)
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "课程创建成功",
            "data": {
                "course_id": course.id,
                "course_name": course.course_name
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"创建失败：{str(e)}"}), 500


@bp.route("/course/list", methods=["GET"])
@teacher_login_required
def get_course_list(teacher_id):
    """获取课程列表"""
    try:
        courses = Course.query.filter_by(teacher_id=teacher_id).order_by(Course.create_time.desc()).all()
        course_list = []
        for c in courses:
            # 获取课程学生的班级名称，去重
            classes = set()
            for student in c.students:
                if student.class_name:
                    classes.add(student.class_name)
            # 将班级名称转换为逗号分隔的字符串
            class_str = ", ".join(sorted(classes)) if classes else "暂无班级信息"
            
            course_list.append({
                "id": c.id,
                "course_name": c.course_name,
                "description": c.description,
                "student_count": len(c.students),
                "classes": class_str
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": course_list
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/detail/<int:course_id>", methods=["GET"])
@teacher_login_required
def get_course_detail(teacher_id, course_id):
    """获取课程详情"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        # 获取课程学生列表
        students = course.students
        student_list = []
        
        for s in students:
            # 获取学生的视频记录
            video_records = VideoRecord.query.filter_by(student_id=s.id).order_by(VideoRecord.record_time.desc()).limit(10).all()
            video_record_list = [{
                "id": record.id,
                "head_up_rate": record.head_up_rate,
                "head_up_count": record.head_up_count,
                "head_down_count": record.head_down_count,
                "create_time": record.record_time.strftime("%Y-%m-%d %H:%M:%S")
            } for record in video_records]
            
            # 获取学生的语音记录
            audio_records = AudioRecord.query.filter_by(student_id=s.id).order_by(AudioRecord.record_time.desc()).limit(10).all()
            audio_record_list = [{
                "id": record.id,
                "content": record.content,
                "is_question": record.is_question,
                "create_time": record.record_time.strftime("%Y-%m-%d %H:%M:%S")
            } for record in audio_records]
            
            # 获取学生的答题记录
            answers = Answer.query.filter_by(student_id=s.id).order_by(Answer.submit_time.desc()).limit(10).all()
            answer_list = [{
                "id": answer.id,
                "question_id": answer.question_id,
                "content": answer.content,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "time_spent": answer.time_spent,
                "submit_time": answer.submit_time.strftime("%Y-%m-%d %H:%M:%S")
            } for answer in answers]
            
            student_list.append({
                "id": s.id,
                "name": s.name,
                "grade": s.grade,
                "major": s.major,
                "class_name": s.class_name,
                "video_records": video_record_list,
                "audio_records": audio_record_list,
                "answers": answer_list
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "course": {
                    "id": course.id,
                    "course_name": course.course_name,
                    "description": course.description,
                    "create_time": course.create_time.strftime("%Y-%m-%d %H:%M:%S")
                },
                "students": student_list
            }
        })
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in get_course_detail: {error_traceback}")
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}", "error": error_traceback}), 500


@bp.route("/course/delete/<int:course_id>", methods=["POST"])
@teacher_login_required
def delete_course(teacher_id, course_id):
    """删除课程"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404

        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403

        # 删除课程相关的课堂会话（包括学生会话记录）
        from app.models import CourseSession, StudentSessionRecord
        sessions = CourseSession.query.filter_by(course_id=course_id).all()
        
        # 获取该课程的所有学生ID
        course_students = CourseStudent.query.filter_by(course_id=course_id).all()
        student_ids = [cs.student_id for cs in course_students]
        
        for session in sessions:
            # 删除学生会话记录
            StudentSessionRecord.query.filter_by(session_id=session.id).delete()
            # 删除会话
            db.session.delete(session)
        
        # 删除该课程所有学生的视频记录（通过student_id）
        if student_ids:
            VideoRecord.query.filter(VideoRecord.student_id.in_(student_ids)).delete(synchronize_session=False)
        
        # 删除该课程所有学生的音频记录（通过student_id）
        if student_ids:
            AudioRecord.query.filter(AudioRecord.student_id.in_(student_ids)).delete(synchronize_session=False)

        # 删除课程相关的问题（包括答案和评论）
        from app.models import Question, Answer, QuestionComment
        questions = Question.query.filter_by(course_id=course_id).all()
        for question in questions:
            # 删除问题的评论
            QuestionComment.query.filter_by(question_id=question.id).delete()
            # 删除问题的答案
            Answer.query.filter_by(question_id=question.id).delete()
            db.session.delete(question)

        # 删除课程学生关联
        CourseStudent.query.filter_by(course_id=course_id).delete()
        
        # 删除课程记录（CourseRecord 和 StudentCourseRecord）
        from app.models import CourseRecord, StudentCourseRecord
        course_records = CourseRecord.query.filter_by(course_id=course_id).all()
        for record in course_records:
            # 删除学生课程记录
            StudentCourseRecord.query.filter_by(course_record_id=record.id).delete()
            db.session.delete(record)

        # 删除课程
        db.session.delete(course)
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "课程删除成功"
        })
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"删除课程失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"删除失败：{str(e)}"}), 500


@bp.route("/course/add_students", methods=["POST"])
@teacher_login_required
def add_students_to_course(teacher_id):
    """向课程添加学生"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        course_id = data.get("course_id")
        student_ids = data.get("student_ids", [])
        
        if not course_id:
            return jsonify({"code": 400, "msg": "课程ID不能为空"}), 400
        
        # 检查课程是否存在
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        # 添加学生到课程
        added_count = 0
        for student_id in student_ids:
            # 检查学生是否存在
            student = Student.query.get(student_id)
            if student:
                # 检查学生是否已在课程中
                existing = CourseStudent.query.filter_by(
                    course_id=course_id,
                    student_id=student_id
                ).first()
                if not existing:
                    course_student = CourseStudent(
                        course_id=course_id,
                        student_id=student_id,
                        join_time=datetime.now()
                    )
                    db.session.add(course_student)
                    added_count += 1
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "添加成功",
            "data": {"added_count": added_count}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"添加失败：{str(e)}"}), 500


@bp.route("/course/remove_student", methods=["POST"])
@teacher_login_required
def remove_student_from_course(teacher_id):
    """从课程移除学生"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        course_id = data.get("course_id")
        student_id = data.get("student_id")
        
        if not course_id or not student_id:
            return jsonify({"code": 400, "msg": "课程ID和学生ID不能为空"}), 400
        
        # 检查课程是否存在
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        # 移除学生
        course_student = CourseStudent.query.filter_by(
            course_id=course_id,
            student_id=student_id
        ).first()
        
        if course_student:
            db.session.delete(course_student)
            db.session.commit()
            return jsonify({"code": 200, "msg": "移除成功"})
        else:
            return jsonify({"code": 404, "msg": "学生不在课程中"}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"移除失败：{str(e)}"}), 500


@bp.route("/course/update", methods=["POST"])
@teacher_login_required
def update_course(teacher_id):
    """更新课程信息"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        course_id = data.get("course_id")
        course_name = data.get("course_name")
        description = data.get("description", "")
        
        if not course_id or not course_name:
            return jsonify({"code": 400, "msg": "课程ID和课程名称不能为空"}), 400
        
        # 检查课程是否存在
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        # 更新课程信息
        course.course_name = course_name
        course.description = description
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "更新成功",
            "data": {
                "course_id": course.id,
                "course_name": course.course_name,
                "description": course.description
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"更新失败：{str(e)}"}), 500


@bp.route("/course/students/<int:course_id>", methods=["GET"])
@teacher_login_required
def get_course_students(teacher_id, course_id):
    """获取课程学生列表"""
    try:
        # 检查课程是否存在
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        # 获取课程学生
        students = course.students
        student_list = [{
            "id": s.id,
            "name": s.name,
            "grade": s.grade,
            "major": s.major,
            "class_name": s.class_name
        } for s in students]
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": student_list
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/records", methods=["GET"])
@teacher_login_required
def get_course_records(teacher_id, course_id):
    """获取课程记录（包含每名学生的抬头率、答题情况等）"""
    from app.models import Question
    
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        students = course.students
        questions = Question.query.filter_by(course_id=course_id).all()
        question_ids = [q.id for q in questions]
        
        student_records = []
        for student in students:
            video_records = VideoRecord.query.filter_by(student_id=student.id).all()
            total_head_up = sum(v.head_up_count or 0 for v in video_records)
            total_head_down = sum(v.head_down_count or 0 for v in video_records)
            total_frames = total_head_up + total_head_down
            avg_head_up_rate = (total_head_up / total_frames * 100) if total_frames > 0 else 0
            
            answers = Answer.query.filter_by(student_id=student.id).filter(Answer.question_id.in_(question_ids)).all()
            total_answers = len(answers)
            correct_answers = len([a for a in answers if a.is_correct])
            total_score = sum(a.score or 0 for a in answers)
            
            student_records.append({
                "student_id": student.id,
                "student_name": student.name,
                "class_name": student.class_name,
                "video_record_count": len(video_records),
                "avg_head_up_rate": round(avg_head_up_rate, 2),
                "total_answers": total_answers,
                "correct_answers": correct_answers,
                "accuracy_rate": round(correct_answers / total_answers * 100, 2) if total_answers > 0 else 0,
                "total_score": total_score
            })
        
        question_records = []
        for q in questions:
            answers = Answer.query.filter_by(question_id=q.id).all()
            correct_count = len([a for a in answers if a.is_correct])
            question_records.append({
                "question_id": q.id,
                "title": q.title,
                "question_type": q.question_type,
                "score": q.score,
                "is_active": q.is_active,
                "publish_time": q.publish_time.strftime("%Y-%m-%d %H:%M:%S") if q.publish_time else None,
                "total_answers": len(answers),
                "correct_count": correct_count,
                "accuracy_rate": round(correct_count / len(answers) * 100, 2) if answers else 0
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "course_name": course.course_name,
                "student_count": len(students),
                "question_count": len(questions),
                "student_records": student_records,
                "question_records": question_records
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/student/<student_id>/records", methods=["GET"])
@teacher_login_required
def get_course_student_detail_records(teacher_id, course_id, student_id):
    """获取课程中某学生的详细记录"""
    from app.models import Question
    
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"code": 404, "msg": "学生不存在"}), 404
        
        video_records = VideoRecord.query.filter_by(student_id=student_id).order_by(VideoRecord.record_time.desc()).limit(50).all()
        audio_records = AudioRecord.query.filter_by(student_id=student_id).order_by(AudioRecord.record_time.desc()).limit(50).all()
        
        questions = Question.query.filter_by(course_id=course_id).all()
        question_ids = [q.id for q in questions]
        answers = Answer.query.filter_by(student_id=student_id).filter(Answer.question_id.in_(question_ids)).order_by(Answer.submit_time.desc()).all()
        
        video_list = [{
            "id": v.id,
            "head_up_count": v.head_up_count,
            "head_down_count": v.head_down_count,
            "head_up_rate": round(v.head_up_rate * 100, 2) if v.head_up_rate else 0,
            "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for v in video_records]
        
        audio_list = [{
            "id": a.id,
            "content": a.content,
            "is_question": a.is_question,
            "record_time": a.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for a in audio_records]
        
        answer_list = []
        for a in answers:
            question = Question.query.get(a.question_id)
            answer_list.append({
                "id": a.id,
                "question_id": a.question_id,
                "question_title": question.title if question else "未知问题",
                "content": a.content,
                "is_correct": a.is_correct,
                "score": a.score,
                "submit_time": a.submit_time.strftime("%Y-%m-%d %H:%M:%S")
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "student_id": student.id,
                "student_name": student.name,
                "class_name": student.class_name,
                "video_records": video_list,
                "audio_records": audio_list,
                "answers": answer_list
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/start_session", methods=["POST"])
@teacher_login_required
def start_course_session(teacher_id, course_id):
    """开始上课"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        if course.is_in_session:
            return jsonify({"code": 400, "msg": "课程已在进行中"}), 400
        
        session_title = request.get_json().get("session_name", "") if request.is_json else ""
        
        course_session = CourseSession(
            course_id=course_id,
            session_title=session_title or f"{course.course_name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            start_time=datetime.now(),
            status='active',
            teacher_id=teacher_id,
            total_students=len(course.students)
        )
        db.session.add(course_session)
        
        course.is_in_session = True
        course.session_start_time = datetime.now()
        
        print(f"开始上课: 课程ID={course_id}, 学生数={len(course.students)}")
        for student in course.students:
            print(f"  创建学生记录: student_id={student.id}, name={student.name}")
            student_record = StudentSessionRecord(
                session=course_session,
                student_id=student.id,
                student_name=student.name
            )
            db.session.add(student_record)
        
        db.session.commit()
        print(f"开始上课成功: 会话ID={course_session.id}")
        
        return jsonify({
            "code": 200,
            "msg": "开始上课成功",
            "data": {
                "session_id": course_session.id,
                "session_name": course_session.session_title,
                "start_time": course_session.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_students": len(course.students)
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"开始上课失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/end_session", methods=["POST"])
@teacher_login_required
def end_course_session(teacher_id, course_id):
    """结束上课"""
    print(f"\n{'='*60}")
    print(f"结束上课API被调用: course_id={course_id}, teacher_id={teacher_id}")
    print(f"{'='*60}")
    try:
        course = Course.query.get(course_id)
        if not course:
            print(f"错误: 课程不存在")
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            print(f"错误: 无权操作此课程")
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        if not course.is_in_session:
            print(f"错误: 课程未在进行中")
            return jsonify({"code": 400, "msg": "课程未在进行中"}), 400
        
        print(f"课程状态: is_in_session={course.is_in_session}")
        
        active_session = CourseSession.query.filter_by(
            course_id=course_id, 
            status='active'
        ).order_by(CourseSession.start_time.desc()).first()
        
        if not active_session:
            return jsonify({"code": 404, "msg": "未找到进行中的会话"}), 404
        
        active_session.end_time = datetime.now()
        active_session.status = 'ended'
        
        # 查询本次课堂期间发布的问题
        questions = Question.query.filter_by(course_id=course_id).filter(
            Question.publish_time >= active_session.start_time
        ).all()
        active_session.total_questions = len(questions)
        
        # 注意：不再将问题设置为非活跃状态，因为学生端现在通过时间范围过滤
        # 这样教师端仍然可以看到所有已发布的问题
        
        student_records = StudentSessionRecord.query.filter_by(session_id=active_session.id).all()
        
        print(f"结束上课: 会话ID={active_session.id}, 学生记录数={len(student_records)}, 问题数={len(questions)}")
        print(f"会话时间范围: {active_session.start_time} 到 {active_session.end_time}")
        
        # 调试：查询所有视频记录
        all_videos = VideoRecord.query.order_by(VideoRecord.record_time.desc()).limit(5).all()
        print(f"数据库中最近5条视频记录:")
        for v in all_videos:
            print(f"  学生={v.student_id}, 时间={v.record_time}, 抬头={v.head_up_count}")
        
        # 调试：查询所有音频记录
        all_audios = AudioRecord.query.order_by(AudioRecord.record_time.desc()).limit(5).all()
        print(f"数据库中最近5条音频记录:")
        for a in all_audios:
            print(f"  学生={a.student_id}, 时间={a.record_time}, 内容={a.content[:20] if a.content else '无'}")
        
        if not student_records:
            print(f"警告: 会话 {active_session.id} 没有学生记录!")
        
        for record in student_records:
            print(f"处理学生记录: student_id={record.student_id}, student_name={record.student_name}")
            
            # 查询该学生在该课堂开始时间之后的最新视频记录
            # 由于视频记录是在课程结束后保存的，所以不限制结束时间
            from datetime import timedelta
            buffer_time = active_session.start_time - timedelta(minutes=5)  # 放宽到5分钟
            
            print(f"查询视频记录: student_id={record.student_id}, buffer_time={buffer_time}")
            
            # 先查询该学生的所有视频记录，然后手动筛选
            all_student_videos = VideoRecord.query.filter_by(student_id=record.student_id).order_by(VideoRecord.record_time.desc()).limit(10).all()
            print(f"学生 {record.student_id} 的最近10条视频记录:")
            for v in all_student_videos:
                print(f"  时间={v.record_time}, 抬头={v.head_up_count}, 低头={v.head_down_count}")
            
            # 筛选出在课堂期间及之后的记录（因为记录是在结束后保存的）
            video_records = [v for v in all_student_videos if v.record_time >= buffer_time]
            print(f"筛选后视频记录数: {len(video_records)}")
            
            total_head_up = sum(v.head_up_count or 0 for v in video_records)
            total_head_down = sum(v.head_down_count or 0 for v in video_records)
            total_frames = total_head_up + total_head_down
            avg_rate = (total_head_up / total_frames * 100) if total_frames > 0 else 0
            
            record.total_head_up_count = total_head_up
            record.total_head_down_count = total_head_down
            record.avg_head_up_rate = round(avg_rate, 2)
            
            # 查询该学生在课堂期间的音频记录（只统计被判定为提问的）
            # 使用更宽松的时间范围：课堂开始前30分钟到课堂结束后30分钟
            extended_start_time = active_session.start_time - timedelta(minutes=30)
            extended_end_time = active_session.end_time + timedelta(minutes=30) if active_session.end_time else datetime.now() + timedelta(minutes=30)
            
            # 同时使用 session_id 和时间范围进行筛选
            session_id_str = str(active_session.id)
            all_student_audios = AudioRecord.query.filter(
                AudioRecord.student_id == record.student_id,
                AudioRecord.session_id == session_id_str,  # 使用 session_id 筛选
                AudioRecord.is_question == True
            ).order_by(AudioRecord.record_time.desc()).all()
            
            print(f"学生 {record.student_id} 在会话 {session_id_str} 中的提问音频记录数: {len(all_student_audios)}")
            for a in all_student_audios[:5]:  # 只打印前5条
                print(f"  时间={a.record_time}, session_id={a.session_id}, 是否提问={a.is_question}, 内容={a.content[:30] if a.content else '无'}...")
            
            # 如果没有找到记录，尝试使用时间范围筛选（兼容旧数据）
            if not all_student_audios:
                print(f"使用 session_id 未找到记录，尝试使用时间范围筛选...")
                all_student_audios = AudioRecord.query.filter(
                    AudioRecord.student_id == record.student_id,
                    AudioRecord.record_time >= extended_start_time,
                    AudioRecord.record_time <= extended_end_time,
                    AudioRecord.is_question == True
                ).order_by(AudioRecord.record_time.desc()).all()
                print(f"时间范围筛选后记录数: {len(all_student_audios)}")
            
            audio_records = all_student_audios
            
            record.audio_count = len(audio_records)  # 识别提问数
            
            print(f"最终音频记录数: {len(audio_records)}")
            print(f"学生 {record.student_id}: 抬头={total_head_up}, 低头={total_head_down}, 抬头率={record.avg_head_up_rate}%, 音频={len(audio_records)}")
            
            question_ids = [q.id for q in questions]
            answers = Answer.query.filter_by(student_id=record.student_id).filter(
                Answer.question_id.in_(question_ids)
            ).all()
            
            record.question_count = len(questions)
            record.answered_count = len(answers)
            record.correct_count = len([a for a in answers if a.is_correct])
            record.total_score = sum(a.score or 0 for a in answers)
            
            answered_question_ids = [a.question_id for a in answers]
            unanswered = [q.id for q in questions if q.id not in answered_question_ids]
            record.unanswered_questions = json.dumps(unanswered) if unanswered else None
            
            if unanswered:
                record.has_warning = True
                record.warning_reasons = json.dumps([f"未回答问题ID: {qid}" for qid in unanswered])
            
            print(f"保存 video_records_json: 记录数={len(video_records)}")
            video_records_data = [{
                "id": v.id,
                "head_up_count": v.head_up_count,
                "head_down_count": v.head_down_count,
                "head_up_rate": round(v.head_up_rate * 100, 2) if v.head_up_rate else 0,  # 转换为百分比
                "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
            } for v in video_records]
            print(f"video_records_data: {video_records_data}")
            record.video_records_json = json.dumps(video_records_data) if video_records else None
            
            print(f"保存 audio_records_json: 记录数={len(audio_records)}")
            record.audio_records_json = json.dumps([{
                "id": a.id,
                "content": a.content,
                "is_question": a.is_question,
                "record_time": a.record_time.strftime("%Y-%m-%d %H:%M:%S")
            } for a in audio_records]) if audio_records else None
            
            record.answer_records_json = json.dumps([{
                "id": a.id,
                "question_id": a.question_id,
                "content": a.content,
                "is_correct": a.is_correct,
                "score": a.score,
                "submit_time": a.submit_time.strftime("%Y-%m-%d %H:%M:%S")
            } for a in answers]) if answers else None
        
        course.is_in_session = False
        course.session_start_time = None
        
        # 自动创建课程记录（每次上课独立记录）
        from app.models import CourseRecord, StudentCourseRecord
        from datetime import date
        
        record_count = CourseRecord.query.filter_by(course_id=course_id).count()
        course_record = CourseRecord(
            course_id=course_id,
            record_date=date.today(),
            record_name=f"第{record_count + 1}次课 ({active_session.start_time.strftime('%m月%d日 %H:%M')})",
            description=f"{active_session.session_title} - 上课时长: {((active_session.end_time - active_session.start_time).total_seconds() // 60)}分钟"
        )
        db.session.add(course_record)
        db.session.flush()  # 获取course_record.id
        
        # 将本次会话的学生记录复制到课程记录中
        for record in student_records:
            student_course_record = StudentCourseRecord(
                course_record_id=course_record.id,
                student_id=record.student_id,
                student_name=record.student_name,
                total_head_up_count=record.total_head_up_count,
                total_head_down_count=record.total_head_down_count,
                avg_head_up_rate=record.avg_head_up_rate,
                audio_count=record.audio_count,  # 识别提问数
                question_count=record.question_count,
                answered_count=record.answered_count,
                correct_count=record.correct_count,
                total_score=record.total_score,
                video_records_json=record.video_records_json,
                audio_records_json=record.audio_records_json,
                answer_records_json=record.answer_records_json,
                comment_records_json=None
            )
            db.session.add(student_course_record)
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "结束上课成功",
            "data": {
                "session_id": active_session.id,
                "session_name": active_session.session_title,
                "start_time": active_session.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": active_session.end_time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_students": len(student_records),
                "total_questions": len(questions),
                "course_record_id": course_record.id,
                "course_record_name": course_record.record_name
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"结束上课失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/session_status", methods=["GET"])
@teacher_login_required
def get_course_session_status(teacher_id, course_id):
    """获取课程会话状态"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        active_session = CourseSession.query.filter_by(
            course_id=course_id, 
            status='active'
        ).order_by(CourseSession.start_time.desc()).first()
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "is_in_session": course.is_in_session,
                "session_start_time": course.session_start_time.strftime("%Y-%m-%d %H:%M:%S") if course.session_start_time else None,
                "active_session": {
                    "id": active_session.id,
                    "session_name": active_session.session_title,
                    "start_time": active_session.start_time.strftime("%Y-%m-%d %H:%M:%S")
                } if active_session else None
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/sessions", methods=["GET"])
@teacher_login_required
def get_course_sessions(teacher_id, course_id):
    """获取课程所有会话记录"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        sessions = CourseSession.query.filter_by(course_id=course_id).order_by(CourseSession.start_time.desc()).all()
        
        session_list = []
        for s in sessions:
            student_records = StudentSessionRecord.query.filter_by(session_id=s.id).all()
            # 异常学生：has_warning为true或抬头率低于30%
            warning_count = len([r for r in student_records if r.has_warning or (r.avg_head_up_rate or 0) < 30])

            session_list.append({
                "id": s.id,
                "session_name": s.session_title,
                "start_time": s.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                "end_time": s.end_time.strftime("%Y-%m-%d %H:%M:%S") if s.end_time else None,
                "status": s.status,
                "total_students": s.total_students,
                "total_questions": s.total_questions,
                "warning_count": warning_count
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": session_list
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/session/<int:session_id>/detail", methods=["GET"])
@teacher_login_required
def get_session_detail(teacher_id, session_id):
    """获取会话详情（所有学生数据）"""
    try:
        session = CourseSession.query.get(session_id)
        if not session:
            return jsonify({"code": 404, "msg": "会话不存在"}), 404
        
        course = Course.query.get(session.course_id)
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此会话"}), 403
        
        student_records = StudentSessionRecord.query.filter_by(session_id=session_id).all()
        
        records_list = []
        for r in student_records:
            unanswered = json.loads(r.unanswered_questions) if r.unanswered_questions else []
            warning_reasons = json.loads(r.warning_reasons) if r.warning_reasons else []
            
            records_list.append({
                "student_id": r.student_id,
                "student_name": r.student_name,
                "total_head_up_count": r.total_head_up_count,
                "total_head_down_count": r.total_head_down_count,
                "avg_head_up_rate": r.avg_head_up_rate,
                "audio_count": r.audio_count,
                "question_count": r.question_count,
                "answered_count": r.answered_count,
                "correct_count": r.correct_count,
                "total_score": r.total_score,
                "has_warning": r.has_warning,
                "unanswered_questions": unanswered,
                "warning_reasons": warning_reasons,
                "video_records": json.loads(r.video_records_json) if r.video_records_json else [],
                "audio_records": json.loads(r.audio_records_json) if r.audio_records_json else [],
                "answer_records": json.loads(r.answer_records_json) if r.answer_records_json else []
            })
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "session": {
                    "id": session.id,
                    "session_name": session.session_title,
                    "start_time": session.start_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "end_time": session.end_time.strftime("%Y-%m-%d %H:%M:%S") if session.end_time else None,
                    "status": session.status,
                    "total_students": session.total_students,
                    "total_questions": session.total_questions
                },
                "student_records": records_list
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
