"""教师端学生管理模块"""
from flask import request, jsonify, send_file
from app import db
from app.models import Student, VideoRecord, AudioRecord, Answer, Question, OperationRecord
from app.routes.teacher.auth import teacher_login_required
from app.utils.password_utils import hash_password
from datetime import datetime
import pandas as pd
from io import BytesIO
import json

from app.routes.teacher import bp


MAJOR_CODE_MAP = {
    '3501': '计算机科学与技术',
    '3502': '软件工程',
    '3503': '大数据科学与技术',
    '3515': '人工智能',
}


def parse_student_id(student_id):
    """
    解析学号，提取年级、专业、班级信息
    学号格式：年份(4位) + 专业代码(4位) + 班级(2位) + 个人编号(2位)
    例如：202235010101 -> 年级:2022, 专业:计算机科学与技术, 班级:22计科1班
    """
    try:
        student_id = str(student_id).strip()
        if len(student_id) < 10:
            return None, None, None
        
        year = student_id[:4]
        major_code = student_id[4:8]
        class_num = student_id[8:10]
        
        grade = year
        major = MAJOR_CODE_MAP.get(major_code, '未知专业')
        
        year_suffix = year[2:4]
        class_num_str = str(int(class_num))
        
        if major == '计算机科学与技术':
            class_name = f"{year_suffix}计科{class_num_str}班"
        elif major == '软件工程':
            class_name = f"{year_suffix}软工{class_num_str}班"
        elif major == '大数据科学与技术':
            class_name = f"{year_suffix}大数据{class_num_str}班"
        elif major == '人工智能':
            class_name = f"{year_suffix}智能{class_num_str}班"
        else:
            class_name = f"{major}{class_num_str}班"
        
        return grade, major, class_name
    except Exception:
        return None, None, None


@bp.route("/student/list", methods=["GET"])
@teacher_login_required
def get_student_list(teacher_id):
    """获取学生列表"""
    try:
        # 获取所有学生，按学号排序（学号本身包含年级、专业、班级信息）
        students = Student.query.order_by(Student.id.asc()).all()
        student_list = [{
            "id": s.id,
            "name": s.name,
            "grade": s.grade,
            "major": s.major,
            "class_name": s.class_name or "未分配",
            "create_time": s.create_time.strftime("%Y-%m-%d %H:%M:%S") if s.create_time else ""
        } for s in students]

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": student_list
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/student/search", methods=["GET"])
@teacher_login_required
def search_students(teacher_id):
    """搜索学生"""
    try:
        keyword = request.args.get('keyword', '').strip()
        
        if not keyword:
            return jsonify({"code": 400, "msg": "请输入搜索关键词"}), 400
        
        # 按学号或姓名搜索
        students = Student.query.filter(
            db.or_(
                Student.id.like(f'%{keyword}%'),
                Student.name.like(f'%{keyword}%')
            )
        ).order_by(Student.id.asc()).limit(20).all()
        
        student_list = [{
            "id": s.id,
            "name": s.name,
            "grade": s.grade,
            "major": s.major,
            "class_name": s.class_name or "未分配"
        } for s in students]
        
        return jsonify({
            "code": 200,
            "msg": "搜索成功",
            "data": student_list
        })
        
    except Exception as e:
        return jsonify({"code": 500, "msg": f"搜索失败：{str(e)}"}), 500


@bp.route("/student/export", methods=["GET"])
@teacher_login_required
def export_students(teacher_id):
    """导出学生数据为Excel"""
    try:
        class_name = request.args.get('class_name', '')
        
        query = Student.query
        if class_name:
            query = query.filter(Student.class_name == class_name)
        
        students = query.order_by(Student.create_time.desc()).all()
        
        if not students:
            return jsonify({"code": 400, "msg": "没有学生数据可导出"}), 400
        
        df = pd.DataFrame([{
            '学号': s.id,
            '姓名': s.name,
            '年级': s.grade or '',
            '专业': s.major or '',
            '班级': s.class_name or '',
            '创建时间': s.create_time.strftime('%Y-%m-%d %H:%M:%S') if s.create_time else ''
        } for s in students])
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='学生列表')
        
        output.seek(0)
        
        filename = f"学生数据_{class_name if class_name else '全部'}.xlsx"
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=filename
        )
    
    except Exception as e:
        return jsonify({"code": 500, "msg": f"导出失败：{str(e)}"}), 500


