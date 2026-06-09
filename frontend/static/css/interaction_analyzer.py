"""课堂互动效果综合评估工具类"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.models import Student, VideoRecord, AudioRecord, Question, Answer


class InteractionAnalyzer:
    """课堂互动效果综合评估器"""
    
    @staticmethod
    def analyze_student_performance(student_id, days=7):
        """
        分析学生综合表现
        :param student_id: 学生ID
        :param days: 分析天数
        :return: 综合评估结果
        """
        # 时间范围
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # 获取学生数据
        student = Student.query.get(student_id)
        if not student:
            return None
        
        # 获取视频记录（注意力）
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id == student_id,
            VideoRecord.record_time >= start_date
        ).all()
        
        # 获取音频记录（互动）
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id == student_id,
            AudioRecord.record_time >= start_date
        ).all()
        
        # 获取答题记录
        answers = Answer.query.filter(
            Answer.student_id == student_id,
            Answer.submit_time >= start_date
        ).all()
        
        # 计算各项指标
        attention_score = InteractionAnalyzer._calculate_attention_score(video_records)
        interaction_score = InteractionAnalyzer._calculate_interaction_score(audio_records)
        learning_score = InteractionAnalyzer._calculate_learning_score(answers)
        
        # 综合评分
        overall_score = round((attention_score + interaction_score + learning_score) / 3, 2)
        
        # 生成评估报告
        assessment = {
            'student_info': {
                'id': student.id,
                'name': student.name,
                'class_name': student.class_name
            },
            'time_period': {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d'),
                'days': days
            },
            'scores': {
                'attention_score': attention_score,
                'interaction_score': interaction_score,
                'learning_score': learning_score,
                'overall_score': overall_score
            },
            'detailed_metrics': {
                'avg_head_up_rate': InteractionAnalyzer._get_avg_head_up_rate(video_records),
                'question_count': len([r for r in audio_records if r.is_question]),
                'answer_count': len(answers),
                'correct_rate': InteractionAnalyzer._get_correct_rate(answers),
                'avg_answer_time': InteractionAnalyzer._get_avg_answer_time(answers)
            },
            'recommendations': InteractionAnalyzer._generate_recommendations(
                attention_score, interaction_score, learning_score
            )
        }
        
        return assessment
    
    @staticmethod
    def analyze_class_performance(teacher_id, days=7):
        """
        分析班级整体表现
        :param teacher_id: 教师ID
        :param days: 分析天数
        :return: 班级评估结果
        """
        # 获取教师发布的问题
        questions = Question.query.filter(
            Question.teacher_id == teacher_id,
            Question.publish_time >= datetime.now() - timedelta(days=days)
        ).all()
        
        if not questions:
            return None
        
        # 获取所有学生的答题记录
        all_answers = []
        for question in questions:
            answers = Answer.query.filter_by(question_id=question.id).all()
            all_answers.extend(answers)
        
        # 计算班级指标
        class_stats = {
            'total_questions': len(questions),
            'total_answers': len(all_answers),
            'avg_participation_rate': round(len(all_answers) / (len(questions) * 10) * 100, 2) if questions else 0,  # 假设10个学生
            'avg_correct_rate': round(len([a for a in all_answers if a.is_correct]) / len(all_answers) * 100, 2) if all_answers else 0,
            'avg_score': round(sum([a.score for a in all_answers]) / len(all_answers), 2) if all_answers else 0
        }
        
        # 获取班级视频记录（注意力统计）
        student_ids = list(set([a.student_id for a in all_answers]))
        avg_head_up_rate = InteractionAnalyzer._get_class_avg_head_up_rate(student_ids, days)
        
        class_stats['avg_head_up_rate'] = avg_head_up_rate
        
        # 生成班级评估
        assessment = {
            'class_stats': class_stats,
            'question_analysis': InteractionAnalyzer._analyze_question_performance(questions),
            'student_ranking': InteractionAnalyzer._get_student_ranking(student_ids, days),
            'trend_analysis': InteractionAnalyzer._analyze_trends(teacher_id, days)
        }
        
        return assessment
    
    @staticmethod
    def _calculate_attention_score(video_records):
        """计算注意力得分"""
        if not video_records:
            return 0
        
        avg_head_up_rate = sum([r.head_up_rate for r in video_records]) / len(video_records)
        # 将抬头率转换为0-100分
        return round(avg_head_up_rate * 100, 2)
    
    @staticmethod
    def _calculate_interaction_score(audio_records):
        """计算互动得分"""
        if not audio_records:
            return 0
        
        # 提问次数和互动频率
        question_count = len([r for r in audio_records if r.is_question])
        total_interactions = len(audio_records)
        
        # 基于互动频率评分（最高100分）
        interaction_frequency = min(total_interactions / 10 * 100, 100)  # 每10次互动得100分
        question_quality = min(question_count / 5 * 100, 100)  # 每5次提问得100分
        
        return round((interaction_frequency + question_quality) / 2, 2)
    
    @staticmethod
    def _calculate_learning_score(answers):
        """计算学习效果得分"""
        if not answers:
            return 0
        
        # 正确率和答题速度
        correct_count = len([a for a in answers if a.is_correct])
        correct_rate = correct_count / len(answers) * 100
        
        # 平均得分（相对于满分）
        total_score = sum([a.score for a in answers])
        max_score = sum([5 for a in answers])  # 假设每题5分
        score_rate = (total_score / max_score) * 100 if max_score > 0 else 0
        
        return round((correct_rate + score_rate) / 2, 2)
    
    @staticmethod
    def _get_avg_head_up_rate(video_records):
        """获取平均抬头率"""
        if not video_records:
            return 0
        return round(sum([r.head_up_rate for r in video_records]) / len(video_records) * 100, 2)
    
    @staticmethod
    def _get_correct_rate(answers):
        """获取正确率"""
        if not answers:
            return 0
        correct_count = len([a for a in answers if a.is_correct])
        return round(correct_count / len(answers) * 100, 2)
    
    @staticmethod
    def _get_avg_answer_time(answers):
        """获取平均答题时间"""
        if not answers:
            return 0
        return round(sum([a.time_spent for a in answers]) / len(answers), 2)
    
    @staticmethod
    def _get_class_avg_head_up_rate(student_ids, days):
        """获取班级平均抬头率"""
        if not student_ids:
            return 0
        
        start_date = datetime.now() - timedelta(days=days)
        total_rate = 0
        count = 0
        
        for student_id in student_ids:
            records = VideoRecord.query.filter(
                VideoRecord.student_id == student_id,
                VideoRecord.record_time >= start_date
            ).all()
            
            if records:
                avg_rate = sum([r.head_up_rate for r in records]) / len(records)
                total_rate += avg_rate
                count += 1
        
        return round((total_rate / count) * 100, 2) if count > 0 else 0
    
    @staticmethod
    def _analyze_question_performance(questions):
        """分析问题表现"""
        analysis = []
        
        for question in questions:
            answers = Answer.query.filter_by(question_id=question.id).all()
            correct_count = len([a for a in answers if a.is_correct])
            
            analysis.append({
                'question_id': question.id,
                'title': question.title,
                'type': question.question_type,
                'answer_count': len(answers),
                'correct_count': correct_count,
                'correct_rate': round(correct_count / len(answers) * 100, 2) if answers else 0,
                'avg_score': round(sum([a.score for a in answers]) / len(answers), 2) if answers else 0
            })
        
        return analysis
    
    @staticmethod
    def _get_student_ranking(student_ids, days):
        """获取学生排名"""
        rankings = []
        
        for student_id in student_ids:
            assessment = InteractionAnalyzer.analyze_student_performance(student_id, days)
            if assessment:
                rankings.append({
                    'student_id': student_id,
                    'overall_score': assessment['scores']['overall_score'],
                    'attention_score': assessment['scores']['attention_score'],
                    'learning_score': assessment['scores']['learning_score']
                })
        
        # 按综合得分排序
        rankings.sort(key=lambda x: x['overall_score'], reverse=True)
        
        # 添加排名
        for i, ranking in enumerate(rankings):
            ranking['rank'] = i + 1
        
        return rankings
    
    @staticmethod
    def _analyze_trends(teacher_id, days):
        """分析趋势"""
        trends = {
            'daily_participation': [],
            'daily_correct_rate': [],
            'daily_attention': []
        }
        
        for i in range(days):
            date = datetime.now() - timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            
            # 获取当天的数据
            questions = Question.query.filter(
                Question.teacher_id == teacher_id,
                Question.publish_time >= date.replace(hour=0, minute=0, second=0),
                Question.publish_time < date.replace(hour=23, minute=59, second=59)
            ).all()
            
            if questions:
                answers = []
                for question in questions:
                    question_answers = Answer.query.filter(
                        Answer.question_id == question.id,
                        Answer.submit_time >= date.replace(hour=0, minute=0, second=0),
                        Answer.submit_time < date.replace(hour=23, minute=59, second=59)
                    ).all()
                    answers.extend(question_answers)
                
                trends['daily_participation'].append({
                    'date': date_str,
                    'count': len(answers)
                })
                
                if answers:
                    correct_count = len([a for a in answers if a.is_correct])
                    trends['daily_correct_rate'].append({
                        'date': date_str,
                        'rate': round(correct_count / len(answers) * 100, 2)
                    })
        
        return trends
    
    @staticmethod
    def _generate_recommendations(attention_score, interaction_score, learning_score):
        """生成改进建议"""
        recommendations = []
        
        if attention_score < 60:
            recommendations.append({
                'type': 'attention',
                'level': 'warning',
                'message': '注意力集中度较低，建议改善学习环境，减少干扰因素'
            })
        
        if interaction_score < 60:
            recommendations.append({
                'type': 'interaction',
                'level': 'warning',
                'message': '课堂互动较少，建议积极参与讨论和提问'
            })
        
        if learning_score < 60:
            recommendations.append({
                'type': 'learning',
                'level': 'warning',
                'message': '学习效果有待提升，建议加强课后复习和练习'
            })
        
        if attention_score >= 80 and interaction_score >= 80 and learning_score >= 80:
            recommendations.append({
                'type': 'overall',
                'level': 'excellent',
                'message': '综合表现优秀，继续保持良好的学习状态'
            })
        
        return recommendations