/**
 * 教师端仪表盘模块
 */

// 加载仪表盘数据
function loadDashboardData() {
    // 显示加载状态
    const statValues = document.querySelectorAll('.stat-value');
    statValues.forEach(el => {
        el.style.opacity = '0.5';
    });
    
    fetch('/teacher/dashboard/data', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const data = result.data;
            // 8个统计数据
            document.getElementById('totalStudents').textContent = data.total_students || 0;
            document.getElementById('totalClasses').textContent = data.total_classes || 0;
            document.getElementById('avgHeadUpRate').textContent = (data.avg_head_up_rate || 0) + '%';
            document.getElementById('totalQuestions').textContent = data.total_questions || 0;
            document.getElementById('avgCorrectRate').textContent = (data.avg_correct_rate || 0) + '%';
            document.getElementById('totalAnswers').textContent = data.total_answers || 0;
            document.getElementById('totalCourses').textContent = data.total_courses || 0;
            document.getElementById('totalMajors').textContent = data.total_majors || 0;
            
            // 恢复透明度
            statValues.forEach(el => {
                el.style.opacity = '1';
            });
            
            // 初始化图表（使用真实数据）
            initDashboardCharts(data);
        }
    })
    .catch(error => {
        console.error('加载仪表盘数据失败:', error);
        // 恢复透明度
        statValues.forEach(el => {
            el.style.opacity = '1';
        });
        // 即使数据加载失败，也初始化图表（使用默认数据）
        initDashboardCharts();
    });
}

