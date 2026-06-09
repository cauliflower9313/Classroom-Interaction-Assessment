"""数据分析工具 - 统计抬头率、互动率等"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from app.models import Student, VideoRecord, AudioRecord


class DataAnalysis:
    @staticmethod
    def get_student_head_up_stats(student_id, days=7):
        """
        获取学生近期抬头率统计
        :param student_id: 学生ID
        :param days: 统计天数
        :return: dict - 统计结果
        """
        # 时间范围
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # 查询数据
        records = VideoRecord.query.filter(
            VideoRecord.student_id == student_id,
            VideoRecord.record_time >= start_date
        ).order_by(VideoRecord.record_time).all()

        if not records:
            return {
                'daily_stats': [],
                'avg_head_up_rate': 0.0,
                'trend': 'stable'
            }

        # 转换为DataFrame
        df = pd.DataFrame([{
            'date': record.record_time.date(),
            'head_up_rate': record.head_up_rate,
            'record_time': record.record_time
        } for record in records])

        # 按天统计
        daily_stats = df.groupby('date').agg({
            'head_up_rate': ['mean', 'count']
        }).round(2)

        daily_list = []
        for date, row in daily_stats.iterrows():
            daily_list.append({
                'date': str(date),
                'avg_head_up_rate': row['head_up_rate']['mean'],
                'record_count': row['head_up_rate']['count']
            })

        # 计算平均抬头率
        avg_head_up_rate = round(df['head_up_rate'].mean(), 2)

        # 分析趋势
        if len(daily_list) >= 2:
            last_two = daily_list[-2:]
            change = last_two[1]['avg_head_up_rate'] - last_two[0]['avg_head_up_rate']

            if change > 5:
                trend = 'up'
            elif change < -5:
                trend = 'down'
            else:
                trend = 'stable'
        else:
            trend = 'stable'

        return {
            'daily_stats': daily_list,
            'avg_head_up_rate': avg_head_up_rate,
            'trend': trend
        }

    @staticmethod
    def get_class_interaction_stats(class_name, days=7):
        """
        获取班级互动率统计
        :param class_name: 班级名称
        :param days: 统计天数
        :return: dict - 统计结果
        """
        # 时间范围
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # 获取班级学生
        students = Student.query.filter_by(class_name=class_name).all()
        student_ids = [s.id for s in students]

        if not student_ids:
            return {
                'avg_head_up_rate': 0.0,
                'avg_question_count': 0.0,
                'student_stats': []
            }

        # 视频记录统计
        video_records = VideoRecord.query.filter(
            VideoRecord.student_id.in_(student_ids),
            VideoRecord.record_time >= start_date
        ).all()

        # 语音记录统计
        audio_records = AudioRecord.query.filter(
            AudioRecord.student_id.in_(student_ids),
            AudioRecord.record_time >= start_date
        ).all()

        # 计算平均抬头率
        if video_records:
            avg_head_up_rate = round(np.mean([r.head_up_rate for r in video_records]), 2)
        else:
            avg_head_up_rate = 0.0

        # 计算平均提问次数
        question_counts = {}
        for record in audio_records:
            if record.is_question:
                question_counts[record.student_id] = question_counts.get(record.student_id, 0) + 1

        if question_counts:
            avg_question_count = round(np.mean(list(question_counts.values())), 2)
        else:
            avg_question_count = 0.0

        # 学生个体统计
        student_stats = []
        for student in students:
            # 该学生抬头率
            s_video = [r for r in video_records if r.student_id == student.id]
            s_head_up_rate = round(np.mean([r.head_up_rate for r in s_video]), 2) if s_video else 0.0

            # 该学生提问次数
            s_questions = question_counts.get(student.id, 0)

            student_stats.append({
                'student_id': student.id,
                'student_name': student.name,
                'head_up_rate': s_head_up_rate,
                'question_count': s_questions
            })

        return {
            'avg_head_up_rate': avg_head_up_rate,
            'avg_question_count': avg_question_count,
            'student_stats': student_stats
        }

    @staticmethod
    def get_overall_interaction_score(days=7):
        """
        获取整体互动评分（0-100）
        :param days: 统计天数
        :return: float - 互动评分
        """
        # 时间范围
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        # 所有视频记录
        video_records = VideoRecord.query.filter(VideoRecord.record_time >= start_date).all()
        # 所有提问记录
        question_records = AudioRecord.query.filter(
            AudioRecord.is_question == True,
            AudioRecord.record_time >= start_date
        ).count()

        if not video_records:
            return 0.0

        # 基础评分：平均抬头率（占60%）
        avg_head_up_rate = np.mean([r.head_up_rate for r in video_records])
        base_score = avg_head_up_rate * 0.6

        # 互动加分：提问次数（占40%，最多加40分）
        student_count = len(set([r.student_id for r in video_records]))
        if student_count > 0:
            question_score = min((question_records / student_count) * 10, 40)
        else:
            question_score = 0.0

        # 总评分
        total_score = round(base_score + question_score, 2)

        return total_score


# 单例实例
data_analyzer = DataAnalysis()