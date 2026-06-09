"""教师端操作记录管理模块"""
from flask import request, jsonify
from app import db
from app.models import OperationRecord, Student, VideoRecord, AudioRecord, MultiModalAnalysis, Answer, CourseStudent
from app.routes.teacher.auth import teacher_login_required
from datetime import datetime
import json

from app.routes.teacher import bp


@bp.route("/operation/records", methods=["GET"])
@teacher_login_required
def get_operation_records(teacher_id):
    """获取操作记录列表"""
    try:
        # 获取操作记录
        records = OperationRecord.query.filter_by(teacher_id=teacher_id).order_by(OperationRecord.create_time.desc()).all()
        
        record_list = []
        for record in records:
            record_list.append({
                "id": record.id,
                "time": record.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                "type": record.operation_type,
                "content": record.content,
                "status": record.status,
                "extraData": record.extra_data,
                "ipAddress": record.ip_address,
                "userAgent": record.user_agent,
                "permissionLevel": record.permission_level,
                "riskLevel": record.risk_level,
                "auditStatus": record.audit_status,
                "operationDuration": record.operation_duration
            })

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": record_list
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/operation/add", methods=["POST"])
@teacher_login_required
def add_operation_record(teacher_id):
    """添加操作记录"""
    try:
        import time
        start_time = time.time()
        
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        operation_type = data.get("type")
        content = data.get("content")
        extra_data = data.get("extraData")
        
        if not operation_type or not content:
            return jsonify({"code": 400, "msg": "操作类型和内容不能为空"}), 400
        
        # 计算操作持续时间
        operation_duration = time.time() - start_time
        
        # 风险评估
        risk_level = 'low'
        if operation_type in ['delete', 'import']:
            risk_level = 'medium'
        
        # 权限级别
        permission_level = 'normal'
        
        # 创建操作记录
        record = OperationRecord(
            teacher_id=teacher_id,
            operation_type=operation_type,
            content=content,
            status='success',
            extra_data=extra_data,
            ip_address=request.remote_addr,
            user_agent=request.user_agent.string,
            permission_level=permission_level,
            risk_level=risk_level,
            audit_status='approved',  # 默认为已批准
            operation_duration=operation_duration
        )
        
        db.session.add(record)
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "添加成功",
            "data": {
                "id": record.id
            }
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"添加失败：{str(e)}"}), 500