// 初始化仪表盘图表
function initDashboardCharts(data) {
    // 1. 答题趋势图表（只显示有答题的日期）
    const answerTrendCtx = document.getElementById('answerTrendChart');
    if (answerTrendCtx) {
        const ctx = answerTrendCtx.getContext('2d');
        if (window.answerTrendChart && typeof window.answerTrendChart.destroy === 'function') {
            window.answerTrendChart.destroy();
        }
        
        let trendLabels = [];
        let trendData = [];
        
        // 只筛选出有答题的日期
        if (data && data.answer_trend && data.answer_trend.length > 0) {
            const filteredTrend = data.answer_trend.filter(item => item.count > 0);
            if (filteredTrend.length > 0) {
                trendLabels = filteredTrend.map(item => item.date);
                trendData = filteredTrend.map(item => item.count);
            }
        }
        
        // 如果没有数据，显示提示信息
        if (trendLabels.length === 0) {
            answerTrendCtx.style.display = 'none';
            const parent = answerTrendCtx.parentElement;
            let noDataMsg = parent.querySelector('.no-data-message');
            if (!noDataMsg) {
                noDataMsg = document.createElement('div');
                noDataMsg.className = 'no-data-message';
                noDataMsg.style.cssText = 'text-align: center; padding: 50px; color: #999; font-size: 14px;';
                noDataMsg.textContent = '暂无答题数据';
                parent.appendChild(noDataMsg);
            }
            noDataMsg.style.display = 'block';
        } else {
            answerTrendCtx.style.display = 'block';
            const parent = answerTrendCtx.parentElement;
            const noDataMsg = parent.querySelector('.no-data-message');
            if (noDataMsg) {
                noDataMsg.style.display = 'none';
            }
        }
        
        window.answerTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: '答题数量',
                    data: trendData,
                    borderColor: 'rgba(0, 123, 255, 1)',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '答题数量' },
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // 2. 问题类型分布图表
    const questionTypeCtx = document.getElementById('questionTypeChart');
    if (questionTypeCtx) {
        const ctx = questionTypeCtx.getContext('2d');
        if (window.questionTypeChart && typeof window.questionTypeChart.destroy === 'function') {
            window.questionTypeChart.destroy();
        }

        const typeMap = {
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'judgment': '判断题',
            'subjective': '主观题'
        };

        let typeLabels = ['单选题', '多选题', '判断题', '主观题'];
        let typeData = [0, 0, 0, 0];

        if (data && data.question_type_stats && data.question_type_stats.length > 0) {
            typeLabels = data.question_type_stats.map(item => typeMap[item.type] || item.type);
            typeData = data.question_type_stats.map(item => item.count);
        }

        window.questionTypeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: typeLabels,
                datasets: [{
                    data: typeData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // 3. 知识点回答准确率图表
    const categoryAccuracyCtx = document.getElementById('categoryAccuracyChart');
    if (categoryAccuracyCtx) {
        const ctx = categoryAccuracyCtx.getContext('2d');
        if (window.categoryAccuracyChart && typeof window.categoryAccuracyChart.destroy === 'function') {
            window.categoryAccuracyChart.destroy();
        }

        let categoryLabels = ['暂无数据'];
        let accuracyData = [0];

        if (data && data.category_accuracy_stats && data.category_accuracy_stats.length > 0) {
            categoryLabels = data.category_accuracy_stats.map(item => item.category);
            accuracyData = data.category_accuracy_stats.map(item => item.accuracy);
        }

        window.categoryAccuracyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: categoryLabels,
                datasets: [{
                    label: '准确率',
                    data: accuracyData,
                    backgroundColor: 'rgba(156, 39, 176, 0.8)',
                    borderColor: 'rgba(156, 39, 176, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '准确率: ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: '准确率(%)' },
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // 4. 保存各类统计数据到全局变量（供弹窗使用）
    if (data && data.class_stats) {
        window.classDistributionData = data.class_stats;
    }
    if (data && data.class_head_up_rates) {
        window.classHeadUpRates = data.class_head_up_rates;
    }
    if (data && data.class_correct_rates) {
        window.classCorrectRates = data.class_correct_rates;
    }
    if (data && data.major_stats) {
        window.majorDistributionData = data.major_stats;
    }
    if (data && data.question_type_stats) {
        window.questionTypeStats = data.question_type_stats;
    }
    if (data && data.course_question_stats) {
        window.courseQuestionStats = data.course_question_stats;
    }
    if (data && data.category_accuracy_stats) {
        window.categoryAccuracyStats = data.category_accuracy_stats;
    }
    if (data && data.question_type_accuracy) {
        window.questionTypeAccuracy = data.question_type_accuracy;
    }

    // 4. 课程参与度分布图表（横向柱状图）
    const courseParticipationCtx = document.getElementById('courseParticipationChart');
    if (courseParticipationCtx) {
        const ctx = courseParticipationCtx.getContext('2d');
        if (window.courseParticipationChart && typeof window.courseParticipationChart.destroy === 'function') {
            window.courseParticipationChart.destroy();
        }

        let courseLabels = ['暂无数据'];
        let courseData = [0];

        if (data && data.course_question_stats && data.course_question_stats.length > 0) {
            // 按识别提问数排序，只显示前10个
            const sortedStats = [...data.course_question_stats].sort((a, b) => b.question_count - a.question_count).slice(0, 10);
            courseLabels = sortedStats.map(item => item.course_name);
            courseData = sortedStats.map(item => item.question_count);
        }

        window.courseParticipationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: courseLabels,
                datasets: [{
                    label: '识别提问数量',
                    data: courseData,
                    backgroundColor: 'rgba(255, 152, 0, 0.8)',
                    borderColor: 'rgba(255, 152, 0, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '识别提问数: ' + context.parsed.x;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: { display: true, text: '识别提问数量' },
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return Number.isInteger(value) ? value : '';
                            }
                        }
                    }
                }
            }
        });
    }

    // 5. 问题类型正确率图表
    const questionTypeAccuracyCtx = document.getElementById('questionTypeAccuracyChart');
    if (questionTypeAccuracyCtx) {
        const ctx = questionTypeAccuracyCtx.getContext('2d');
        if (window.questionTypeAccuracyChart && typeof window.questionTypeAccuracyChart.destroy === 'function') {
            window.questionTypeAccuracyChart.destroy();
        }

        const typeMap = {
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'judgment': '判断题',
            'subjective': '主观题'
        };

        let typeLabels = ['暂无数据'];
        let typeAccuracy = [0];

        if (data && data.question_type_accuracy && data.question_type_accuracy.length > 0) {
            typeLabels = data.question_type_accuracy.map(item => typeMap[item.type] || item.type);
            typeAccuracy = data.question_type_accuracy.map(item => item.accuracy);
        }

        window.questionTypeAccuracyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: typeLabels,
                datasets: [{
                    label: '正确率',
                    data: typeAccuracy,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '正确率: ' + context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: { display: true, text: '正确率(%)' },
                        ticks: {
                            stepSize: 20,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // 6. 班级学生分布图表（如果存在canvas则渲染，否则只保存数据）
    const classDistributionCtx = document.getElementById('classDistributionChart');
    if (classDistributionCtx) {
        const ctx = classDistributionCtx.getContext('2d');
        if (window.classDistributionChart && typeof window.classDistributionChart.destroy === 'function') {
            window.classDistributionChart.destroy();
        }
        
        let classLabels = ['暂无数据'];
        let classData = [0];
        
        if (data && data.class_stats && data.class_stats.length > 0) {
            classLabels = data.class_stats.map(item => item.class_name);
            classData = data.class_stats.map(item => item.student_count);
        }
        
        window.classDistributionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: classLabels,
                datasets: [{
                    label: '学生人数',
                    data: classData,
                    backgroundColor: 'rgba(40, 167, 69, 0.8)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: '学生人数' }
                    }
                }
            }
        });
    }
    
    // 4. 专业学生分布图表
    const majorDistributionCtx = document.getElementById('majorDistributionChart');
    if (majorDistributionCtx) {
        const ctx = majorDistributionCtx.getContext('2d');
        if (window.majorDistributionChart && typeof window.majorDistributionChart.destroy === 'function') {
            window.majorDistributionChart.destroy();
        }
        
        let majorLabels = ['暂无数据'];
        let majorData = [0];
        
        if (data && data.major_stats && data.major_stats.length > 0) {
            majorLabels = data.major_stats.map(item => item.major_name);
            majorData = data.major_stats.map(item => item.student_count);
        }
        
        window.majorDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: majorLabels,
                datasets: [{
                    data: majorData,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)',
                        'rgba(255, 159, 64, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

// 将函数绑定到全局作用域
if (typeof window !== 'undefined') {
    window.loadDashboardData = loadDashboardData;
    window.initDashboardCharts = initDashboardCharts;
}
