"""教师端问题管理模块 - 支持课程关联"""
from flask import request, jsonify
from app import db
from app.models import Question, Answer, Student, Course
from app.routes.teacher.auth import teacher_login_required
from datetime import datetime

from app.routes.teacher import bp


@bp.route("/question/add", methods=["POST"])
@teacher_login_required
def add_question(teacher_id):
    """添加新问题（支持多种题型，可关联课程）"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    title = data.get("title")
    content = data.get("content")
    question_type = data.get("question_type", "text")
    options = data.get("options", "")
    correct_answer = data.get("correct_answer", "")
    score = data.get("score", 5)
    time_limit = data.get("time_limit", 60)
    course_id = data.get("course_id")  # 获取课程ID
    category = data.get("category", "")

    if not title:
        return jsonify({"code": 400, "msg": "问题标题不能为空"}), 400

    # 如果指定了课程ID，验证课程是否存在且属于当前教师
    if course_id:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403

    # 验证题型和答案格式
    if question_type == "choice" and not options:
        return jsonify({"code": 400, "msg": "选择题必须提供选项"}), 400
    if question_type == "judgment" and correct_answer not in ["true", "false", "正确", "错误"]:
        return jsonify({"code": 400, "msg": "判断题答案必须是true、false、正确或错误"}), 400

    question = Question(
        teacher_id=teacher_id,
        course_id=course_id,
        title=title,
        content=content or "",
        question_type=question_type,
        options=options,
        correct_answer=correct_answer,
        score=score,
        time_limit=time_limit,
        category=category,
        publish_time=None,
        is_active=False
    )

    try:
        db.session.add(question)
        db.session.commit()
        return jsonify({
            "code": 200,
            "msg": "问题添加成功",
            "data": {"question_id": question.id, "title": question.title}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"添加失败：{str(e)}"}), 500


@bp.route("/question/update/<int:question_id>", methods=["POST"])
@teacher_login_required
def update_question(teacher_id, question_id):
    """更新问题"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    title = data.get("title")
    content = data.get("content")
    question_type = data.get("question_type", "text")
    options = data.get("options", "")
    correct_answer = data.get("correct_answer", "")
    score = data.get("score", 5)
    time_limit = data.get("time_limit", 60)
    category = data.get("category", "")

    if not title:
        return jsonify({"code": 400, "msg": "问题标题不能为空"}), 400

    try:
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        if question.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此问题"}), 403

        # 更新问题信息
        question.title = title
        question.content = content or ""
        question.question_type = question_type
        question.options = options
        question.correct_answer = correct_answer
        question.score = score
        question.time_limit = time_limit
        question.category = category

        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "问题修改成功",
            "data": {"question_id": question.id, "title": question.title}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"修改失败：{str(e)}"}), 500


@bp.route("/question/detail/<int:question_id>", methods=["GET"])
@teacher_login_required
def get_question_detail(teacher_id, question_id):
    """获取问题详情"""
    try:
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404
        
        if question.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权查看此问题"}), 403
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "id": question.id,
                "title": question.title,
                "content": question.content,
                "question_type": question.question_type,
                "options": question.options,
                "correct_answer": question.correct_answer,
                "score": question.score,
                "time_limit": question.time_limit,
                "publish_time": question.publish_time.strftime("%Y-%m-%d %H:%M:%S") if question.publish_time else "",
                "create_time": question.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                "is_active": question.is_active,
                "category": question.category,
                "course_id": question.course_id
            }
        })
    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/question/list", methods=["GET"])