@bp.route("/operation/update", methods=["POST"])
@teacher_login_required
def update_operation_record(teacher_id):
    """更新操作记录状态"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        operation_id = data.get("id")
        status = data.get("status")
        
        if not operation_id or not status:
            return jsonify({"code": 400, "msg": "操作ID和状态不能为空"}), 400
        
        # 查找操作记录
        record = OperationRecord.query.get(operation_id)
        if not record:
            return jsonify({"code": 404, "msg": "操作记录不存在"}), 404
        
        if record.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此记录"}), 403
        
        # 更新状态
        record.status = status
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "更新成功"
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"更新失败：{str(e)}"}), 500


@bp.route("/operation/withdraw", methods=["POST"])
@teacher_login_required
def withdraw_operation(teacher_id):
    """撤回操作"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        operation_id = data.get("operation_id")
        
        if not operation_id:
            print(f"操作ID为空: {operation_id}")
            return jsonify({"code": 400, "msg": "操作ID不能为空"}), 400
        
        # 查找操作记录
        record = OperationRecord.query.get(operation_id)
        print(f"查找操作记录: ID={operation_id}, 记录={record}")
        if not record:
            print(f"操作记录不存在: ID={operation_id}")
            return jsonify({"code": 404, "msg": "操作记录不存在"}), 404
        
        print(f"记录教师ID: {record.teacher_id}, 当前教师ID: {teacher_id}")
        if record.teacher_id != teacher_id:
            print(f"无权操作此记录")
            return jsonify({"code": 403, "msg": "无权操作此记录"}), 403
        
        print(f"记录状态: {record.status}")
        if record.status == 'withdrawn':
            print(f"该操作已被撤回")
            return jsonify({"code": 400, "msg": "该操作已被撤回"}), 400
        
        try:
            extra_data = json.loads(record.extra_data) if record.extra_data else {}
            print(f"操作类型: {record.operation_type}")
            print(f"extra_data原始内容: {record.extra_data}")
            print(f"extra_data解析后: {extra_data}")
        except Exception as json_error:
            print(f"JSON解析错误: {str(json_error)}")
            print(f"extra_data原始内容: {record.extra_data}")
            extra_data = {}
        
        # 如果extra_data是字符串，可能需要再次解析（双重编码问题）
        if isinstance(extra_data, str):
            try:
                extra_data = json.loads(extra_data)
                print(f"extra_data二次解析后: {extra_data}")
            except Exception as e:
                print(f"二次解析失败: {str(e)}")
                pass
        
        # 根据操作类型执行撤回操作
        if record.operation_type == 'delete':
            # 撤回删除操作：重新创建学生
            student_info = extra_data
            # 检查学生是否已存在
            existing_student = Student.query.get(student_info.get('id'))
            if existing_student:
                return jsonify({"code": 400, "msg": "学生已存在，无法撤回删除操作"}), 400
            
            # 创建新学生
            new_student = Student(
                id=student_info.get('id'),
                name=student_info.get('name'),
                password=student_info.get('password'),
                grade=student_info.get('grade'),
                major=student_info.get('major'),
                class_name=student_info.get('class_name'),
                create_time=datetime.now()
            )
            db.session.add(new_student)
            
        elif record.operation_type == 'update':
            # 撤回修改操作：恢复旧信息
            student_id = extra_data.get('student_id')
            old_info = extra_data.get('old_info', {})
            
            # 查找学生
            student = Student.query.get(student_id)
            if not student:
                return jsonify({"code": 404, "msg": "学生不存在，无法撤回修改操作"}), 404
            
            # 恢复旧信息
            student.name = old_info.get('name', student.name)
            student.grade = old_info.get('grade', student.grade)
            student.major = old_info.get('major', student.major)
            student.class_name = old_info.get('class_name', student.class_name)
        
        elif record.operation_type == 'add':
            # 撤回添加操作：删除学生
            student_info = extra_data
            student_id = student_info.get('id')
            
            # 查找学生
            student = Student.query.get(student_id)
            if not student:
                return jsonify({"code": 404, "msg": "学生不存在，无法撤回添加操作"}), 404
            
            # 先删除相关的记录（外键约束）
            VideoRecord.query.filter_by(student_id=student_id).delete()
            AudioRecord.query.filter_by(student_id=student_id).delete()
            MultiModalAnalysis.query.filter_by(student_id=student_id).delete()
            Answer.query.filter_by(student_id=student_id).delete()
            CourseStudent.query.filter_by(student_id=student_id).delete()
            
            # 删除学生
            db.session.delete(student)
        
        elif record.operation_type == 'import':
            # 撤回导入操作：删除所有导入的学生
            imported_students = extra_data.get('students', [])
            
            # 处理不同格式的extraData
            if not imported_students:
                # 如果是字符串格式的学生ID列表（如 "202235150311,202535010106"）
                if isinstance(record.extra_data, str) and ',' in record.extra_data:
                    student_ids = record.extra_data.split(',')
                    imported_students = []
                    for id in student_ids:
                        imported_students.append({'id': id.strip()})
                else:
                    # 处理其他可能的格式
                    print(f"无法解析导入的学生信息: {record.extra_data}")
                    return jsonify({"code": 400, "msg": "没有导入的学生信息，无法撤回导入操作"}), 400
            
            # 逐个删除导入的学生
            for student_info in imported_students:
                student_id = student_info.get('id')
                if not student_id:
                    continue
                student = Student.query.get(student_id)
                if student:
                    # 先删除相关的记录（外键约束）
                    VideoRecord.query.filter_by(student_id=student_id).delete()
                    AudioRecord.query.filter_by(student_id=student_id).delete()
                    MultiModalAnalysis.query.filter_by(student_id=student_id).delete()
                    Answer.query.filter_by(student_id=student_id).delete()
                    CourseStudent.query.filter_by(student_id=student_id).delete()
                    # 再删除学生
                    db.session.delete(student)
        
        elif record.operation_type == 'batch_delete':
            # 撤回批量删除操作：重新创建所有被删除的学生
            deleted_students = extra_data.get('students', [])
            
            for student_info in deleted_students:
                student_id = student_info.get('id')
                if not student_id:
                    continue
                
                # 检查学生是否已存在
                existing_student = Student.query.get(student_id)
                if existing_student:
                    continue
                
                # 创建新学生
                new_student = Student(
                    id=student_id,
                    name=student_info.get('name'),
                    password=student_info.get('password'),
                    grade=student_info.get('grade'),
                    major=student_info.get('major'),
                    class_name=student_info.get('class_name'),
                    create_time=datetime.now()
                )
                db.session.add(new_student)
        
        # 更新操作记录状态
        record.status = 'withdrawn'
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "撤回成功"
        })
    
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"撤回操作失败: {str(e)}")
        print(f"错误堆栈: {traceback.format_exc()}")
        return jsonify({"code": 500, "msg": f"撤回失败：{str(e)}"}), 500


