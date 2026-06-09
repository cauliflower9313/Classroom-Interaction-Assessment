"""学生端语音识别相关路由"""
from flask import request, jsonify
from app.models import AudioRecord
from app.routes.student import bp
from app.routes.student.auth import student_login_required
from datetime import datetime
import sys
import os
import tempfile
import whisper
import torch
import subprocess
import numpy as np

try:
    from opencc import OpenCC
    cc = OpenCC('t2s')
    def to_simplified(text):
        return cc.convert(text)
    print("✅ OpenCC繁简转换模块加载成功", file=sys.stderr)
except ImportError:
    def to_simplified(text):
        return text
    print("⚠️ OpenCC未安装，跳过繁简转换", file=sys.stderr)

try:
    import noisereduce as nr
    from scipy.io import wavfile
    NOISE_REDUCE_AVAILABLE = True
    print("✅ 降噪模块加载成功", file=sys.stderr)
except ImportError:
    NOISE_REDUCE_AVAILABLE = False
    print("⚠️ noisereduce未安装，跳过降噪处理", file=sys.stderr)

def apply_noise_reduction(input_wav, output_wav):
    """应用降噪处理"""
    if not NOISE_REDUCE_AVAILABLE:
        return input_wav
    
    try:
        sample_rate, data = wavfile.read(input_wav)
        
        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0
        elif data.dtype == np.int32:
            data = data.astype(np.float32) / 2147483648.0
        elif data.dtype == np.uint8:
            data = (data.astype(np.float32) - 128) / 128.0
        
        if len(data.shape) > 1:
            data = data.mean(axis=1)
        
        print(f"🔧 开始降噪处理，采样率: {sample_rate}, 数据长度: {len(data)}", file=sys.stderr)
        
        reduced_noise = nr.reduce_noise(y=data, sr=sample_rate, prop_decrease=0.8, stationary=False)
        
        reduced_noise = np.clip(reduced_noise * 32768.0, -32768, 32767).astype(np.int16)
        
        wavfile.write(output_wav, sample_rate, reduced_noise)
        print(f"✅ 降噪处理完成: {output_wav}", file=sys.stderr)
        
        return output_wav
    except Exception as e:
        print(f"⚠️ 降噪处理失败: {str(e)}，使用原始音频", file=sys.stderr)
        return input_wav

QUESTION_PUNCTUATION = ["？", "?"]

QUESTION_BASIC = [
    "什么", "为什么", "何时", "何地", "谁", "如何", "怎样", "多少",
    "哪些", "哪个", "是否", "有没有", "对不对", "是不是", "能否",
    "可否", "怎么", "为何", "何故", "何为"
]

QUESTION_CLASSROOM = [
    "谁能", "谁愿意", "哪位同学", "请回答", "谁知道", "有人能",
    "大家认为", "哪位来说说", "试着回答", "大胆说说", "哪位补充",
    "谁还有", "请解释", "请描述", "请分析", "请比较", "请评价",
    "请总结", "请举例", "请证明", "请推理", "请预测", "请设计",
    "请应用", "请论证"
]

QUESTION_HYPOTHETICAL = [
    "如果", "假如", "假设", "倘若", "要是", "若",
    "如何改进", "有何创新", "怎样优化", "如何解决", "有何启示",
    "有何借鉴", "如何避免", "如何应用", "如何验证", "如何实施",
    "如何评估", "如何判断", "如何选择", "如何解释", "如何推理",
    "如何预测", "如何设计", "如何创造", "如何构建"
]

QUESTION_FOLLOWUP = [
    "具体", "详细", "进一步", "再说说", "补充", "为什么这么说",
    "依据是什么", "理由", "证据", "支撑", "怎么得出", "从何而知",
    "还有别的", "另一种角度", "不同看法", "相反观点", "特殊情况",
    "例外情况", "适用范围", "条件限制"
]