@bp.route("/student/filter", methods=["GET"])
@teacher_login_required
def filter_students(teacher_id):
    """筛选学生（按年级、专业、班级、搜索）"""
    try:
        # 获取筛选参数
        grades = request.args.getlist('grade')
        majors = request.args.getlist('major')
        class_names = request.args.getlist('class_name')
        search = request.args.get('search', '')
        
        # 构建查询
        query = Student.query
        
        if grades:
            query = query.filter(Student.grade.in_(grades))
        if majors:
            query = query.filter(Student.major.in_(majors))
        if class_names:
            query = query.filter(Student.class_name.in_(class_names))
        if search:
            # 按学号或姓名搜索
            query = query.filter((Student.id.like(f'%{search}%')) | (Student.name.like(f'%{search}%')))
        
        # 执行查询，按学号排序（学号本身包含年级、专业、班级信息）
        students = query.order_by(Student.id.asc()).all()
        student_list = [{
            "id": s.id,
            "name": s.name,
            "grade": s.grade,
            "major": s.major,
            "class_name": s.class_name or "未分配",
            "create_time": s.create_time.strftime("%Y-%m-%d %H:%M:%S") if s.create_time else ""
        } for s in students]

        return jsonify({
            "code": 200,
            "msg": "筛选成功",
            "data": student_list
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"筛选失败：{str(e)}"}), 500


@bp.route("/student/template", methods=["GET"])
@teacher_login_required
def download_student_template(teacher_id):
    """下载学生导入模板"""
    try:
        # 创建模板数据
        data = {
            '学号': ['202435010101', '202435020101'],
            '姓名': ['张三', '李四']
        }
        # 模板说明
        notes = [
            '学号格式：2024（年级）+3501（专业）+01（班级）+01（学号）',
            '专业代码：3501=计算机科学与技术, 3502=软件工程, 3503=数据科学与大数据技术, 3515=人工智能'
        ]
        
        # 创建DataFrame
        df = pd.DataFrame(data)
        
        # 创建Excel文件
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='学生数据')
            # 添加说明工作表
            workbook = writer.book
            sheet = workbook.create_sheet('说明')
            sheet['A1'] = '模板使用说明'
            sheet['A2'] = '1. 只需要填写学号和姓名两个字段'
            sheet['A3'] = '2. 学号格式：2024（年级）+3501（专业）+01（班级）+01（学号）'
            sheet['A4'] = '3. 专业代码：'
            sheet['A5'] = '   3501 = 计算机科学与技术'
            sheet['A6'] = '   3502 = 软件工程'
            sheet['A7'] = '   3503 = 数据科学与大数据技术'
            sheet['A8'] = '   3515 = 人工智能'
            sheet['A9'] = '4. 系统会自动从学号中提取年级、专业和班级信息'
            # 调整列宽
            sheet.column_dimensions['A'].width = 50
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name='学生导入模板.xlsx'
        )

    except Exception as e:
        return jsonify({"code": 500, "msg": f"下载模板失败：{str(e)}"}), 500


