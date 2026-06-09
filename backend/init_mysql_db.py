"""数据库初始化脚本 - 简化版，只创建数据库表"""
import sys
import os

# 添加backend目录到Python路径
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, backend_path)

from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# 导入MySQL配置
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from mysql_config import (
    MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD,
    MYSQL_DATABASE, MYSQL_CHARSET
)

# 创建Flask应用
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset={MYSQL_CHARSET}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化数据库
db = SQLAlchemy(app)

# 定义模型（只需要表结构）
from datetime import datetime

class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    class_name = db.Column(db.String(50), index=True)
    grade = db.Column(db.String(20), index=True)
    major = db.Column(db.String(50), index=True)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)

class Teacher(db.Model):
    __tablename__ = "teachers"
    id = db.Column(db.String(20), primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)

class VideoRecord(db.Model):
    __tablename__ = "video_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    head_up_count = db.Column(db.Integer, default=0)
    head_down_count = db.Column(db.Integer, default=0)
    head_up_rate = db.Column(db.Float, default=0.0)
    record_time = db.Column(db.DateTime, default=datetime.now, index=True)
    session_id = db.Column(db.String(50), index=True)

class AudioRecord(db.Model):
    __tablename__ = "audio_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    speaker = db.Column(db.String(10), index=True)
    content = db.Column(db.Text)
    is_question = db.Column(db.Boolean, default=False, index=True)
    record_time = db.Column(db.DateTime, default=datetime.now, index=True)
    session_id = db.Column(db.String(50), index=True)
    confidence = db.Column(db.Float, default=0.0)

class Course(db.Model):
    __tablename__ = "courses"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_name = db.Column(db.String(100), nullable=False)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)
    description = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    is_in_session = db.Column(db.Boolean, default=False, index=True)
    session_start_time = db.Column(db.DateTime, index=True)

class Question(db.Model):
    __tablename__ = "questions"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True, nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(20), default='text', index=True)
    options = db.Column(db.Text)
    correct_answer = db.Column(db.Text)
    score = db.Column(db.Integer, default=5)
    publish_time = db.Column(db.DateTime, index=True)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    is_active = db.Column(db.Boolean, default=True, index=True)
    time_limit = db.Column(db.Integer, default=60)
    category = db.Column(db.String(50), index=True)

class Answer(db.Model):
    __tablename__ = "answers"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), index=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    content = db.Column(db.Text)
    is_correct = db.Column(db.Boolean, index=True)
    score = db.Column(db.Integer, default=0, index=True)
    submit_time = db.Column(db.DateTime, default=datetime.now, index=True)
    time_spent = db.Column(db.Integer, default=0)

class CourseStudent(db.Model):
    __tablename__ = "course_students"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    join_time = db.Column(db.DateTime, default=datetime.now, index=True)
    __table_args__ = (db.UniqueConstraint('course_id', 'student_id', name='_course_student_uc'),)

class MultiModalAnalysis(db.Model):
    __tablename__ = "multi_modal_analysis"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    session_id = db.Column(db.String(50), index=True)
    class_id = db.Column(db.String(50), index=True)
    start_time = db.Column(db.DateTime, default=datetime.now, index=True)
    end_time = db.Column(db.DateTime, index=True)
    total_video_frames = db.Column(db.Integer, default=0)
    total_audio_segments = db.Column(db.Integer, default=0)
    total_questions = db.Column(db.Integer, default=0)
    total_answers = db.Column(db.Integer, default=0)
    avg_head_up_rate = db.Column(db.Float, default=0.0)
    participation_score = db.Column(db.Float, default=0.0)
    understanding_score = db.Column(db.Float, default=0.0)
    overall_score = db.Column(db.Float, default=0.0)
    analysis_data = db.Column(db.Text)

