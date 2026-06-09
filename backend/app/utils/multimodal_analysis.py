"""多模态数据融合分析工具类"""
import json
from datetime import datetime
from app import db
from app.models import Student, VideoRecord, AudioRecord, Answer, MultiModalAnalysis

class MultiModalAnalyzer:
    """多模态数据融合分析器"""
    
    def __init__(self):
        """初始化分析器"""
        self.session_id = None
        self.class_id = None
        self.start_time = datetime.now()
        self.end_time = None
    
    def set_session_info(self, session_id, class_id):
        """
        设置会话信息
        :param session_id: 会话ID
        :param class_id: 课程ID
        """
        self.session_id = session_id
        self.class_id = class_id
    
    def analyze_student(self, student_id):
        """
        分析单个学生的多模态数据
        :param student_id: 学生ID
        :return: 分析结果
        """
        try:
            # 获取学生信息
            student = Student.query.get(student_id)
            if not student:
                return {
                    "code": 404,
                    "msg": "学生不存在",
                    "data": None
                }
            
            # 获取视频记录（不使用session_id过滤，获取所有记录）
            video_records = VideoRecord.query.filter_by(
                student_id=student_id
            ).order_by(VideoRecord.record_time).all()
            
            # 获取音频记录（不使用session_id过滤，获取所有记录）
            audio_records = AudioRecord.query.filter_by(
                student_id=student_id
            ).order_by(AudioRecord.record_time).all()
            
            # 获取答题记录（不使用session_id过滤，获取所有记录）
            answers = Answer.query.filter_by(
                student_id=student_id
            ).order_by(Answer.submit_time).all()
            
            # 分析视频数据
            video_analysis = self._analyze_video_data(video_records)
            
            # 分析音频数据
            audio_analysis = self._analyze_audio_data(audio_records)
            
            # 分析答题数据
            answer_analysis = self._analyze_answer_data(answers)
            
            # 融合分析
            fusion_analysis = self._fuse_analysis(video_analysis, audio_analysis, answer_analysis)
            
            # 保存分析结果
            self._save_analysis_result(student_id, fusion_analysis, video_analysis, audio_analysis, answer_analysis)
            
            return {
                "code": 200,
                "msg": "分析成功",
                "data": {
                    "student_info": {
                        "id": student.id,
                        "name": student.name,
                        "class_name": student.class_name
                    },
                    "video_analysis": video_analysis,
                    "audio_analysis": audio_analysis,
                    "answer_analysis": answer_analysis,
                    "fusion_analysis": fusion_analysis
                }
            }
        except Exception as e:
            return {
                "code": 500,
                "msg": f"分析失败：{str(e)}",
                "data": None
            }
    
    def _analyze_video_data(self, video_records):
        """
        分析视频数据
        :param video_records: 视频记录列表
        :return: 视频分析结果
        """
        if not video_records:
            return {
                "total_frames": 0,
                "head_up_count": 0,
                "head_down_count": 0,
                "avg_head_up_rate": 0.0,
                "max_head_up_rate": 0.0,
                "min_head_up_rate": 0.0
            }
        
        total_head_up = 0
        total_head_down = 0
        head_up_rates = []
        
        for record in video_records:
            total_head_up += record.head_up_count
            total_head_down += record.head_down_count
            head_up_rates.append(record.head_up_rate)
        
        total_frames = total_head_up + total_head_down
        avg_head_up_rate = total_head_up / total_frames if total_frames > 0 else 0.0
        max_head_up_rate = max(head_up_rates) if head_up_rates else 0.0
        min_head_up_rate = min(head_up_rates) if head_up_rates else 0.0
        
        return {
            "total_frames": total_frames,
            "head_up_count": total_head_up,
            "head_down_count": total_head_down,
            "avg_head_up_rate": round(avg_head_up_rate, 2),
            "max_head_up_rate": round(max_head_up_rate, 2),
            "min_head_up_rate": round(min_head_up_rate, 2),
            "total_records": len(video_records)
        }
    
    def _analyze_audio_data(self, audio_records):
        """
        分析音频数据
        :param audio_records: 音频记录列表
        :return: 音频分析结果
        """
        if not audio_records:
            return {
                "total_segments": 0,
                "total_questions": 0,
                "total_statements": 0,
                "avg_confidence": 0.0,
                "participation_duration": 0
            }
        
        total_questions = 0
        total_statements = 0
        total_confidence = 0
        
        for record in audio_records:
            if record.is_question:
                total_questions += 1
            else:
                total_statements += 1
            total_confidence += record.confidence or 0
        
        avg_confidence = total_confidence / len(audio_records) if audio_records else 0.0
        
        # 计算参与时长（假设每条记录3秒）
        participation_duration = len(audio_records) * 3
        
        return {
            "total_segments": len(audio_records),
            "total_questions": total_questions,
            "total_statements": total_statements,
            "avg_confidence": round(avg_confidence, 2),
            "participation_duration": participation_duration
        }
    
    def _analyze_answer_data(self, answers):
        """
        分析答题数据
        :param answers: 答题记录列表
        :return: 答题分析结果
        """
        if not answers:
            return {
                "total_answers": 0,
                "correct_count": 0,
                "incorrect_count": 0,
                "avg_score": 0.0,
                "avg_time_spent": 0,
                "accuracy_rate": 0.0
            }
        
        total_score = 0
        correct_count = 0
        incorrect_count = 0
        total_time_spent = 0
        
        for answer in answers:
            total_score += answer.score
            if answer.is_correct:
                correct_count += 1
            else:
                incorrect_count += 1
            total_time_spent += answer.time_spent
        
        avg_score = total_score / len(answers) if answers else 0.0
        avg_time_spent = total_time_spent / len(answers) if answers else 0
        accuracy_rate = correct_count / len(answers) if answers else 0.0
        
        return {
            "total_answers": len(answers),
            "correct_count": correct_count,
            "incorrect_count": incorrect_count,
            "avg_score": round(avg_score, 2),
            "avg_time_spent": round(avg_time_spent, 2),
            "accuracy_rate": round(accuracy_rate, 2)
        }
    
    def _fuse_analysis(self, video_analysis, audio_analysis, answer_analysis):
        """
        融合多模态分析结果
        :param video_analysis: 视频分析结果
        :param audio_analysis: 音频分析结果
        :param answer_analysis: 答题分析结果
        :return: 融合分析结果
        """
        # 计算参与度得分（0-100）
        participation_score = (
            video_analysis["avg_head_up_rate"] * 40 +  # 抬头率占40%
            (audio_analysis["total_segments"] / 10) * 30 +  # 音频片段数占30%
            (answer_analysis["total_answers"] / 5) * 30  # 答题数占30%
        )
        participation_score = min(100, max(0, participation_score))
        
        # 计算理解度得分（0-100）
        understanding_score = (
            answer_analysis["accuracy_rate"] * 60 +  # 答题准确率占60%
            (1 - answer_analysis["avg_time_spent"] / 120) * 20 +  # 答题速度占20%
            audio_analysis["total_questions"] * 5  # 提问数占20%
        )
        understanding_score = min(100, max(0, understanding_score))
        
        # 计算综合得分
        overall_score = (participation_score * 0.4 + understanding_score * 0.6)
        
        # 生成分析结论
        if overall_score >= 80:
            conclusion = "表现优秀，积极参与课堂互动，理解能力强"
        elif overall_score >= 60:
            conclusion = "表现良好，能够参与课堂互动，基本理解课程内容"
        else:
            conclusion = "需要加强参与度，提高对课程内容的理解"
        
        return {
            "participation_score": round(participation_score, 2),
            "understanding_score": round(understanding_score, 2),
            "overall_score": round(overall_score, 2),
            "conclusion": conclusion,
            "recommendations": self._generate_recommendations(video_analysis, audio_analysis, answer_analysis)
        }
    
    def _generate_recommendations(self, video_analysis, audio_analysis, answer_analysis):
        """
        生成个性化建议
        :param video_analysis: 视频分析结果
        :param audio_analysis: 音频分析结果
        :param answer_analysis: 答题分析结果
        :return: 建议列表
        """
        recommendations = []
        
        # 基于视频分析的建议
        if video_analysis["avg_head_up_rate"] < 0.6:
            recommendations.append("建议提高课堂专注度，保持抬头听讲")
        
        # 基于音频分析的建议
        if audio_analysis["total_segments"] < 5:
            recommendations.append("建议积极参与课堂讨论，多提问和回答问题")
        
        # 基于答题分析的建议
        if answer_analysis["accuracy_rate"] < 0.6:
            recommendations.append("建议加强对课程内容的理解，多做练习")
        if answer_analysis["avg_time_spent"] > 90:
            recommendations.append("建议提高答题速度，加强对知识点的掌握")
        
        if not recommendations:
            recommendations.append("继续保持良好的学习状态")
        
        return recommendations
    
    def _save_analysis_result(self, student_id, fusion_analysis, video_analysis, audio_analysis, answer_analysis):
        """
        保存分析结果到数据库
        :param student_id: 学生ID
        :param fusion_analysis: 融合分析结果
        :param video_analysis: 视频分析结果
        :param audio_analysis: 音频分析结果
        :param answer_analysis: 答题分析结果
        """
        try:
            analysis_data = json.dumps({
                "video_analysis": video_analysis,
                "audio_analysis": audio_analysis,
                "answer_analysis": answer_analysis,
                "fusion_analysis": fusion_analysis
            }, ensure_ascii=False)
            
            # 使用默认值处理None值
            session_id = self.session_id or "default"
            class_id = self.class_id or "default"
            
            analysis = MultiModalAnalysis(
                student_id=student_id,
                session_id=session_id,
                class_id=class_id,
                start_time=self.start_time,
                end_time=datetime.now(),
                total_video_frames=video_analysis["total_frames"],
                total_audio_segments=audio_analysis["total_segments"],
                total_questions=audio_analysis["total_questions"],
                total_answers=answer_analysis["total_answers"],
                avg_head_up_rate=video_analysis["avg_head_up_rate"],
                participation_score=fusion_analysis["participation_score"],
                understanding_score=fusion_analysis["understanding_score"],
                overall_score=fusion_analysis["overall_score"],
                analysis_data=analysis_data
            )
            
            db.session.add(analysis)
            db.session.commit()
            print(f"✅ 多模态分析结果已保存：学生 {student_id}")
        except Exception as e:
            print(f"⚠️  保存分析结果失败：{str(e)}")
            db.session.rollback()
    
    def analyze_class(self, class_id):
        """
        分析整个班级的多模态数据
        :param class_id: 班级ID
        :return: 班级分析结果
        """
        try:
            # 获取班级学生
            students = Student.query.filter_by(class_name=class_id).all()
            if not students:
                return {
                    "code": 404,
                    "msg": "班级不存在或无学生",
                    "data": None
                }
            
            class_analysis = {
                "class_id": class_id,
                "total_students": len(students),
                "student_analyses": [],
                "class_average": {
                    "avg_participation_score": 0,
                    "avg_understanding_score": 0,
                    "avg_overall_score": 0
                }
            }
            
            total_participation = 0
            total_understanding = 0
            total_overall = 0
            
            for student in students:
                student_result = self.analyze_student(student.id)
                if student_result["code"] == 200:
                    student_analysis = student_result["data"]
                    class_analysis["student_analyses"].append({
                        "student_id": student.id,
                        "student_name": student.name,
                        "overall_score": student_analysis["fusion_analysis"]["overall_score"],
                        "participation_score": student_analysis["fusion_analysis"]["participation_score"],
                        "understanding_score": student_analysis["fusion_analysis"]["understanding_score"]
                    })
                    total_participation += student_analysis["fusion_analysis"]["participation_score"]
                    total_understanding += student_analysis["fusion_analysis"]["understanding_score"]
                    total_overall += student_analysis["fusion_analysis"]["overall_score"]
            
            # 计算班级平均值
            if class_analysis["student_analyses"]:
                count = len(class_analysis["student_analyses"])
                class_analysis["class_average"]["avg_participation_score"] = round(total_participation / count, 2)
                class_analysis["class_average"]["avg_understanding_score"] = round(total_understanding / count, 2)
                class_analysis["class_average"]["avg_overall_score"] = round(total_overall / count, 2)
            
            return {
                "code": 200,
                "msg": "班级分析成功",
                "data": class_analysis
            }
        except Exception as e:
            return {
                "code": 500,
                "msg": f"班级分析失败：{str(e)}",
                "data": None
            }

# 全局多模态分析器实例
multimodal_analyzer = MultiModalAnalyzer()