@bp.route("/operation/records/search", methods=["GET"])
@teacher_login_required
def search_operation_records(teacher_id):
    """搜索操作记录"""
    try:
        # 获取搜索参数
        keyword = request.args.get('keyword', '')
        operation_type = request.args.get('type', '')
        status = request.args.get('status', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # 构建查询
        query = OperationRecord.query.filter_by(teacher_id=teacher_id)
        
        # 关键词搜索
        if keyword:
            query = query.filter(OperationRecord.content.contains(keyword))
        
        # 操作类型筛选
        if operation_type:
            query = query.filter(OperationRecord.operation_type == operation_type)
        
        # 状态筛选
        if status:
            query = query.filter(OperationRecord.status == status)
        
        # 时间范围筛选
        if start_date:
            query = query.filter(OperationRecord.create_time >= datetime.strptime(start_date, '%Y-%m-%d'))
        if end_date:
            # 结束日期包含当天的23:59:59
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
            end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
            query = query.filter(OperationRecord.create_time <= end_datetime)
        
        # 按时间倒序排序
        records = query.order_by(OperationRecord.create_time.desc()).all()
        
        record_list = []
        for record in records:
            record_list.append({
                "id": record.id,
                "time": record.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                "type": record.operation_type,
                "content": record.content,
                "status": record.status,
                "extraData": record.extra_data,
                "ipAddress": record.ip_address,
                "userAgent": record.user_agent,
                "permissionLevel": record.permission_level,
                "riskLevel": record.risk_level,
                "auditStatus": record.audit_status,
                "operationDuration": record.operation_duration
            })
        
        return jsonify({
            "code": 200,
            "msg": "搜索成功",
            "data": record_list
        })
    
    except Exception as e:
        return jsonify({"code": 500, "msg": f"搜索失败：{str(e)}"}), 500


@bp.route("/operation/records/export", methods=["GET"])
@teacher_login_required
def export_operation_records(teacher_id):
    """导出操作记录"""
    try:
        import pandas as pd
        from io import BytesIO
        import base64
        
        # 获取导出参数
        export_type = request.args.get('type', 'excel')  # excel 或 pdf
        
        # 获取操作记录
        records = OperationRecord.query.filter_by(teacher_id=teacher_id).order_by(OperationRecord.create_time.desc()).all()
        
        # 准备数据
        data = []
        for record in records:
            data.append({
                "操作ID": record.id,
                "操作时间": record.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                "操作类型": record.operation_type,
                "操作内容": record.content,
                "状态": record.status,
                "额外数据": record.extra_data or ""
            })
        
        if export_type == 'excel':
            # 导出为Excel
            df = pd.DataFrame(data)
            output = BytesIO()
            # 使用默认引擎，避免依赖xlsxwriter
            df.to_excel(output, index=False, sheet_name='操作记录')
            output.seek(0)
            
            # 将Excel文件转换为base64
            excel_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
            
            return jsonify({
                "code": 200,
                "msg": "导出成功",
                "data": {
                    "type": "excel",
                    "content": excel_base64,
                    "filename": f"操作记录_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                }
            })
        else:
            # 导出为PDF
            try:
                from fpdf import FPDF
                
                pdf = FPDF()
                pdf.add_page()
                pdf.set_font("Arial", size=12)
                
                # 添加标题
                pdf.cell(200, 10, txt="操作记录导出", ln=1, align="C")
                pdf.ln(10)
                
                # 添加表头
                pdf.set_font("Arial", 'B', 10)
                pdf.cell(30, 10, "操作ID", border=1)
                pdf.cell(40, 10, "操作时间", border=1)
                pdf.cell(30, 10, "操作类型", border=1)
                pdf.cell(60, 10, "操作内容", border=1)
                pdf.cell(20, 10, "状态", border=1)
                pdf.ln()
                
                # 添加数据
                pdf.set_font("Arial", size=10)
                for row in data:
                    pdf.cell(30, 10, str(row["操作ID"]), border=1)
                    pdf.cell(40, 10, row["操作时间"], border=1)
                    pdf.cell(30, 10, row["操作类型"], border=1)
                    # 处理长文本
                    content = row["操作内容"]
                    if len(content) > 20:
                        content = content[:17] + "..."
                    pdf.cell(60, 10, content, border=1)
                    pdf.cell(20, 10, row["状态"], border=1)
                    pdf.ln()
                
                # 生成PDF文件
                output = BytesIO()
                pdf.output(output)
                output.seek(0)
                
                # 将PDF文件转换为base64
                pdf_base64 = base64.b64encode(output.getvalue()).decode('utf-8')
                
                return jsonify({
                    "code": 200,
                    "msg": "导出成功",
                    "data": {
                        "type": "pdf",
                        "content": pdf_base64,
                        "filename": f"操作记录_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
                    }
                })
            except ImportError:
                return jsonify({
                    "code": 500,
                    "msg": "PDF导出功能需要fpdf模块，请安装该模块后重试",
                    "data": {}
                })
    
    except Exception as e:
        return jsonify({"code": 500, "msg": f"导出失败：{str(e)}"}), 500


@bp.route("/operation/records/batch", methods=["POST"])
@teacher_login_required
def batch_operation_records(teacher_id):
    """批量操作记录"""
    try:
        if not request.is_json:
            return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400
        
        data = request.get_json()
        operation_ids = data.get("operation_ids", [])
        action = data.get("action")  # 支持的操作：withdraw, delete
        
        if not operation_ids or not action:
            return jsonify({"code": 400, "msg": "操作ID和操作类型不能为空"}), 400
        
        success_count = 0
        error_count = 0
        
        for operation_id in operation_ids:
            try:
                record = OperationRecord.query.get(operation_id)
                if not record:
                    error_count += 1
                    continue
                
                if record.teacher_id != teacher_id:
                    error_count += 1
                    continue
                
                if action == 'withdraw':
                    # 执行撤回操作
                    if record.status == 'withdrawn':
                        error_count += 1
                        continue
                    
                    extra_data = json.loads(record.extra_data) if record.extra_data else {}
                    
                    # 根据操作类型执行撤回操作
                    if record.operation_type == 'delete':
                        # 撤回删除操作：重新创建学生
                        student_info = extra_data
                        existing_student = Student.query.get(student_info.get('id'))
                        if existing_student:
                            error_count += 1
                            continue
                        
                        new_student = Student(
                            id=student_info.get('id'),
                            name=student_info.get('name'),
                            password=student_info.get('password'),
                            grade=student_info.get('grade'),
                            major=student_info.get('major'),
                            class_name=student_info.get('class_name'),
                            create_time=datetime.now()
                        )
                        db.session.add(new_student)
                    
                    elif record.operation_type == 'update':
                        # 撤回修改操作：恢复旧信息
                        student_id = extra_data.get('student_id')
                        old_info = extra_data.get('old_info', {})
                        student = Student.query.get(student_id)
                        if not student:
                            error_count += 1
                            continue
                        
                        student.name = old_info.get('name', student.name)
                        student.grade = old_info.get('grade', student.grade)
                        student.major = old_info.get('major', student.major)
                        student.class_name = old_info.get('class_name', student.class_name)
                    
                    elif record.operation_type == 'add':
                        # 撤回添加操作：删除学生
                        student_info = extra_data
                        student_id = student_info.get('id')
                        student = Student.query.get(student_id)
                        if not student:
                            error_count += 1
                            continue
                        # 先删除相关的记录（外键约束）
                        VideoRecord.query.filter_by(student_id=student_id).delete()
                        AudioRecord.query.filter_by(student_id=student_id).delete()
                        MultiModalAnalysis.query.filter_by(student_id=student_id).delete()
                        Answer.query.filter_by(student_id=student_id).delete()
                        CourseStudent.query.filter_by(student_id=student_id).delete()
                        db.session.delete(student)
                    
                    elif record.operation_type == 'import':
                        # 撤回导入操作：删除所有导入的学生
                        imported_students = extra_data.get('students', [])
                        if not imported_students:
                            error_count += 1
                            continue
                        
                        for student_info in imported_students:
                            student_id = student_info.get('id')
                            student = Student.query.get(student_id)
                            if student:
                                # 先删除相关的记录（外键约束）
                                VideoRecord.query.filter_by(student_id=student_id).delete()
                                AudioRecord.query.filter_by(student_id=student_id).delete()
                                MultiModalAnalysis.query.filter_by(student_id=student_id).delete()
                                Answer.query.filter_by(student_id=student_id).delete()
                                CourseStudent.query.filter_by(student_id=student_id).delete()
                                db.session.delete(student)
                    
                    # 更新操作记录状态
                    record.status = 'withdrawn'
                    success_count += 1
                
            except Exception:
                error_count += 1
        
        db.session.commit()
        
        return jsonify({
            "code": 200,
            "msg": "批量操作完成",
            "data": {
                "success_count": success_count,
                "error_count": error_count
            }
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"批量操作失败：{str(e)}"}), 500


@bp.route("/operation/analysis", methods=["GET"])
@teacher_login_required
def analyze_operation_records(teacher_id):
    """分析操作记录"""
    try:
        from collections import defaultdict
        from datetime import timedelta
        
        # 获取操作记录
        records = OperationRecord.query.filter_by(teacher_id=teacher_id).order_by(OperationRecord.create_time).all()
        
        # 分析教师操作模式
        operation_type_stats = {}
        time_stats = {}
        daily_stats = {}
        risk_stats = {}
        
        for record in records:
            # 统计操作类型
            if record.operation_type not in operation_type_stats:
                operation_type_stats[record.operation_type] = 0
            operation_type_stats[record.operation_type] += 1
            
            # 统计操作时间
            hour = record.create_time.hour
            if hour not in time_stats:
                time_stats[hour] = 0
            time_stats[hour] += 1
            
            # 统计每日操作
            date_key = record.create_time.strftime("%Y-%m-%d")
            if date_key not in daily_stats:
                daily_stats[date_key] = 0
            daily_stats[date_key] += 1
            
            # 统计风险级别
            if record.risk_level not in risk_stats:
                risk_stats[record.risk_level] = 0
            risk_stats[record.risk_level] += 1
        
        # 识别异常操作
        abnormal_operations = []
        
        # 1. 短时间内多次相同操作
        recent_operations = defaultdict(list)
        for record in records:
            record_time = record.create_time
            key = (record.operation_type, record_time.strftime("%Y-%m-%d"))
            recent_operations[key].append(record)
        
        for key, ops in recent_operations.items():
            if len(ops) > 5:  # 同一类型操作在一天内超过5次
                abnormal_operations.append({
                    "type": "frequent_operations",
                    "message": f"短时间内多次执行{key[0]}操作",
                    "count": len(ops),
                    "date": key[1]
                })
        
        # 2. 高风险操作
        high_risk_ops = [r for r in records if r.risk_level == 'high']
        if high_risk_ops:
            abnormal_operations.append({
                "type": "high_risk_operations",
                "message": "存在高风险操作",
                "count": len(high_risk_ops)
            })
        
        # 3. 异常操作时间
        for record in records:
            hour = record.create_time.hour
            if hour < 6 or hour > 22:  # 凌晨或深夜操作
                abnormal_operations.append({
                    "type": "abnormal_time",
                    "message": f"在非常规时间({hour}:00)执行操作",
                    "operation_type": record.operation_type,
                    "time": record.create_time.strftime("%Y-%m-%d %H:%M:%S")
                })
        
        # 生成操作建议
        suggestions = []
        
        # 基于操作类型的建议
        if operation_type_stats.get('delete', 0) > 10:
            suggestions.append("您最近删除操作较多，建议检查是否有批量删除的需求")
        if operation_type_stats.get('import', 0) > 5:
            suggestions.append("您最近导入操作较多，建议检查导入数据的准确性")
        if operation_type_stats.get('update', 0) > 15:
            suggestions.append("您最近修改操作较多，建议检查是否有批量更新的需求")
        
        # 基于时间模式的建议
        peak_hours = sorted(time_stats.items(), key=lambda x: x[1], reverse=True)[:3]
        if peak_hours:
            peak_times = [f"{h}:00" for h, _ in peak_hours]
            suggestions.append(f"您的操作高峰期在{', '.join(peak_times)}，建议在此时段集中处理重要任务")
        
        # 基于风险的建议
        if risk_stats.get('high', 0) > 0:
            suggestions.append("您有高风险操作记录，建议定期审查操作日志")
        if risk_stats.get('medium', 0) > 10:
            suggestions.append("您有较多中等风险操作，建议检查操作流程是否合理")
        
        # 基于每日操作量的建议
        daily_counts = list(daily_stats.values())
        if daily_counts:
            avg_daily = sum(daily_counts) / len(daily_counts)
            if avg_daily > 20:
                suggestions.append("您的日均操作量较大，建议优化操作流程以提高效率")
        
        # 操作效率分析
        total_duration = sum(r.operation_duration for r in records if r.operation_duration)
        avg_duration = total_duration / len(records) if records else 0
        
        return jsonify({
            "code": 200,
            "msg": "分析成功",
            "data": {
                "operation_type_stats": operation_type_stats,
                "time_stats": time_stats,
                "daily_stats": daily_stats,
                "risk_stats": risk_stats,
                "abnormal_operations": abnormal_operations,
                "suggestions": suggestions,
                "efficiency": {
                    "total_operations": len(records),
                    "average_duration": round(avg_duration, 2),
                    "total_duration": round(total_duration, 2)
                }
            }
        })
    
    except Exception as e:
        return jsonify({"code": 500, "msg": f"分析失败：{str(e)}"}), 500