@teacher_login_required
def get_question_list(teacher_id):
    """获取问题列表（包含题型信息，支持分页和课程筛选）"""
    try:
        # 获取分页参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 1000))  # 增大默认值，支持返回更多问题
        course_id = request.args.get('course_id')  # 获取课程ID筛选
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建查询
        query = Question.query.filter_by(teacher_id=teacher_id)
        
        # 如果指定了课程ID，筛选该课程的问题
        if course_id:
            query = query.filter_by(course_id=int(course_id))
        
        # 获取总数
        total = query.count()
        
        # 查询所有问题（不分页）
        questions = query.order_by(Question.create_time.desc()).all()
        question_list = [{
            "id": q.id,
            "title": q.title,
            "content": q.content,
            "question_type": q.question_type,
            "options": q.options,
            "score": q.score,
            "time_limit": q.time_limit,
            "publish_time": q.publish_time.strftime("%Y-%m-%d %H:%M:%S") if q.publish_time else "",
            "create_time": q.create_time.strftime("%Y-%m-%d %H:%M:%S"),
            "is_active": q.is_active,
            "category": q.category,
            "course_id": q.course_id,
            "course_name": q.course.course_name if q.course else ""
        } for q in questions]

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "items": question_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/questions", methods=["GET"])
@teacher_login_required
def get_course_questions(teacher_id, course_id):
    """获取指定课程的问题列表"""
    try:
        # 验证课程
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权访问此课程"}), 403
        
        # 获取分页参数
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 1000))  # 增大默认值，支持返回更多问题
        offset = (page - 1) * page_size
        
        # 查询该课程的问题
        query = Question.query.filter_by(course_id=course_id)
        total = query.count()
        questions = query.order_by(Question.create_time.desc()).all()  # 移除分页限制，返回所有问题
        
        question_list = [{
            "id": q.id,
            "title": q.title,
            "content": q.content,
            "question_type": q.question_type,
            "options": q.options,
            "score": q.score,
            "time_limit": q.time_limit,
            "publish_time": q.publish_time.strftime("%Y-%m-%d %H:%M:%S") if q.publish_time else "",
            "create_time": q.create_time.strftime("%Y-%m-%d %H:%M:%S"),
            "is_active": q.is_active,
            "category": q.category
        } for q in questions]

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "items": question_list,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size,
                "course_name": course.course_name
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/question/add", methods=["POST"])
@teacher_login_required
def add_course_question(teacher_id, course_id):
    """为指定课程添加问题"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    # 验证课程
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"code": 404, "msg": "课程不存在"}), 404
    
    if course.teacher_id != teacher_id:
        return jsonify({"code": 403, "msg": "无权操作此课程"}), 403

    data = request.get_json()
    title = data.get("title")
    content = data.get("content")
    question_type = data.get("question_type", "text")
    options = data.get("options", "")
    correct_answer = data.get("correct_answer", "")
    score = data.get("score", 5)
    time_limit = data.get("time_limit", 60)
    category = data.get("category", "")

    if not title:
        return jsonify({"code": 400, "msg": "问题标题不能为空"}), 400

    # 验证题型和答案格式
    if question_type == "choice" and not options:
        return jsonify({"code": 400, "msg": "选择题必须提供选项"}), 400
    if question_type == "judgment" and correct_answer not in ["true", "false", "正确", "错误"]:
        return jsonify({"code": 400, "msg": "判断题答案必须是true、false、正确或错误"}), 400

    question = Question(
        teacher_id=teacher_id,
        course_id=course_id,
        title=title,
        content=content or "",
        question_type=question_type,
        options=options,
        correct_answer=correct_answer,
        score=score,
        time_limit=time_limit,
        category=category,
        publish_time=None,
        is_active=False
    )

    try:
        db.session.add(question)
        db.session.commit()
        return jsonify({
            "code": 200,
            "msg": "问题添加成功",
            "data": {"question_id": question.id, "title": question.title}
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"添加失败：{str(e)}"}), 500


@bp.route("/question/publish", methods=["POST"])
@teacher_login_required
def publish_question(teacher_id):
    """发布问题给学生"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    question_id = data.get("question_id")

    if not question_id:
        return jsonify({"code": 400, "msg": "问题ID不能为空"}), 400

    try:
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        if question.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此问题"}), 403

        question.publish_time = datetime.now()
        question.is_active = True
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "问题发布成功",
            "data": {
                "question_id": question.id,
                "title": question.title,
                "publish_time": question.publish_time.strftime("%Y-%m-%d %H:%M:%S")
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"发布失败：{str(e)}"}), 500