@bp.route("/student/preview", methods=["POST"])
@teacher_login_required
def preview_students(teacher_id):
    """预览导入学生数据"""
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({"code": 400, "msg": "请选择要导入的文件"}), 400
        
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            return jsonify({"code": 400, "msg": "只支持Excel和CSV文件"}), 400
        
        required_columns = ['学号', '姓名']
        for col in required_columns:
            if col not in df.columns:
                return jsonify({"code": 400, "msg": f"文件缺少必要字段：{col}"}), 400
        
        students_data = []
        for index, row in df.iterrows():
            student_id = str(row['学号']).strip()
            name = str(row['姓名']).strip()
            
            grade = ''
            major = ''
            class_name = ''
            
            if len(student_id) >= 10:
                grade = student_id[:4]
                major_code = student_id[4:8]
                major_map = {
                    '3501': '计算机科学与技术',
                    '3502': '软件工程',
                    '3503': '大数据科学与技术',
                    '3515': '人工智能'
                }
                major = major_map.get(major_code, '未知专业')
                
                class_code = student_id[8:10]
                class_num = str(int(class_code))
                year_suffix = student_id[2:4]
                
                if major == '计算机科学与技术':
                    class_name = year_suffix + '计科' + class_num + '班'
                elif major == '软件工程':
                    class_name = year_suffix + '软工' + class_num + '班'
                elif major == '人工智能':
                    class_name = year_suffix + '智能' + class_num + '班'
                elif major == '大数据科学与技术':
                    class_name = year_suffix + '大数据' + class_num + '班'
                else:
                    class_name = '未知班级'
            
            existing_student = Student.query.get(student_id)
            is_duplicate = existing_student is not None
            
            students_data.append({
                'id': student_id,
                'name': name,
                'grade': grade,
                'major': major,
                'class_name': class_name,
                'is_duplicate': is_duplicate
            })
        
        new_count = sum(1 for s in students_data if not s['is_duplicate'])
        duplicate_count = sum(1 for s in students_data if s['is_duplicate'])
        
        return jsonify({
            "code": 200,
            "msg": "预览成功",
            "data": {
                "students": students_data,
                "total": len(students_data),
                "new_count": new_count,
                "duplicate_count": duplicate_count
            }
        })
        
    except Exception as e:
        return jsonify({"code": 500, "msg": f"预览失败：{str(e)}"}), 500


@bp.route("/student/import", methods=["POST"])
@teacher_login_required
def import_students(teacher_id):
    """导入学生（支持Excel、CSV和JSON数据）"""
    try:
        students_data = []
        
        # 检查是否是JSON格式的请求
        if request.is_json:
            data = request.get_json()
            students_data = data.get('students_data', [])
        elif request.form.get('students_data'):
            # 表单中的JSON数据
            students_json = request.form.get('students_data')
            students_data = json.loads(students_json)
        else:
            # 从文件导入
            file = request.files.get('file')
            if not file:
                return jsonify({"code": 400, "msg": "请选择要导入的文件"}), 400
            
            if file.filename.endswith('.xlsx'):
                df = pd.read_excel(file)
            elif file.filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                return jsonify({"code": 400, "msg": "只支持Excel和CSV文件"}), 400
            
            required_columns = ['学号', '姓名']
            for col in required_columns:
                if col not in df.columns:
                    return jsonify({"code": 400, "msg": f"文件缺少必要字段：{col}"}), 400
            
            for index, row in df.iterrows():
                student_id = str(row['学号']).strip()
                name = str(row['姓名']).strip()
                
                grade = ''
                major = ''
                class_name = ''
                
                if len(student_id) >= 10:
                    grade = student_id[:4]
                    major_code = student_id[4:8]
                    major_map = {
                        '3501': '计算机科学与技术',
                        '3502': '软件工程',
                        '3503': '大数据科学与技术',
                        '3515': '人工智能'
                    }
                    major = major_map.get(major_code, '未知专业')
                    
                    class_code = student_id[8:10]
                    class_num = str(int(class_code))
                    year_suffix = student_id[2:4]
                    
                    if major == '计算机科学与技术':
                        class_name = year_suffix + '计科' + class_num + '班'
                    elif major == '软件工程':
                        class_name = year_suffix + '软工' + class_num + '班'
                    elif major == '人工智能':
                        class_name = year_suffix + '智能' + class_num + '班'
                    elif major == '大数据科学与技术':
                        class_name = year_suffix + '大数据' + class_num + '班'
                    else:
                        class_name = '未知班级'
                
                existing_student = Student.query.get(student_id)
                if not existing_student:
                    students_data.append({
                        'id': student_id,
                        'name': name,
                        'grade': grade,
                        'major': major,
                        'class_name': class_name
                    })
        
        # 导入学生数据
        imported_students = []
        success_count = 0
        
        for student_data in students_data:
            student_id = student_data.get('id')
            if Student.query.get(student_id):
                continue
            
            hashed_password = hash_password('123456')
            student = Student(
                id=student_id,
                name=student_data.get('name'),
                password=hashed_password,
                grade=student_data.get('grade', ''),
                major=student_data.get('major', ''),
                class_name=student_data.get('class_name', ''),
                create_time=datetime.now()
            )
            db.session.add(student)
            imported_students.append({
                "id": student_id,
                "name": student_data.get('name'),
                "grade": student_data.get('grade', ''),
                "major": student_data.get('major', ''),
                "class_name": student_data.get('class_name', '')
            })
            success_count += 1
        
        if imported_students:
            operation_content = f"批量导入学生：共 {len(imported_students)} 人"
            operation_extra = {"students": imported_students}
            
            operation_record = OperationRecord(
                teacher_id=teacher_id,
                operation_type="import",
                content=operation_content,
                status='success',
                extra_data=json.dumps(operation_extra)
            )
            db.session.add(operation_record)
            db.session.commit()
            
            return jsonify({
                "code": 200,
                "msg": "导入成功",
                "data": {
                    "success_count": success_count,
                    "students": imported_students,
                    "operation_id": operation_record.id
                }
            })
        else:
            db.session.commit()
            return jsonify({
                "code": 200,
                "msg": "没有新学生需要导入",
                "data": {"success_count": 0, "students": [], "operation_id": None}
            })

    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"导入失败：{str(e)}"}), 500