QUESTION_STUDENT = [
    "老师", "请教", "想问", "不懂", "不明白", "为什么是",
    "这个怎么", "那个如何", "有个问题", "我想问", "有疑问",
    "请教一下", "怎么理解", "为什么这样", "能否解释"
]

QUESTION_DISCUSSION = [
    "小组讨论", "大家讨论", "互相提问", "共同思考", "交流看法",
    "分享观点", "提出质疑", "反驳理由", "赞成原因", "不同意见"
]

QUESTION_CONFIRM = [
    "对吗", "是吗", "明白吗", "清楚吗", "听懂了吗", "理解了吗",
    "记住了吗", "掌握了吗", "学会了吗", "知道了吗", "看清了吗",
    "观察到了吗", "发现了吗", "记得吗", "了解吗", "熟悉吗",
    "认同吗", "同意吗", "赞成吗", "认可吗", "准确吗", "完整吗",
    "合理吗", "正确吗", "严谨吗", "通顺吗", "还有吗", "齐了吗",
    "够了吗", "漏了吗"
]

QUESTION_INTERACTION = [
    "举手", "发言", "开口", "分享", "交流", "沟通", "探讨",
    "辩论", "争论", "质疑", "提问", "发问", "请教", "咨询",
    "答疑", "解惑", "回应", "回答", "作答", "回话"
]

QUESTION_RHETORICAL = [
    "难道", "莫非", "岂不是", "真的吗", "确定吗", "一定吗",
    "仅此吗", "只此吗", "仅此而已", "只能这样", "别无选择",
    "有没有例外", "是否唯一"
]

QUESTION_MODAL = [
    "能不能", "会不会", "可不可以", "应不应该", "愿不愿意", "敢不敢"
]

QUESTION_INVITATION = [
    "谁来说", "谁来答", "谁来讲", "谁来做", "谁来演示", "谁来总结"
]

QUESTION_TRANSITION = [
    "除此之外", "进一步来说", "换句话说", "也就是说", "那么"
]

ALL_QUESTION_KEYWORDS = (
    QUESTION_PUNCTUATION +
    QUESTION_BASIC +
    QUESTION_CLASSROOM +
    QUESTION_HYPOTHETICAL +
    QUESTION_FOLLOWUP +
    QUESTION_STUDENT +
    QUESTION_DISCUSSION +
    QUESTION_CONFIRM +
    QUESTION_INTERACTION +
    QUESTION_RHETORICAL +
    QUESTION_MODAL +
    QUESTION_INVITATION +
    QUESTION_TRANSITION
)

