"""教师智能助手工具类"""
import json
from datetime import datetime, timedelta
from app import db
from app.models import Student, Teacher, VideoRecord, AudioRecord, Question, Answer, MultiModalAnalysis

class TeacherAssistant:
    """教师智能助手"""
    
    def __init__(self):
        """初始化教师助手"""
        self.teacher_id = None
    
    def set_teacher_id(self, teacher_id):
        """
        设置教师ID
        :param teacher_id: 教师ID
        """
        self.teacher_id = teacher_id
    
    def get_class_analysis(self, class_name=None):
        """
        获取班级分析报告
        :param class_name: 班级名称，None表示所有班级
        :return: 分析结果
        """
        try:
            # 获取学生列表
            if class_name:
                students = Student.query.filter_by(class_name=class_name).all()
            else:
                students = Student.query.all()
            
            if not students:
                return {
                    "code": 404,
                    "msg": "班级不存在或无学生",
                    "data": None
                }
            
            # 分析数据
            analysis_result = self._analyze_class_data(students)
            
            return {
                "code": 200,
                "msg": "分析成功",
                "data": analysis_result
            }
        except Exception as e:
            return {
                "code": 500,
                "msg": f"分析失败：{str(e)}",
                "data": None
            }
    
    def _analyze_class_data(self, students):
        """
        分析班级数据
        :param students: 学生列表
        :return: 分析结果
        """
        total_students = len(students)
        
        # 统计视频数据
        total_head_up = 0
        total_head_down = 0
        total_video_records = 0
        
        # 统计音频数据
        total_questions = 0
        total_statements = 0
        total_audio_segments = 0
        
        # 统计答题数据
        total_answers = 0
        total_correct = 0
        total_score = 0
        
        # 学生分析
        student_analyses = []
        
        for student in students:
            # 视频记录
            video_records = VideoRecord.query.filter_by(student_id=student.id).all()
            student_head_up = sum(r.head_up_count for r in video_records)
            student_head_down = sum(r.head_down_count for r in video_records)
            student_video_records = len(video_records)
            
            total_head_up += student_head_up
            total_head_down += student_head_down
            total_video_records += student_video_records
            
            # 音频记录
            audio_records = AudioRecord.query.filter_by(student_id=student.id).all()
            student_questions = sum(1 for r in audio_records if r.is_question)
            student_statements = len(audio_records) - student_questions
            
            total_questions += student_questions
            total_statements += student_statements
            total_audio_segments += len(audio_records)
            
            # 答题记录
            answer_records = Answer.query.filter_by(student_id=student.id).all()
            student_correct = sum(1 for r in answer_records if r.is_correct)
            student_score = sum(r.score for r in answer_records)
            
            total_answers += len(answer_records)
            total_correct += student_correct
            total_score += student_score
            
            # 计算学生指标
            avg_head_up_rate = student_head_up / (student_head_up + student_head_down) if (student_head_up + student_head_down) > 0 else 0
            participation_rate = (student_video_records + len(audio_records)) / 10 if (student_video_records + len(audio_records)) > 0 else 0
            accuracy_rate = student_correct / len(answer_records) if len(answer_records) > 0 else 0
            
            student_analyses.append({
                "student_id": student.id,
                "student_name": student.name,
                "class_name": student.class_name,
                "avg_head_up_rate": round(avg_head_up_rate, 2),
                "participation_rate": round(participation_rate, 2),
                "accuracy_rate": round(accuracy_rate, 2),
                "total_questions": student_questions,
                "total_answers": len(answer_records),
                "total_score": student_score
            })
        
        # 计算班级指标
        total_frames = total_head_up + total_head_down
        avg_head_up_rate = total_head_up / total_frames if total_frames > 0 else 0
        participation_rate = (total_video_records + total_audio_segments) / (total_students * 10) if total_students > 0 else 0
        accuracy_rate = total_correct / total_answers if total_answers > 0 else 0
        avg_score = total_score / total_answers if total_answers > 0 else 0
        
        # 生成分析结论
        conclusion = self._generate_class_conclusion({
            "avg_head_up_rate": avg_head_up_rate,
            "participation_rate": participation_rate,
            "accuracy_rate": accuracy_rate,
            "avg_score": avg_score
        })
        
        # 生成建议
        recommendations = self._generate_class_recommendations({
            "avg_head_up_rate": avg_head_up_rate,
            "participation_rate": participation_rate,
            "accuracy_rate": accuracy_rate,
            "avg_score": avg_score
        })
        
        return {
            "class_name": students[0].class_name if students else "所有班级",
            "total_students": total_students,
            "metrics": {
                "avg_head_up_rate": round(avg_head_up_rate, 2),
                "participation_rate": round(participation_rate, 2),
                "accuracy_rate": round(accuracy_rate, 2),
                "avg_score": round(avg_score, 2),
                "total_video_records": total_video_records,
                "total_audio_segments": total_audio_segments,
                "total_questions": total_questions,
                "total_answers": total_answers
            },
            "conclusion": conclusion,
            "recommendations": recommendations,
            "student_analyses": student_analyses
        }
    
    def _generate_class_conclusion(self, metrics):
        """
        生成班级分析结论
        :param metrics: 班级指标
        :return: 结论
        """
        avg_head_up_rate = metrics.get("avg_head_up_rate", 0)
        participation_rate = metrics.get("participation_rate", 0)
        accuracy_rate = metrics.get("accuracy_rate", 0)
        avg_score = metrics.get("avg_score", 0)
        
        if avg_head_up_rate >= 0.8 and participation_rate >= 0.7 and accuracy_rate >= 0.8:
            return "班级整体表现优秀，学生参与度高，理解能力强"
        elif avg_head_up_rate >= 0.6 and participation_rate >= 0.5 and accuracy_rate >= 0.6:
            return "班级表现良好，学生能够积极参与，基本理解课程内容"
        else:
            return "班级需要加强参与度和对课程内容的理解"
    
    def _generate_class_recommendations(self, metrics):
        """
        生成班级建议
        :param metrics: 班级指标
        :return: 建议列表
        """
        recommendations = []
        
        avg_head_up_rate = metrics.get("avg_head_up_rate", 0)
        participation_rate = metrics.get("participation_rate", 0)
        accuracy_rate = metrics.get("accuracy_rate", 0)
        avg_score = metrics.get("avg_score", 0)
        
        if avg_head_up_rate < 0.6:
            recommendations.append("建议增加课堂互动环节，提高学生的专注度")
        if participation_rate < 0.5:
            recommendations.append("建议设计更多互动活动，鼓励学生参与课堂讨论")
        if accuracy_rate < 0.6:
            recommendations.append("建议加强知识点讲解，提供更多练习机会")
        if avg_score < 60:
            recommendations.append("建议调整教学内容和难度，确保学生能够理解")
        
        if not recommendations:
            recommendations.append("继续保持良好的教学状态，进一步优化教学方法")
        
        return recommendations
    
    def generate_class_report(self, class_name=None, start_date=None, end_date=None):
        """
        生成班级报告
        :param class_name: 班级名称
        :param start_date: 开始日期
        :param end_date: 结束日期
        :return: 报告内容
        """
        try:
            # 获取分析数据
            analysis = self.get_class_analysis(class_name)
            if analysis["code"] != 200:
                return analysis
            
            data = analysis["data"]
            
            # 生成报告
            report = {
                "title": f"{data['class_name']}班级分析报告",
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "summary": {
                    "total_students": data["total_students"],
                    "conclusion": data["conclusion"]
                },
                "metrics": data["metrics"],
                "recommendations": data["recommendations"],
                "student_analyses": data["student_analyses"]
            }
            
            return {
                "code": 200,
                "msg": "报告生成成功",
                "data": report
            }
        except Exception as e:
            return {
                "code": 500,
                "msg": f"报告生成失败：{str(e)}",
                "data": None
            }
    
    def get_student_insights(self, student_id):
        """
        获取学生洞察
        :param student_id: 学生ID
        :return: 洞察结果
        """
        try:
            student = Student.query.get(student_id)
            if not student:
                return {
                    "code": 404,
                    "msg": "学生不存在",
                    "data": None
                }
            
            # 获取学生数据
            video_records = VideoRecord.query.filter_by(student_id=student_id).order_by(VideoRecord.record_time.desc()).all()
            audio_records = AudioRecord.query.filter_by(student_id=student_id).order_by(AudioRecord.record_time.desc()).all()
            answer_records = Answer.query.filter_by(student_id=student_id).order_by(Answer.submit_time.desc()).all()
            
            # 分析数据
            insights = self._analyze_student_data(student, video_records, audio_records, answer_records)
            
            return {
                "code": 200,
                "msg": "获取成功",
                "data": insights
            }
        except Exception as e:
            return {
                "code": 500,
                "msg": f"获取失败：{str(e)}",
                "data": None
            }
    
    def _analyze_student_data(self, student, video_records, audio_records, answer_records):
        """
        分析学生数据
        :param student: 学生对象
        :param video_records: 视频记录
        :param audio_records: 音频记录
        :param answer_records: 答题记录
        :return: 分析结果
        """
        # 视频分析
        total_head_up = sum(r.head_up_count for r in video_records)
        total_head_down = sum(r.head_down_count for r in video_records)
        total_frames = total_head_up + total_head_down
        avg_head_up_rate = total_head_up / total_frames if total_frames > 0 else 0
        
        # 音频分析
        total_questions = sum(1 for r in audio_records if r.is_question)
        total_statements = len(audio_records) - total_questions
        
        # 答题分析
        total_correct = sum(1 for r in answer_records if r.is_correct)
        total_score = sum(r.score for r in answer_records)
        accuracy_rate = total_correct / len(answer_records) if len(answer_records) > 0 else 0
        avg_score = total_score / len(answer_records) if len(answer_records) > 0 else 0
        
        # 计算综合指标
        participation_score = (avg_head_up_rate * 40 + (len(audio_records) / 10) * 30 + (len(answer_records) / 5) * 30)
        participation_score = min(100, max(0, participation_score))
        
        understanding_score = (accuracy_rate * 60 + (1 - (sum(r.time_spent for r in answer_records) / (len(answer_records) * 120)) * 20 if len(answer_records) > 0 else 0) + total_questions * 5)
        understanding_score = min(100, max(0, understanding_score))
        
        overall_score = (participation_score * 0.4 + understanding_score * 0.6)
        
        # 生成洞察
        insights = {
            "student_info": {
                "id": student.id,
                "name": student.name,
                "class_name": student.class_name
            },
            "metrics": {
                "avg_head_up_rate": round(avg_head_up_rate, 2),
                "total_questions": total_questions,
                "total_statements": total_statements,
                "total_answers": len(answer_records),
                "accuracy_rate": round(accuracy_rate, 2),
                "avg_score": round(avg_score, 2),
                "participation_score": round(participation_score, 2),
                "understanding_score": round(understanding_score, 2),
                "overall_score": round(overall_score, 2)
            },
            "recent_activities": {
                "recent_videos": len(video_records),
                "recent_audios": len(audio_records),
                "recent_answers": len(answer_records)
            },
            "recommendations": self._generate_student_recommendations({
                "avg_head_up_rate": avg_head_up_rate,
                "total_questions": total_questions,
                "accuracy_rate": accuracy_rate,
                "avg_score": avg_score
            })
        }
        
        return insights
    
    def _generate_student_recommendations(self, metrics):
        """
        生成学生建议
        :param metrics: 学生指标
        :return: 建议列表
        """
        recommendations = []
        
        avg_head_up_rate = metrics.get("avg_head_up_rate", 0)
        total_questions = metrics.get("total_questions", 0)
        accuracy_rate = metrics.get("accuracy_rate", 0)
        avg_score = metrics.get("avg_score", 0)
        
        if avg_head_up_rate < 0.6:
            recommendations.append("建议提高课堂专注度，保持抬头听讲")
        if total_questions < 2:
            recommendations.append("建议积极参与课堂讨论，多提问")
        if accuracy_rate < 0.6:
            recommendations.append("建议加强对课程内容的理解，多做练习")
        if avg_score < 60:
            recommendations.append("建议课后复习，巩固知识点")
        
        if not recommendations:
            recommendations.append("继续保持良好的学习状态")
        
        return recommendations

# 全局教师助手实例
teacher_assistant = TeacherAssistant()