@bp.route("/student/update", methods=["POST"])
@teacher_login_required
def update_student(teacher_id):
    """更新学生信息"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        student_id = data.get("student_id")
        name = data.get("name")
        grade = data.get("grade")
        major = data.get("major")
        class_name = data.get("class_name")
        
        if not student_id or not name:
            return jsonify({"code": 400, "msg": "学号和姓名不能为空"}), 400
        
        # 查找学生
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"code": 404, "msg": "学生不存在"}), 404
        
        # 保存旧信息，用于操作记录
        old_info = {
            "name": student.name,
            "grade": student.grade,
            "major": student.major,
            "class_name": student.class_name
        }
        
        # 更新学生信息
        student.name = name
        student.grade = grade
        student.major = major
        student.class_name = class_name
        
        # 创建操作记录
        operation_content = f"修改学生：{student_id} - {name}"
        operation_extra = {
            "student_id": student_id,
            "old_info": old_info,
            "new_info": {
                "name": name,
                "grade": grade,
                "major": major,
                "class_name": class_name
            }
        }
        
        operation_record = OperationRecord(
            teacher_id=teacher_id,
            operation_type="update",
            content=operation_content,
            status='success',
            extra_data=json.dumps(operation_extra)
        )
        db.session.add(operation_record)
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "更新成功",
            "data": {
                "operation_id": operation_record.id
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"更新失败：{str(e)}"}), 500


@bp.route("/student/delete", methods=["POST"])
@teacher_login_required
def delete_student(teacher_id):
    """删除学生"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        student_id = data.get("student_id")
        
        if not student_id:
            return jsonify({"code": 400, "msg": "学号不能为空"}), 400
        
        # 查找学生
        student = Student.query.get(student_id)
        if not student:
            return jsonify({"code": 404, "msg": "学生不存在"}), 404
        
        # 保存学生信息，用于操作记录和撤回
        student_info = {
            "id": student.id,
            "name": student.name,
            "grade": student.grade,
            "major": student.major,
            "class_name": student.class_name,
            "password": student.password
        }
        
        # 创建操作记录
        operation_content = f"删除学生：{student_id} - {student.name}"
        
        operation_record = OperationRecord(
            teacher_id=teacher_id,
            operation_type="delete",
            content=operation_content,
            status='success',
            extra_data=json.dumps(student_info)
        )
        db.session.add(operation_record)
        
        # 删除学生
        db.session.delete(student)
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "删除成功",
            "data": {
                "operation_id": operation_record.id
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"删除失败：{str(e)}"}), 500


