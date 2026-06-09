"""数据库模型定义"""
from app import db
from datetime import datetime

# 学生表
class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.String(20), primary_key=True)  # 学号
    name = db.Column(db.String(50), nullable=False)  # 姓名
    password = db.Column(db.String(100), nullable=False)  # 密码（加密）
    class_name = db.Column(db.String(50), index=True)  # 班级，添加索引
    grade = db.Column(db.String(20), index=True)  # 年级，添加索引
    major = db.Column(db.String(50), index=True)  # 专业，添加索引
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 添加索引
    
    # 关系
    video_records = db.relationship('VideoRecord', backref='student', lazy='dynamic')
    audio_records = db.relationship('AudioRecord', backref='student', lazy='dynamic')
    answers = db.relationship('Answer', backref='student', lazy='dynamic')

# 教师表
class Teacher(db.Model):
    __tablename__ = "teachers"
    id = db.Column(db.String(20), primary_key=True)  # 教师工号
    name = db.Column(db.String(50), nullable=False)  # 姓名
    password = db.Column(db.String(100), nullable=False)  # 密码（加密）
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 添加索引
    
    # 关系
    questions = db.relationship('Question', backref='teacher', lazy='dynamic')

# 视频识别记录
class VideoRecord(db.Model):
    __tablename__ = "video_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)  # 添加索引
    head_up_count = db.Column(db.Integer, default=0)  # 抬头次数
    head_down_count = db.Column(db.Integer, default=0)  # 低头次数
    head_up_rate = db.Column(db.Float, default=0.0)  # 抬头率
    record_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 添加索引
    session_id = db.Column(db.String(50), index=True)  # 会话ID，用于关联同一课堂的记录

# 语音识别记录
class AudioRecord(db.Model):
    __tablename__ = "audio_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)  # 添加索引
    speaker = db.Column(db.String(10), index=True)  # 说话人（老师/学生），添加索引
    content = db.Column(db.Text)  # 语音内容
    is_question = db.Column(db.Boolean, default=False, index=True)  # 是否为提问，添加索引
    record_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 添加索引
    session_id = db.Column(db.String(50), index=True)  # 会话ID，用于关联同一课堂的记录
    confidence = db.Column(db.Float, default=0.0)  # 识别置信度

# 教师问题表
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
    
    # 关系
    answers = db.relationship('Answer', backref='question', lazy='dynamic')
    course = db.relationship('Course', backref='questions')

# 学生答题表
class Answer(db.Model):
    __tablename__ = "answers"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), index=True)  # 添加索引
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)  # 添加索引
    content = db.Column(db.Text)  # 回答内容
    is_correct = db.Column(db.Boolean, index=True)  # 是否正确，添加索引
    score = db.Column(db.Integer, default=0, index=True)  # 得分，添加索引
    submit_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 添加索引
    time_spent = db.Column(db.Integer, default=0)  # 答题耗时（秒）

# 多模态融合分析表（新增）
class MultiModalAnalysis(db.Model):
    __tablename__ = "multi_modal_analysis"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)  # 添加索引
    session_id = db.Column(db.String(50), index=True)  # 会话ID
    class_id = db.Column(db.String(50), index=True)  # 课程ID
    start_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 开始时间
    end_time = db.Column(db.DateTime, index=True)  # 结束时间
    total_video_frames = db.Column(db.Integer, default=0)  # 总视频帧数
    total_audio_segments = db.Column(db.Integer, default=0)  # 总音频片段数
    total_questions = db.Column(db.Integer, default=0)  # 总提问数
    total_answers = db.Column(db.Integer, default=0)  # 总答题数
    avg_head_up_rate = db.Column(db.Float, default=0.0)  # 平均抬头率
    participation_score = db.Column(db.Float, default=0.0)  # 参与度得分
    understanding_score = db.Column(db.Float, default=0.0)  # 理解度得分
    overall_score = db.Column(db.Float, default=0.0)  # 综合得分
    analysis_data = db.Column(db.Text)  # 详细分析数据（JSON格式）

