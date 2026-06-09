"""学生端视频识别相关路由"""
from flask import request, jsonify
from app.models import VideoRecord
from app.routes.student import bp
from app.routes.student.auth import student_login_required
from datetime import datetime
import base64

# 导入视频识别模块
from app.utils.video_recognition import video_recognizer
print("视频识别模块导入成功")

# 启动视频检测接口
@bp.route("/video/start_detection", methods=["POST"])
@student_login_required
def start_video_detection(student_id):
    """启动视频检测接口（使用真实YOLO模型）"""
    try:
        if not video_recognizer:
            return jsonify({
                "code": 500,
                "msg": "视频识别模块初始化失败，请检查YOLO模型文件",
                "data": {}
            }), 500
        
        # 重置计数器
        video_recognizer.reset_count()
        
        return jsonify({
            "code": 200,
            "msg": "视频检测已启动",
            "data": {
                "device": "camera",
                "status": "running"
            }
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"启动失败：{str(e)}",
            "data": {}
        }), 500

@bp.route("/video/detect_frame", methods=["POST"])
@student_login_required
def detect_video_frame(student_id):
    """视频帧检测接口（使用真实YOLO模型，不返回标注帧）"""
    try:
        # 1. 解析前端参数（强制容错）
        data = request.get_json() or {}
        frame_data = data.get("frame")  # 前端发送的帧Base64
        timestamp = data.get("timestamp", 0)

        # 2. 使用真实YOLO模型进行检测
        if not video_recognizer:
            return jsonify({
                "code": 500,
                "msg": "视频识别模块未初始化",
                "data": {
                    "head_up": False,
                    "head_up_count": 0,
                    "head_down_count": 0,
                    "head_up_rate": 0.0
                }
            }), 500

        # 解码Base64帧数据
        if frame_data:
            # 移除Base64前缀
            if frame_data.startswith('data:image/'):
                frame_data = frame_data.split(',')[1]
            # 解码为字节
            frame_bytes = base64.b64decode(frame_data)

            # 进行检测（不返回标注帧）
            detect_result = video_recognizer.detect_single_frame(frame_bytes)

            # 3. 构造返回结果
            head_up = detect_result.get("head_up_count", 0) > detect_result.get("head_down_count", 0)
            head_up_count = detect_result.get("head_up_count", 0)
            head_down_count = detect_result.get("head_down_count", 0)
            head_up_rate = detect_result.get("head_up_rate", 0.0)

            # 4. 返回固定格式的结果（前端依赖这些字段）
            return jsonify({
                "code": 200,
                "msg": "帧检测成功",
                "data": {
                    "head_up": head_up,          # 是否抬头（布尔值）
                    "head_up_count": head_up_count,  # 累计抬头数
                    "head_down_count": head_down_count,  # 累计低头数
                    "head_up_rate": head_up_rate,      # 抬头率（0-1）
                    "timestamp": timestamp       # 时间戳（回传）
                }
            })
        else:
            return jsonify({
                "code": 400,
                "msg": "缺少视频帧数据",
                "data": {
                    "head_up": False,
                    "head_up_count": 0,
                    "head_down_count": 0,
                    "head_up_rate": 0.0
                }
            }), 400
    except Exception as e:
        # 保证即使出错也返回固定格式
        return jsonify({
            "code": 500,
            "msg": f"帧检测失败：{str(e)}",
            "data": {
                "head_up": False,
                "head_up_count": 0,
                "head_down_count": 0,
                "head_up_rate": 0.0
            }
        }), 500

@bp.route("/video/end_detection", methods=["POST"])
@student_login_required
def end_video_detection(student_id):
    """停止视频检测接口（修复参数接收）"""
    try:
        from app import db
        # 1. 解析前端参数（强制容错）
        data = request.get_json() or {}
        head_up_count = int(data.get("head_up_count", 0))
        head_down_count = int(data.get("head_down_count", 0))
        head_up_rate = float(data.get("head_up_rate", 0.0))
        session_id = data.get("session_id", "")

        # 2. 保存检测记录到数据库
        record = VideoRecord(
            student_id=student_id,
            head_up_count=head_up_count,
            head_down_count=head_down_count,
            head_up_rate=head_up_rate,
            session_id=session_id,
            record_time=datetime.now()
        )
        db.session.add(record)
        db.session.commit()
        
        print(f"视频记录已保存: 学生={student_id}, 抬头={head_up_count}, 低头={head_down_count}, 时间={record.record_time}")

        # 3. 返回结果
        return jsonify({
            "code": 200,
            "msg": "视频检测已停止，记录已保存",
            "data": {
                "total_frames": head_up_count + head_down_count,
                "head_up_rate": head_up_rate
            }
        })
    except Exception as e:
        # 数据库操作失败时回滚
        from app import db
        db.session.rollback()
        return jsonify({
            "code": 500,
            "msg": f"停止失败：{str(e)}",
            "data": {}
        }), 500