@bp.route("/student/batch-delete", methods=["POST"])
@teacher_login_required
def batch_delete_students(teacher_id):
    """批量删除学生"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        student_ids = data.get("student_ids", [])
        
        if not student_ids or len(student_ids) == 0:
            return jsonify({"code": 400, "msg": "学生ID列表不能为空"}), 400
        
        deleted_students = []
        success_count = 0
        
        for student_id in student_ids:
            student = Student.query.get(student_id)
            if student:
                # 保存学生信息
                student_info = {
                    "id": student.id,
                    "name": student.name,
                    "grade": student.grade,
                    "major": student.major,
                    "class_name": student.class_name,
                    "password": student.password
                }
                deleted_students.append(student_info)
                
                # 删除相关记录
                VideoRecord.query.filter_by(student_id=student_id).delete()
                AudioRecord.query.filter_by(student_id=student_id).delete()
                Answer.query.filter_by(student_id=student_id).delete()
                from app.models import CourseStudent
                CourseStudent.query.filter_by(student_id=student_id).delete()
                
                db.session.delete(student)
                success_count += 1
        
        # 创建一条批量删除的操作记录
        operation_content = f"批量删除学生：共删除 {success_count} 名学生"
        operation_record = OperationRecord(
            teacher_id=teacher_id,
            operation_type="batch_delete",
            content=operation_content,
            status='success',
            extra_data=json.dumps({"students": deleted_students, "count": success_count})
        )
        db.session.add(operation_record)
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": f"成功删除 {success_count} 名学生",
            "data": {
                "success_count": success_count,
                "operation_id": operation_record.id
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"批量删除失败：{str(e)}"}), 500


@bp.route("/student/classes", methods=["GET"])
@teacher_login_required
def get_student_classes(teacher_id):
    """获取所有班级列表"""
    try:
        # 查询所有学生的班级名称，去重
        classes = db.session.query(Student.class_name).distinct().all()
        # 提取班级名称并去除空值
        class_list = [cls[0] for cls in classes if cls[0]]
        # 按班级名称排序
        class_list.sort()
        return jsonify({"code": 200, "msg": "获取班级列表成功", "data": class_list})
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取班级列表失败：{str(e)}"}), 500


@bp.route("/student/filter-options", methods=["GET"])
@teacher_login_required
def get_student_filter_options(teacher_id):
    """获取学生筛选选项（年级、专业、班级）- 只返回数据库中存在的值"""
    try:
        # 查询所有不重复的年级
        grades = db.session.query(Student.grade).filter(
            Student.grade.isnot(None),
            Student.grade != ''
        ).distinct().all()
        grade_list = sorted([g[0] for g in grades])
        
        # 查询所有不重复的专业
        majors = db.session.query(Student.major).filter(
            Student.major.isnot(None),
            Student.major != ''
        ).distinct().all()
        major_list = sorted([m[0] for m in majors])
        
        # 查询所有不重复的班级
        classes = db.session.query(Student.class_name).filter(
            Student.class_name.isnot(None),
            Student.class_name != ''
        ).distinct().all()
        class_list = sorted([c[0] for c in classes])
        
        return jsonify({
            "code": 200,
            "msg": "获取筛选选项成功",
            "data": {
                "grades": grade_list,
                "majors": major_list,
                "classes": class_list
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取筛选选项失败：{str(e)}"}), 500


@bp.route("/student/statistics", methods=["GET"])
@teacher_login_required
def get_student_statistics(teacher_id):
    """获取学生数据统计"""
    try:
        # 总学生数
        total_students = Student.query.count()
        
        # 年级数量
        grades = set()
        students = Student.query.all()
        for student in students:
            if student.grade:
                grades.add(student.grade)
        grade_count = len(grades)
        
        # 专业数量
        majors = set()
        for student in students:
            if student.major:
                majors.add(student.major)
        major_count = len(majors)
        
        # 班级数量
        classes = set()
        for student in students:
            if student.class_name:
                classes.add(student.class_name)
        class_count = len(classes)
        
        # 年级分布
        grade_distribution = []
        for grade in grades:
            count = Student.query.filter_by(grade=grade).count()
            grade_distribution.append({"grade": grade, "count": count})
        
        # 专业分布
        major_distribution = []
        for major in majors:
            count = Student.query.filter_by(major=major).count()
            major_distribution.append({"major": major, "count": count})
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_students": total_students,
                "grade_count": grade_count,
                "major_count": major_count,
                "class_count": class_count,
                "grade_distribution": grade_distribution,
                "major_distribution": major_distribution
            }
        })
    
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/student/add", methods=["POST"])
@teacher_login_required
def add_student(teacher_id):
    """单独添加学生"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        student_id = data.get("student_id")
        name = data.get("name")
        grade = data.get("grade")
        major = data.get("major")
        class_name = data.get("class_name")
        
        if not student_id or not name:
            return jsonify({"code": 400, "msg": "学号和姓名不能为空"}), 400
        
        # 检查学生是否已存在
        existing_student = Student.query.get(student_id)
        if existing_student:
            return jsonify({"code": 400, "msg": "学生已存在"}), 400
        
        # 如果只填写了学号和姓名，自动分析学号分配专业班级等信息
        auto_filled = False
        if not grade and not major and not class_name:
            parsed_grade, parsed_major, parsed_class = parse_student_id(student_id)
            if parsed_grade and parsed_major and parsed_class:
                grade = parsed_grade
                major = parsed_major
                class_name = parsed_class
                auto_filled = True
        
        # 创建新学生（默认密码123456）
        hashed_password = hash_password('123456')
        student = Student(
            id=student_id,
            name=name,
            password=hashed_password,
            grade=grade,
            major=major,
            class_name=class_name,
            create_time=datetime.now()
        )
        
        # 创建操作记录
        operation_content = f"添加学生：{student_id} - {name}"
        student_info = {
            "id": student_id,
            "name": name,
            "grade": grade,
            "major": major,
            "class_name": class_name,
            "password": hashed_password
        }
        
        operation_record = OperationRecord(
            teacher_id=teacher_id,
            operation_type="add",
            content=operation_content,
            status='success',
            extra_data=json.dumps(student_info)
        )
        db.session.add(operation_record)
        db.session.add(student)
        db.session.commit()
        
        response_data = {
            "id": student_id,
            "name": name,
            "grade": grade,
            "major": major,
            "class_name": class_name
        }
        if auto_filled:
            response_data["auto_filled"] = True
            response_data["msg"] = f"已根据学号自动填充：{grade}、{major}、{class_name}"
        
        return jsonify({
            "code": 200,
            "msg": "添加成功",
            "data": response_data
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"添加失败：{str(e)}"}), 500


