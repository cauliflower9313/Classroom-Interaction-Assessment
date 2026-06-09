"""视频识别工具类（YOLO识别学生抬头/低头，适配Web实时调用）"""
import cv2
import numpy as np
import os
from ultralytics import YOLO
from app.config import VIDEO_MODEL_PATH
from PIL import Image, ImageDraw, ImageFont  # 新增：用于中文绘制

class VideoRecognition:
    def __init__(self):
        if not os.path.exists(VIDEO_MODEL_PATH):
            raise FileNotFoundError(f"YOLO模型文件不存在：{VIDEO_MODEL_PATH}，请放入训练好的best.pt")
        self.model = YOLO(VIDEO_MODEL_PATH)
        self.CLASS_NAMES = {0: "低头", 1: "抬头"} # 改为中文
        self.reset_count()
        # 加载中文字体（Windows系统路径，可根据系统调整）
        self.font_path = "C:/Windows/Fonts/simhei.ttf"  # 黑体
        if not os.path.exists(self.font_path):
            self.font_path = None
            print("⚠️  未找到中文字体，中文标签将显示为方框")
        # 初始化设备
        self.device = "cuda" if self.model.device.type == "cuda" else "cpu"
        print(f"🔧 视频识别使用设备：{self.device}")

    def reset_count(self):
        self.head_up_count = 0
        self.head_down_count = 0
        self.frame_count = 0

    def draw_chinese_text(self, img, text, pos, color=(255, 255, 255), font_size=20):
        """
        在OpenCV图像上绘制中文文本（解决乱码问题）
        :param img: OpenCV图像（BGR格式）
        :param text: 要绘制的中文文本
        :param pos: 文本位置 (x, y)
        :param color: 文本颜色 (B, G, R)
        :param font_size: 字体大小
        :return: 绘制后的图像
        """
        if self.font_path is None:
            return img
        try:
            # 转换为PIL图像（RGB格式）
            img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            draw = ImageDraw.Draw(img_pil)
            # 加载字体
            font = ImageFont.truetype(self.font_path, font_size, encoding="utf-8")
            # 绘制文本
            draw.text(pos, text, font=font, fill=(color[2], color[1], color[0]))  # PIL使用RGB
            # 转换回OpenCV图像（BGR格式）
            return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
        except Exception as e:
            print(f"⚠️  绘制中文文本失败：{str(e)}")
            return img

    def detect_single_frame(self, frame_bytes):
        """
        检测单帧视频（不绘制标注框，只返回检测结果）
        :param frame_bytes: 视频帧字节数据
        :return: 检测结果
        """
        try:
            self.frame_count += 1
            nparr = np.frombuffer(frame_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is None:
                raise ValueError("无法解析视频帧")

            detect_result = {
                "head_up_count": self.head_up_count,
                "head_down_count": self.head_down_count,
                "head_up_rate": 0.0,
                "detected": False
            }

            # 进行检测，不绘制标注框
            try:
                results = self.model(frame, conf=0.3, device=self.device, verbose=False)
                current_up = 0
                current_down = 0
                
                if len(results) > 0 and len(results[0].boxes) > 0:
                    # 选择置信度最高的检测结果
                    max_conf_idx = results[0].boxes.conf.argmax().item()
                    cls_id = int(results[0].boxes.cls[max_conf_idx].item())
                    cls_name = self.CLASS_NAMES.get(cls_id, "未知")

                    if cls_name == "抬头":
                        current_up += 1
                    elif cls_name == "低头":
                        current_down += 1

                if current_up > current_down:
                    self.head_up_count += 1
                elif current_down > current_up:
                    self.head_down_count += 1

                total = self.head_up_count + self.head_down_count
                head_up_rate = self.head_up_count / total if total > 0 else 0.0

                detect_result = {
                    "head_up_count": self.head_up_count,
                    "head_down_count": self.head_down_count,
                    "head_up_rate": round(head_up_rate, 2),
                    "detected": True,
                    "current_frame_result": f"抬头{current_up}人，低头{current_down}人"
                }
            except Exception as e:
                print(f"⚠️  模型推理失败：{str(e)}")

            return detect_result
        except Exception as e:
            print(f"❌ 帧检测失败：{str(e)}")
            return {
                "head_up_count": self.head_up_count,
                "head_down_count": self.head_down_count,
                "head_up_rate": 0.0,
                "detected": False,
                "error": str(e)
            }

    def start_camera_local(self):
        """
        本地摄像头测试
        """
        cap = None
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                raise Exception("无法打开本地摄像头")
            self.reset_count()
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                _, frame_bytes = cv2.imencode('.jpg', frame)
                result, annotated_frame_bytes = self.detect_single_frame(frame_bytes.tobytes())
                annotated_frame = cv2.imdecode(np.frombuffer(annotated_frame_bytes, np.uint8), cv2.IMREAD_COLOR)
                cv2.imshow("Student Head Detection (Local)", annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        except Exception as e:
            print(f"❌ 本地摄像头测试失败：{str(e)}")
        finally:
            if cap is not None:
                cap.release()
            cv2.destroyAllWindows()
        total = self.head_up_count + self.head_down_count
        return {
            "head_up_count": self.head_up_count,
            "head_down_count": self.head_down_count,
            "head_up_rate": self.head_up_count / total if total > 0 else 0.0
        }

video_recognizer = None
try:
    video_recognizer = VideoRecognition()
    print(f"✅ YOLO视频识别模型加载成功，设备：{video_recognizer.device}")
except Exception as e:
    print(f"⚠️  YOLO模型加载失败：{str(e)}（请先放入best.pt模型文件）")
    # 即使模型加载失败，也要确保video_recognizer有默认值
    video_recognizer = None