# 操作记录表
class OperationRecord(db.Model):
    __tablename__ = "operation_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)  # 操作用户
    operation_type = db.Column(db.String(20), index=True)  # 操作类型：add, delete, update, import
    content = db.Column(db.Text, nullable=False)  # 操作内容
    status = db.Column(db.String(20), default='success', index=True)  # 状态：success, withdrawn
    extra_data = db.Column(db.Text)  # 额外数据，如导入的学生ID列表
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)  # 操作时间
    # 操作审计字段
    ip_address = db.Column(db.String(50))  # 操作IP地址
    user_agent = db.Column(db.String(255))  # 用户代理
    permission_level = db.Column(db.String(20), default='normal')  # 权限级别：normal, admin
    risk_level = db.Column(db.String(20), default='low')  # 风险级别：low, medium, high
    audit_status = db.Column(db.String(20), default='pending')  # 审计状态：pending, approved, rejected
    operation_duration = db.Column(db.Float)  # 操作持续时间（秒）

# 课程表
class Course(db.Model):
    __tablename__ = "courses"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_name = db.Column(db.String(100), nullable=False)
    teacher_id = db.Column(db.String(20), db.ForeignKey("teachers.id"), index=True)
    description = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    is_in_session = db.Column(db.Boolean, default=False, index=True)  # 是否正在上课
    session_start_time = db.Column(db.DateTime, index=True)  # 上课开始时间
    
    # 关系
    students = db.relationship('Student', secondary='course_students', backref='courses')
    teacher = db.relationship('Teacher', backref='courses')

# 课程学生关联表
class CourseStudent(db.Model):
    __tablename__ = "course_students"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), index=True)
    join_time = db.Column(db.DateTime, default=datetime.now, index=True)

    # 唯一约束，确保一个学生在一个课程中只存在一条记录
    __table_args__ = (db.UniqueConstraint('course_id', 'student_id', name='_course_student_uc'),)

# 问题讨论区评论表
class QuestionComment(db.Model):
    __tablename__ = "question_comments"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.id"), index=True, nullable=False)
    author_id = db.Column(db.String(20), nullable=False, index=True)  # 学生ID或教师ID
    author_type = db.Column(db.String(10), nullable=False, default='student')  # 'student' 或 'teacher'
    author_name = db.Column(db.String(50), nullable=False)  # 作者姓名
    content = db.Column(db.Text, nullable=False)  # 评论内容
    parent_id = db.Column(db.Integer, db.ForeignKey("question_comments.id"), index=True, nullable=True)  # 父评论ID，为空表示顶级评论
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    update_time = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
    is_deleted = db.Column(db.Boolean, default=False, index=True)  # 软删除标记

    # 关系
    replies = db.relationship('QuestionComment', backref=db.backref('parent', remote_side=[id]),
                              lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_replies=False):
        """转换为字典格式"""
        data = {
            'id': self.id,
            'question_id': self.question_id,
            'author_id': self.author_id,
            'author_type': self.author_type,
            'author_name': self.author_name,
            'content': self.content,
            'parent_id': self.parent_id,
            'create_time': self.create_time.strftime('%Y-%m-%d %H:%M:%S'),
            'update_time': self.update_time.strftime('%Y-%m-%d %H:%M:%S')
        }
        if include_replies:
            data['replies'] = [reply.to_dict() for reply in self.replies if not reply.is_deleted]
        return data

class CourseRecord(db.Model):
    __tablename__ = "course_records"
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    course_id = db.Column(db.Integer, db.ForeignKey("courses.id"), index=True, nullable=False)
    record_date = db.Column(db.Date, nullable=False, index=True)
    record_name = db.Column(db.String(100))
    description = db.Column(db.Text)
    create_time = db.Column(db.DateTime, default=datetime.now, index=True)
    
    course = db.relationship('Course', backref='course_records')
    student_records = db.relationship('StudentCourseRecord', backref='course_record', lazy='dynamic', cascade='all, delete-orphan')

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

    student = db.relationship('Student', backref='course_records')


class CourseSession(db.Model):
    """课堂会话表 - 记录每次上课的会话"""
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
    
    course = db.relationship('Course', backref='sessions')
    teacher = db.relationship('Teacher', backref='sessions')
    student_session_records = db.relationship('StudentSessionRecord', backref='session', lazy='dynamic', cascade='all, delete-orphan')
    
    @property
    def session_name(self):
        return self.session_title


class StudentSessionRecord(db.Model):
    """学生课堂会话记录表 - 记录每个学生在每次会话中的数据"""
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
    
    student = db.relationship('Student', backref='session_records')