@bp.route("/question/unpublish", methods=["POST"])
@teacher_login_required
def unpublish_question(teacher_id):
    """撤回已发布的问题"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    question_id = data.get("question_id")

    if not question_id:
        return jsonify({"code": 400, "msg": "问题ID不能为空"}), 400

    try:
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        if question.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此问题"}), 403

        question.is_active = False
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "问题撤回成功",
            "data": {
                "question_id": question.id,
                "title": question.title
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"撤回失败：{str(e)}"}), 500


@bp.route("/question/delete", methods=["POST"])
@teacher_login_required
def delete_question(teacher_id):
    """删除问题"""
    if not request.is_json:
        return jsonify({"code": 400, "msg": "请求格式必须为JSON"}), 400

    data = request.get_json()
    question_id = data.get("question_id")

    if not question_id:
        return jsonify({"code": 400, "msg": "问题ID不能为空"}), 400

    try:
        question = Question.query.get(question_id)
        if not question:
            return jsonify({"code": 404, "msg": "问题不存在"}), 404

        if question.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此问题"}), 403

        # 先删除相关的答题记录
        Answer.query.filter_by(question_id=question_id).delete()
        
        # 再删除问题
        db.session.delete(question)
        db.session.commit()

        return jsonify({
            "code": 200,
            "msg": "问题删除成功",
            "data": {
                "question_id": question_id
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"code": 500, "msg": f"删除失败：{str(e)}"}), 500


@bp.route("/question/answers/<int:question_id>", methods=["GET"])
@teacher_login_required
def get_question_answers(teacher_id, question_id):
    """获取问题所有学生的答题情况"""
    try:
        question = Question.query.get(question_id)
        if not question or question.teacher_id != teacher_id:
            return jsonify({"code": 404, "msg": "问题不存在或无权访问"}), 404

        answers = Answer.query.filter_by(question_id=question_id).all()
        answer_list = []
        
        print(f"=" * 50)
        print(f"获取问题答案 - 问题ID: {question_id}")
        print(f"问题类型: '{question.question_type}', 正确答案: '{question.correct_answer}'")
        print(f"=" * 50)
        
        for answer in answers:
            student = Student.query.get(answer.student_id)
            print(f"答案记录 - 学生: {student.name if student else '未知'}, 答案: '{answer.content}', is_correct: {answer.is_correct}, score: {answer.score}")
            answer_list.append({
                "student_id": answer.student_id,
                "student_name": student.name if student else "未知",
                "content": answer.content,
                "is_correct": answer.is_correct,
                "score": answer.score,
                "submit_time": answer.submit_time.strftime("%Y-%m-%d %H:%M:%S"),
                "time_spent": answer.time_spent
            })

        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "question": {
                    "id": question.id,
                    "title": question.title,
                    "question_type": question.question_type,
                    "correct_answer": question.correct_answer
                },
                "answers": answer_list,
                "total_count": len(answer_list),
                "correct_count": len([a for a in answer_list if a["is_correct"]])
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/question/statistics", methods=["GET"])
@teacher_login_required
def get_question_statistics(teacher_id):
    """获取问题统计信息"""
    try:
        course_id = request.args.get('course_id')
        
        # 构建查询
        query = Question.query.filter_by(teacher_id=teacher_id)
        if course_id:
            query = query.filter_by(course_id=int(course_id))
        
        # 统计已发布的问题数量
        published_count = query.filter_by(is_active=True).count()
        
        # 统计所有问题数量
        total_count = query.count()
        
        # 统计学生答题情况
        questions = query.all()
        question_ids = [q.id for q in questions]
        
        # 统计总答题数
        total_answers = Answer.query.filter(Answer.question_id.in_(question_ids)).count()
        
        # 统计正确答题数
        correct_answers = Answer.query.filter(
            Answer.question_id.in_(question_ids),
            Answer.is_correct == True
        ).count()
        
        # 按题型统计问题数量
        question_type_stats = {}
        for question in questions:
            q_type = question.question_type
            if q_type not in question_type_stats:
                question_type_stats[q_type] = 0
            question_type_stats[q_type] += 1
        
        # 按分类统计问题数量
        category_stats = {}
        for question in questions:
            category = question.category or "默认分类"
            if category not in category_stats:
                category_stats[category] = 0
            category_stats[category] += 1
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "total_questions": total_count,
                "published_questions": published_count,
                "total_answers": total_answers,
                "correct_answers": correct_answers,
                "accuracy_rate": round((correct_answers / total_answers * 100), 2) if total_answers > 0 else 0,
                "question_type_stats": question_type_stats,
                "category_stats": category_stats
            }
        })

    except Exception as e:
        return jsonify({"code": 500, "msg": f"获取失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/question/import/preview", methods=["POST"])
@teacher_login_required
def preview_course_questions(teacher_id, course_id):
    """预览导入课程问题"""
    import pandas as pd
    import ast
    from io import BytesIO
    
    try:
        # 验证课程
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        # 获取上传的文件
        file = request.files.get('file')
        if not file:
            return jsonify({"code": 400, "msg": "请选择要导入的文件"}), 400
        
        # 读取文件
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            return jsonify({"code": 400, "msg": "只支持Excel和CSV文件"}), 400
        
        # 验证必要字段 - 支持多种格式
        if all(col in df.columns for col in ['标题', '题型', '答案', '分数']):
            title_col = '标题'
            type_col = '题型'
            answer_col = '答案'
            score_col = '分数'
            category_col = '类别' if '类别' in df.columns else ('分类' if '分类' in df.columns else None)
            options_col = '选项' if '选项' in df.columns else None
        elif all(col in df.columns for col in ['题目', '类型', '答案', '选项']):
            title_col = '题目'
            type_col = '类型'
            answer_col = '答案'
            score_col = 5
            category_col = '类别' if '类别' in df.columns else ('分类' if '分类' in df.columns else None)
            options_col = '选项' if '选项' in df.columns else None
        else:
            return jsonify({"code": 400, "msg": "文件格式不正确，请参考导入模板"}), 400
        
        # 根据题型映射（单选题、多选题、主观题、判断题）
        # 映射为前端使用的类型：choice(选择题)、judgment(判断题)、text(主观题)
        question_type_map = {
            "单选": "choice",
            "单选题": "choice",
            "多选": "choice",
            "多选题": "choice",
            "判断": "judgment",
            "判断题": "judgment",
            "主观": "text",
            "主观题": "text",
            "问答": "text",
            "问答题": "text",
            "text": "text",
            "choice": "choice",
            "fill_blank": "text",
            "single_choice": "choice",
            "multiple_choice": "choice",
            "subjective": "text"
        }

        questions = []
        for index, row in df.iterrows():
            title = str(row[title_col]) if pd.notna(row[title_col]) else ''
            question_type = question_type_map.get(str(row[type_col]) if pd.notna(row[type_col]) else '', 'subjective')
            correct_answer = str(row[answer_col]).strip() if pd.notna(row[answer_col]) else ''
            
            try:
                # 如果score_col是列名，使用列名获取值；如果是数字，直接使用该数字作为默认值
                if isinstance(score_col, str):
                    score = float(row[score_col]) if pd.notna(row[score_col]) else 5
                else:
                    score = float(score_col)
            except (ValueError, TypeError):
                score = 5
            
            # 获取类别，如果为空则使用默认分类
            category = '默认分类'
            if category_col and pd.notna(row[category_col]):
                category_value = str(row[category_col]).strip()
                if category_value:  # 确保不是空字符串
                    category = category_value
                    print(f"使用类别: {category}")
                else:
                    print(f"类别为空，使用默认分类")
            else:
                print(f"没有类别列或类别为空，使用默认分类")
            
            # 处理判断题答案
            if question_type == "judgment":
                correct_answer = "正确" if correct_answer.strip() in ["正确", "True", "true", "1"] else "错误"
            
            # 解析选项
            options_text = ''
            if question_type == "choice" and options_col:
                options_raw = row[options_col]
                options_list = []
                
                # 尝试解析列表格式的选项
                if pd.notna(options_raw):
                    options_str = str(options_raw).strip()
                    # 检查是否是列表格式 ['选项1', '选项2', ...]
                    if options_str.startswith('[') and options_str.endswith(']'):
                        try:
                            # 使用 ast.literal_eval 安全解析
                            parsed_list = ast.literal_eval(options_str)
                            if isinstance(parsed_list, list):
                                options_list = [str(opt).strip() for opt in parsed_list if opt]
                        except:
                            # 解析失败，尝试其他方式
                            pass
                    else:
                        # 尝试按逗号或换行分割
                        if ',' in options_str or '，' in options_str:
                            options_list = [opt.strip() for opt in options_str.replace('，', ',').split(',') if opt.strip()]
                        elif '\n' in options_str:
                            options_list = [opt.strip() for opt in options_str.split('\n') if opt.strip()]
                
                # 格式化选项为 A. xxx B. xxx 格式
                if options_list:
                    formatted_options = []
                    for i, opt in enumerate(options_list[:6]):  # 最多6个选项
                        option_letter = chr(65 + i)
                        formatted_options.append(f"{option_letter}. {opt}")
                    options_text = '\n'.join(formatted_options)
            
            questions.append({
                "title": title,
                "type": str(row[type_col]) if pd.notna(row[type_col]) else '',
                "answer": correct_answer,
                "score": score,
                "category": category,
                "options": options_text
            })
        
        return jsonify({
            "code": 200,
            "msg": "预览成功",
            "data": {"questions": questions}
        })
    except Exception as e:
        import traceback
        print(f"预览失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"预览失败：{str(e)}"}), 500


@bp.route("/course/<int:course_id>/question/import", methods=["POST"])
@teacher_login_required
def import_course_questions(teacher_id, course_id):
    """导入课程问题"""
    import pandas as pd
    import ast
    from io import BytesIO
    
    try:
        # 验证课程
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"code": 404, "msg": "课程不存在"}), 404
        
        if course.teacher_id != teacher_id:
            return jsonify({"code": 403, "msg": "无权操作此课程"}), 403
        
        # 获取上传的文件
        file = request.files.get('file')
        if not file:
            return jsonify({"code": 400, "msg": "请选择要导入的文件"}), 400
        
        # 读取文件
        if file.filename.endswith('.xlsx'):
            df = pd.read_excel(file)
        elif file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        else:
            return jsonify({"code": 400, "msg": "只支持Excel和CSV文件"}), 400
        
        # 验证必要字段 - 支持多种格式
        if all(col in df.columns for col in ['标题', '题型', '答案', '分数']):
            title_col = '标题'
            type_col = '题型'
            answer_col = '答案'
            score_col = '分数'
            category_col = '类别' if '类别' in df.columns else ('分类' if '分类' in df.columns else None)
            options_col = '选项' if '选项' in df.columns else None
        elif all(col in df.columns for col in ['题目', '类型', '答案', '选项']):
            title_col = '题目'
            type_col = '类型'
            answer_col = '答案'
            score_col = 5
            category_col = '类别' if '类别' in df.columns else ('分类' if '分类' in df.columns else None)
            options_col = '选项' if '选项' in df.columns else None
        else:
            return jsonify({"code": 400, "msg": "文件格式不正确，请参考导入模板"}), 400
        
        # 根据题型映射（单选题、多选题、主观题、判断题）
        question_type_map = {
            "单选": "single_choice",
            "单选题": "single_choice",
            "多选": "multiple_choice",
            "多选题": "multiple_choice",
            "判断": "judgment",
            "判断题": "judgment",
            "主观": "subjective",
            "主观题": "subjective",
            "问答": "subjective",
            "问答题": "subjective",
            "text": "subjective",
            "choice": "single_choice",
            "fill_blank": "subjective"
        }

        success_count = 0
        for index, row in df.iterrows():
            title = str(row[title_col]) if pd.notna(row[title_col]) else ''
            question_type = question_type_map.get(str(row[type_col]) if pd.notna(row[type_col]) else '', 'text')
            correct_answer = str(row[answer_col]).strip() if pd.notna(row[answer_col]) else ''
            
            try:
                # 如果score_col是列名，使用列名获取值；如果是数字，直接使用该数字作为默认值
                if isinstance(score_col, str):
                    score = float(row[score_col]) if pd.notna(row[score_col]) else 5
                else:
                    score = float(score_col)
            except (ValueError, TypeError):
                score = 5

            # 获取类别，如果为空则使用默认分类
            category = '默认分类'
            if category_col and pd.notna(row[category_col]):
                category_value = str(row[category_col]).strip()
                if category_value:  # 确保不是空字符串
                    category = category_value
                    print(f"使用类别: {category}")
                else:
                    print(f"类别为空，使用默认分类")
            else:
                print(f"没有类别列或类别为空，使用默认分类")

            # 处理判断题答案
            if question_type == "judgment":
                correct_answer = "正确" if correct_answer.strip() in ["正确", "True", "true", "1"] else "错误"

            # 解析选项
            options = ''
            if question_type in ["single_choice", "multiple_choice", "choice"] and options_col:
                options_raw = row[options_col]
                options_list = []
                
                # 尝试解析列表格式的选项
                if pd.notna(options_raw):
                    options_str = str(options_raw).strip()
                    print(f"解析选项原始数据: {options_str}")
                    
                    # 检查是否是列表格式 ['选项1', '选项2', ...]
                    if options_str.startswith('[') and options_str.endswith(']'):
                        try:
                            # 使用 ast.literal_eval 安全解析
                            parsed_list = ast.literal_eval(options_str)
                            if isinstance(parsed_list, list):
                                options_list = [str(opt).strip() for opt in parsed_list if opt]
                                print(f"列表格式解析成功: {options_list}")
                        except Exception as e:
                            print(f"列表格式解析失败: {e}")
                            # 解析失败，尝试其他方式
                            pass
                    
                    # 如果不是列表格式或解析失败，尝试其他方式
                    if not options_list:
                        # 尝试按逗号或换行分割
                        if ',' in options_str or '，' in options_str:
                            options_list = [opt.strip() for opt in options_str.replace('，', ',').split(',') if opt.strip()]
                            print(f"逗号分割解析: {options_list}")
                        elif '\n' in options_str:
                            options_list = [opt.strip() for opt in options_str.split('\n') if opt.strip()]
                            print(f"换行分割解析: {options_list}")
                        else:
                            # 单个选项
                            options_list = [options_str]
                            print(f"单个选项: {options_list}")
                
                # 格式化选项为 A. xxx B. xxx 格式
                if options_list:
                    formatted_options = []
                    for i, opt in enumerate(options_list[:6]):  # 最多6个选项
                        option_letter = chr(65 + i)
                        formatted_options.append(f"{option_letter}. {opt}")
                    options = '\n'.join(formatted_options)
                    print(f"格式化后的选项: {options}")
            
            # 去重检查
            existing_question = Question.query.filter_by(
                teacher_id=teacher_id,
                course_id=course_id,
                title=title,
                question_type=question_type
            ).first()
            if existing_question:
                continue
            
            question = Question(
                teacher_id=teacher_id,
                course_id=course_id,
                title=title,
                content='',
                question_type=question_type,
                options=options,
                correct_answer=correct_answer,
                score=score,
                time_limit=60,
                is_active=False,
                category=category,
                create_time=datetime.now()
            )
            db.session.add(question)
            success_count += 1
        
        db.session.commit()
        return jsonify({
            "code": 200,
            "msg": "导入成功",
            "data": {"count": success_count}
        })
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"导入失败: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"code": 500, "msg": f"导入失败：{str(e)}"}), 500
