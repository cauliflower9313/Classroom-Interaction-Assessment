"""语音识别工具类（Whisper实时识别师生提问）- 使用进程隔离避免崩溃"""
import whisper
import torch
import os
import wave
import pyaudio
import tempfile
import multiprocessing
from multiprocessing import Queue
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
TRAINED_MODEL_PATH = os.path.join(BASE_DIR, 'app/static/trained_models/audio/model.pt')
AUDIO_MODEL_DIR = os.path.join(tempfile.gettempdir(), "whisper_models")
os.makedirs(AUDIO_MODEL_DIR, exist_ok=True)

# 提问关键词分类定义
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

# 合并所有提问关键词
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
    """判断文本是否为提问"""
    if text is None:
        return False
    try:
        text = str(text).strip()
        if not text:
            return False
        # 检查是否包含问号
        if "？" in text or "?" in text:
            print(f"[is_question] 文本包含问号，判定为提问: '{text}'")
            return True
        # 检查是否包含提问关键词
        for keyword in ALL_QUESTION_KEYWORDS:
            if keyword in text:
                print(f"[is_question] 匹配到关键词 '{keyword}'，判定为提问: '{text}'")
                return True
        print(f"[is_question] 未匹配到任何关键词，判定为非提问: '{text}'")
        return False
    except Exception as e:
        print(f"[is_question] 异常: {e}, 文本: '{text}'")
        return False

def load_trained_model(device="cpu"):
    """加载训练好的模型，参考 whisper_gui.py 的方式"""
    print("加载模型...")
    model = whisper.load_model("small", device=device)
    if os.path.exists(TRAINED_MODEL_PATH):
        try:
            state_dict = torch.load(TRAINED_MODEL_PATH, map_location=device)
            model.load_state_dict(state_dict)
            print(f"✅ 训练模型加载成功: {TRAINED_MODEL_PATH}")
        except Exception as e:
            print(f"⚠️ 加载训练模型权重失败: {str(e)}，使用预训练模型")
    else:
        print(f"⚠️ 未找到训练模型: {TRAINED_MODEL_PATH}，使用预训练模型")
    return model

def audio_recognition_process(result_queue, stop_event, model_size="base"):
    """独立进程中运行的语音识别"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"📢 语音识别进程启动，设备：{device}")
    
    try:
        model = load_trained_model(device=device)
        print(f"✅ Whisper模型加载成功")
    except Exception as e:
        print(f"❌ 模型加载失败：{str(e)}")
        return
    
    FORMAT = pyaudio.paInt16
    CHANNELS = 1
    RATE = 16000
    CHUNK = 1024
    RECORD_SECONDS = 3
    
    p = None
    stream = None
    
    try:
        p = pyaudio.PyAudio()
        
        mic_device_index = None
        device_count = p.get_device_count()
        for i in range(device_count):
            try:
                device_info = p.get_device_info_by_index(i)
                if device_info["maxInputChannels"] > 0:
                    mic_device_index = i
                    print(f"🎤 检测到麦克风设备 [{i}]：{device_info['name']}")
                    break
            except:
                continue
        
        if mic_device_index is None:
            print("❌ 无可用麦克风设备！")
            result_queue.put({"error": "无可用麦克风设备"})
            return
        
        stream = p.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
            input_device_index=mic_device_index
        )
        print("✅ 语音识别已启动，开始实时录音...")
        
        while not stop_event.is_set():
            frames = []
            try:
                for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
                    if stop_event.is_set():
                        break
                    try:
                        data = stream.read(CHUNK, exception_on_overflow=False)
                        frames.append(data)
                    except IOError:
                        continue
                    except Exception:
                        continue
            except Exception as e:
                print(f"⚠️ 录音出错：{str(e)}")
                continue
            
            if frames and not stop_event.is_set():
                audio_bytes = b''.join(frames)
                temp_filename = None
                try:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                        temp_filename = temp_file.name
                        
                        wf = wave.open(temp_filename, 'wb')
                        wf.setnchannels(CHANNELS)
                        wf.setsampwidth(p.get_sample_size(FORMAT))
                        wf.setframerate(RATE)
                        wf.writeframes(audio_bytes)
                        wf.close()
                        
                        result = model.transcribe(
                            temp_filename,
                            language="zh",
                            verbose=False,
                            fp16=False,
                            condition_on_previous_text=False,
                            temperature=0.0,
                            no_speech_threshold=0.6,
                            logprob_threshold=-1.0
                        )
                        
                        raw_text = result.get("text", "")
                        text = str(raw_text).strip() if raw_text else ""
                        
                        # 使用关键词判断是否为提问
                        is_q = is_question(text)
                        result_queue.put({
                            "text": text,
                            "is_question": is_q,
                            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        })
                        
                except Exception as e:
                    print(f"⚠️ 识别出错：{str(e)}")
                    result_queue.put({"error": str(e)})
                finally:
                    try:
                        if temp_filename and os.path.exists(temp_filename):
                            os.unlink(temp_filename)
                    except:
                        pass
        
    except Exception as e:
        print(f"⚠️ 语音识别进程异常：{str(e)}")
        result_queue.put({"error": str(e)})
    finally:
        if stream:
            try:
                stream.stop_stream()
                stream.close()
            except:
                pass
        if p:
            try:
                p.terminate()
            except:
                pass
        print("✅ 语音识别进程已停止")


class AudioRecognition:
    def __init__(self, model_size="base"):
        self.model_size = model_size
        self.process = None
        self.result_queue = None
        self.stop_event = None
        self.is_recording = False
        self.current_text = ""
        self.current_is_question = False
        self.last_activity_time = datetime.now()
        print("✅ 语音识别控制器初始化完成（进程隔离模式）")

    def start_recording(self, callback=None):
        if self.is_recording:
            print("⚠️ 录音已在进行中")
            return
        
        self.result_queue = Queue()
        self.stop_event = multiprocessing.Event()
        
        self.process = multiprocessing.Process(
            target=audio_recognition_process,
            args=(self.result_queue, self.stop_event, self.model_size),
            daemon=True
        )
        self.process.start()
        self.is_recording = True
        print("✅ 语音识别进程已启动")

    def stop_recording(self):
        self.is_recording = False
        
        if self.stop_event:
            self.stop_event.set()
        
        if self.process and self.process.is_alive():
            self.process.join(timeout=5)
            if self.process.is_alive():
                self.process.terminate()
                self.process.join(timeout=2)
        
        self.process = None
        self.stop_event = None
        self.result_queue = None
        print("✅ 语音识别已停止")

    def get_current_result(self):
        if self.result_queue and not self.result_queue.empty():
            try:
                result = self.result_queue.get_nowait()
                if "error" not in result:
                    self.current_text = result.get("text", "")
                    self.current_is_question = result.get("is_question", False)
                    self.last_activity_time = datetime.now()
            except:
                pass
        
        return {
            "text": self.current_text,
            "is_question": self.current_is_question,
            "last_activity": self.last_activity_time.strftime("%Y-%m-%d %H:%M:%S")
        }

    def __del__(self):
        self.stop_recording()


audio_recognizer = None
try:
    multiprocessing.set_start_method('spawn', force=True)
    audio_recognizer = AudioRecognition(model_size="base")
except Exception as e:
    print(f"⚠️ 语音识别实例初始化失败：{str(e)}")
    audio_recognizer = None