class OperationRecord(db.Model):
    __tablename__ = "operation_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)
    operation_type = db.Column(db.String(20), index=True)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='success', index=True)
    extra_data = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(255))
    permission_level = db.Column(db.String(20), default='normal')
    risk_level = db.Column(db.String(20), default='low')
    audit_status = db.Column(db.String(20), default='pending')
    operation_duration = db.Column(db.Float)

class QuestionComment(db.Model):
    __tablename__ = "question_comments"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), index=True, nullable=False)
    author_id = db.Column(db.String(20), nullable=False, index=True)
    author_type = db.Column(db.String(10), nullable=False, default='student')
    author_name = db.Column(db.String(50), nullable=False)
    content = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey("question_comments.id"), index=True, nullable=True)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    update_time = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    is_deleted = db.Column(db.Boolean, default=False, index=True)

class CourseRecord(db.Model):
    __tablename__ = "course_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True, nullable=False)
    record_date = db.Column(db.Date, nullable=False, index=True)
    record_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)

class StudentCourseRecord(db.Model):
    __tablename__ = "student_course_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_record_id = db.Column(db.Integer, db.ForeignKey("course_records.id"), index=True, nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True, nullable=False)
    student_name = db.Column(db.String(50), nullable=False)
    total_head_up_count = db.Column(db.Integer, default=0)
    total_head_down_count = db.Column(db.Integer, default=0)
    avg_head_up_rate = db.Column(db.Float, default=0.0)
    audio_count = db.Column(db.Integer, default=0)
    question_count = db.Column(db.Integer, default=0)
    answered_count = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    total_score = db.Column(db.Integer, default=0)
    video_records_json = db.Column(db.Text)
    audio_records_json = db.Column(db.Text)
    answer_records_json = db.Column(db.Text)
    comment_records_json = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    __table_args__ = (db.UniqueConstraint('course_record_id', 'student_id', name='_course_record_student_uc'),)

class CourseSession(db.Model):
    __tablename__ = "course_sessions"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True, nullable=False)
    session_title = db.Column(db.String(100))
    start_time = db.Column(db.DateTime, default=datetime.now, index=True)
    end_time = db.Column(db.DateTime, index=True)
    status = db.Column(db.String(20), default='active', index=True)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)
    total_questions = db.Column(db.Integer, default=0)
    total_students = db.Column(db.Integer, default=0)
    description = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)

class StudentSessionRecord(db.Model):
    __tablename__ = "student_session_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    session_id = db.Column(db.Integer, db.ForeignKey("course_sessions.id"), index=True, nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True, nullable=False)
    student_name = db.Column(db.String(50), nullable=False)
    total_head_up_count = db.Column(db.Integer, default=0)
    total_head_down_count = db.Column(db.Integer, default=0)
    avg_head_up_rate = db.Column(db.Float, default=0.0)
    audio_count = db.Column(db.Integer, default=0)
    question_count = db.Column(db.Integer, default=0)
    answered_count = db.Column(db.Integer, default=0)
    correct_count = db.Column(db.Integer, default=0)
    total_score = db.Column(db.Integer, default=0)
    unanswered_questions = db.Column(db.Text)
    video_records_json = db.Column(db.Text)
    audio_records_json = db.Column(db.Text)
    answer_records_json = db.Column(db.Text)
    has_warning = db.Column(db.Boolean, default=False, index=True)
    warning_reasons = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    update_time = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    __table_args__ = (db.UniqueConstraint('session_id', 'student_id', name='_session_student_uc'),)

def init_database():
    """初始化数据库"""
    print("正在创建数据库表...")
    try:
        with app.app_context():
            db.create_all()
            print("✅ 数据库表创建成功！")
            return True
    except Exception as e:
        print(f"❌ 数据库操作失败: {e}")
        print("\n请确保：")
        print("1. MySQL服务已启动")
        print("2. mysql_config.py中的配置正确")
        print("3. 数据库 'class' 已创建（您可以使用 CREATE DATABASE class; 来创建）")
        return False

if __name__ == "__main__":
    init_database()
