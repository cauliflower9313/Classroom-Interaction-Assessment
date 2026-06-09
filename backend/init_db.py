"""数据库初始化脚本 - 创建MySQL数据库和表"""
import sys
import os

# 添加backend目录到Python路径
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, backend_path)

from app import create_app, db
from app.models import (
    Student, Teacher, VideoRecord, AudioRecord, 
    Question, Answer, MultiModalAnalysis, OperationRecord,
    Course, CourseStudent, QuestionComment, CourseRecord,
    StudentCourseRecord, CourseSession, StudentSessionRecord
)

def init_database():
    """初始化数据库"""
    print("正在创建Flask应用...")
    app = create_app()
    
    with app.app_context():
        print("正在创建数据库表...")
        try:
            db.create_all()
            print("✅ 数据库表创建成功！")
            
            # 检查是否有默认数据
            if not Teacher.query.first():
                print("\n提示：没有找到教师账号，您可以在应用中创建或导入数据。")
            if not Student.query.first():
                print("提示：没有找到学生账号，您可以在应用中创建或导入数据。")
                
        except Exception as e:
            print(f"❌ 数据库操作失败: {e}")
            print("\n请确保：")
            print("1. MySQL服务已启动")
            print("2. mysql_config.py中的配置正确")
            print("3. 数据库 'class' 已创建（或者您有创建数据库的权限）")
            return False
    
    return True

if __name__ == "__main__":
    init_database()