def is_question(text):
    """判断文本是否为提问，使用多层级关键词检测"""
    if text is None:
        return False
    try:
        text = str(text).strip()
        if not text:
            return False
        
        if "？" in text or "?" in text:
            print(f"[is_question] 文本包含问号，判定为提问: '{text}'", file=sys.stderr)
            return True
        
        for keyword in ALL_QUESTION_KEYWORDS:
            if keyword in text:
                print(f"[is_question] 匹配到关键词 '{keyword}'，判定为提问: '{text}'", file=sys.stderr)
                return True
        
        print(f"[is_question] 未匹配到任何关键词，判定为非提问: '{text}'", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[is_question] 异常: {e}, 文本: '{text}'", file=sys.stderr)
        return False

_whisper_model = None

LOCAL_MODEL_PATH = r"F:\pyproject\class\backend\app\static\trained_models\audio\model.pt"

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔧 加载Whisper模型，设备：{device}", file=sys.stderr)
        
        try:
            _whisper_model = whisper.load_model("base", device=device)
            print("✅ Whisper基础模型加载完成", file=sys.stderr)
            
            # 尝试加载本地模型权重（如果存在且兼容）
            if os.path.exists(LOCAL_MODEL_PATH):
                try:
                    state_dict = torch.load(LOCAL_MODEL_PATH, map_location=device)
                    # 检查模型权重是否兼容
                    model_dict = _whisper_model.state_dict()
                    compatible = True
                    for key in state_dict.keys():
                        if key in model_dict:
                            if state_dict[key].shape != model_dict[key].shape:
                                print(f"⚠️ 模型权重形状不匹配: {key}", file=sys.stderr)
                                compatible = False
                                break
                        else:
                            print(f"⚠️ 模型权重键不存在: {key}", file=sys.stderr)
                            compatible = False
                            break
                    
                    if compatible:
                        _whisper_model.load_state_dict(state_dict)
                        print(f"✅ 本地模型加载成功: {LOCAL_MODEL_PATH}", file=sys.stderr)
                    else:
                        print(f"⚠️ 本地模型与基础模型不兼容，使用预训练模型", file=sys.stderr)
                except Exception as e:
                    print(f"⚠️ 加载本地模型权重失败: {str(e)}，使用预训练模型", file=sys.stderr)
            else:
                print(f"ℹ️ 未找到本地模型: {LOCAL_MODEL_PATH}，使用预训练模型", file=sys.stderr)
            
        except Exception as e:
            print(f"❌ Whisper模型加载失败: {str(e)}", file=sys.stderr)
            raise
            
    return _whisper_model

try:
    from app.utils.audio_recognition import audio_recognizer
    print("语音识别模块导入成功", file=sys.stderr)
except Exception as e:
    print(f"语音识别模块导入失败: {str(e)}", file=sys.stderr)
    audio_recognizer = None

@bp.route("/audio/recognize", methods=["POST"])
@student_login_required
def recognize_audio(student_id):
    """接收前端发送的音频文件进行识别"""
    temp_filename = None
    wav_filename = None
    try:
        if 'audio' not in request.files:
            return jsonify({
                "code": 400,
                "msg": "没有收到音频文件",
                "data": {"text": "", "is_question": False}
            }), 400
        
        audio_file = request.files['audio']
        sequence = request.form.get('sequence', '01')
        session_id = request.form.get('session_id')  # 获取会话ID
        
        print(f"[音频识别] 收到请求: 学生={student_id}, 序号={sequence}, session_id={session_id}", file=sys.stderr)
        
        if audio_file.filename == '':
            return jsonify({
                "code": 400,
                "msg": "音频文件名为空",
                "data": {"text": "", "is_question": False}
            }), 400
        
        temp_dir = tempfile.gettempdir()
        import uuid
        unique_id = str(uuid.uuid4())
        temp_filename = os.path.join(temp_dir, f"audio_{unique_id}.webm")
        wav_filename = os.path.join(temp_dir, f"audio_{unique_id}.wav")
        
        audio_file.save(temp_filename)
        file_size = os.path.getsize(temp_filename)
        print(f"📁 保存音频文件: {temp_filename}, 大小: {file_size} 字节, 序号: {sequence}", file=sys.stderr)
        
        if file_size < 2000:
            print(f"⚠️ 音频文件太小，跳过识别", file=sys.stderr)
            return jsonify({
                "code": 200,
                "msg": "音频太短",
                "data": {"text": "", "is_question": False}
            })
        
        try:
            result = subprocess.run(
                ['ffmpeg', '-y', '-i', temp_filename, '-ar', '16000', '-ac', '1', '-f', 'wav', wav_filename],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                print(f"⚠️ FFmpeg转换失败: {result.stderr[:200]}", file=sys.stderr)
                wav_filename = temp_filename
            else:
                print(f"✅ FFmpeg转换成功: {wav_filename}", file=sys.stderr)
                
                denoised_filename = wav_filename.replace('.wav', '_denoised.wav')
                wav_filename = apply_noise_reduction(wav_filename, denoised_filename)
        except FileNotFoundError:
            print("⚠️ FFmpeg未安装，尝试直接使用原文件", file=sys.stderr)
            wav_filename = temp_filename
        except subprocess.TimeoutExpired:
            print("⚠️ FFmpeg转换超时", file=sys.stderr)
            wav_filename = temp_filename
        
        model = get_whisper_model()
        
        result = model.transcribe(
            wav_filename,
            language="zh",
            verbose=False,
            fp16=False,
            condition_on_previous_text=False,
            temperature=0.0
        )
        
        text = result.get("text", "").strip()
        text = to_simplified(text)
        # 使用关键词判断是否为提问
        is_question_result = is_question(text)
        print(f"🎯 识别结果: {text}, 是否问题: {is_question_result}", file=sys.stderr)
        
        if text:
            try:
                from app import db
                record = AudioRecord(
                    student_id=student_id,
                    speaker=f"学生{student_id}",
                    content=text,
                    is_question=is_question_result,
                    record_time=datetime.now(),
                    session_id=session_id  # 保存会话ID
                )
                db.session.add(record)
                db.session.commit()
                print(f"✅ 语音记录保存成功: 学生={student_id}, 会话={session_id}, 内容={text[:20]}..., 是否提问={is_question_result}", file=sys.stderr)
            except Exception as e:
                print(f"⚠️ 语音记录保存失败：{e}", file=sys.stderr)
        
        return jsonify({
            "code": 200,
            "msg": "识别成功",
            "data": {
                "text": text,
                "is_question": is_question_result,
                "sequence": sequence
            }
        })
                
    except Exception as e:
        print(f"❌ 语音识别失败：{str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({
            "code": 500,
            "msg": f"识别失败：{str(e)}",
            "data": {"text": "", "is_question": False}
        }), 500
    finally:
        try:
            if temp_filename and os.path.exists(temp_filename):
                os.unlink(temp_filename)
            if wav_filename and wav_filename != temp_filename and os.path.exists(wav_filename):
                os.unlink(wav_filename)
        except:
            pass

@bp.route("/audio/start_recognition", methods=["POST"])
@student_login_required
def start_audio_recognition(student_id):
    try:
        if not audio_recognizer:
            return jsonify({"code": 500, "msg": "语音识别模块未初始化"}), 500

        audio_recognizer.start_recording()

        return jsonify({
            "code": 200,
            "msg": "语音识别已启动",
            "data": {}
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"启动语音识别失败：{str(e)}",
            "data": {}
        }), 500

@bp.route("/audio/get_current_result", methods=["GET"])
@student_login_required
def get_audio_current_result(student_id):
    """获取语音识别结果"""
    try:
        if not audio_recognizer:
            return jsonify({
                "code": 500,
                "msg": "语音识别模块未初始化",
                "data": {
                    "text": "",
                    "is_question": False
                }
            }), 500
        
        result = audio_recognizer.get_current_result()
        
        text = result.get("text", "")
        is_question = result.get("is_question", False)
        
        if text:
            try:
                from app import db
                record = AudioRecord(
                    student_id=student_id,
                    speaker=f"学生{student_id}",
                    content=text,
                    is_question=is_question,
                    record_time=datetime.now()
                )
                db.session.add(record)
                db.session.commit()
            except Exception as e:
                print(f"语音记录保存失败：{e}")
        
        return jsonify({
            "code": 200,
            "msg": "获取成功",
            "data": {
                "text": text,
                "is_question": is_question
            }
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"获取失败：{str(e)}",
            "data": {
                "text": "",
                "is_question": False
            }
        }), 500

@bp.route("/audio/stop_recognition", methods=["POST"])
@student_login_required
def stop_audio_recognition(student_id):
    try:
        if audio_recognizer is None:
            return jsonify({
                "code": 200,
                "msg": "语音识别未运行",
                "data": {}
            })

        audio_recognizer.stop_recording()

        return jsonify({
            "code": 200,
            "msg": "语音识别已停止",
            "data": {}
        })
    except Exception as e:
        return jsonify({
            "code": 500,
            "msg": f"停止失败：{str(e)}",
            "data": {}
        }), 500