@bp.route("/student/records/<student_id>", methods=["GET"])
@teacher_login_required
def get_student_records(teacher_id, student_id):
    """获取学生详细记录"""
    try:
        # 视频记录
        video_records = VideoRecord.query.filter_by(student_id=student_id).all()
        video_list = [{
            "head_up_count": v.head_up_count,
            "head_down_count": v.head_down_count,
            "head_up_rate": round(v.head_up_rate * 100, 2),
            "record_time": v.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for v in video_records]

        # 语音记录
        audio_records = AudioRecord.query.filter_by(student_id=student_id).all()
        audio_list = [{
            "content": a.content,
            "is_question": a.is_question,
            "record_time": a.record_time.strftime("%Y-%m-%d %H:%M:%S")
        } for a in audio_records]

        # 答题记录
        answer_records = Answer.query.filter_by(student_id=student_id).all()
        answer_list = []
        for ans in answer_records:
            question = Question.query.get(ans.question_id)
            answer_list.append({
                "question_id": ans.question_id,
                "question_title": question.title if question else "未知问题",
                "answer_content": ans.content,
                "submit_time": ans.submit_time.strftime("%Y-%m-%d %H:%M:%S")
            })

        # 统计信息
        total_video = len(video_list)
        avg_rate = sum(v["head_up_rate"] for v in video_list) / total_video if total_video else 0
        total_questions = sum(1 for a in audio_list if a["is_question"])

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "summary": {
                    "total_video_records": total_video,
                    "avg_head_up_rate": round(avg_rate, 2),
                    "total_questions": total_questions
                },
                "video_records": video_list,
                "audio_records": audio_list,
                "answer_records": answer_list
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500
