"""教师端路由模块初始化"""
from flask import Blueprint
import sys

# 创建教师端蓝图
bp = Blueprint("teacher", __name__, url_prefix="/teacher")
print("教师端蓝图创建成功", file=sys.stderr)

# 导入各个模块的路由
try:
    from app.routes.teacher import auth
    print("导入 auth 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 auth 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import dashboard
    print("导入 dashboard 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 dashboard 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import students
    print("导入 students 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 students 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import questions
    print("导入 questions 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 questions 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import operations
    print("导入 operations 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 operations 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import assistant
    print("导入 assistant 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 assistant 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import courses
    print("导入 courses 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 courses 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import records
    print("导入 records 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 records 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import comments
    print("导入 comments 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 comments 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import test_route
    print("导入 test_route 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 test_route 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import course_records
    print("导入 course_records 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 course_records 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

try:
    from app.routes.teacher import evaluation
    print("导入 evaluation 模块成功", file=sys.stderr)
except Exception as e:
    print(f"导入 evaluation 模块失败: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()

print("教师端路由模块初始化完成", file=sys.stderr)
