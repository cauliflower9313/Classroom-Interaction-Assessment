/**
 * 教师端互动评估模块
 */

// 评估报告图表实例
let evalHeadUpTrendChart = null;
let evalCorrectRateChart = null;
let evalParticipationChart = null;
let evalErrorRateChart = null;

// 加载评估页面数据（筛选选项）
function loadEvaluationData() {
    // 加载课程列表
    loadEvaluationCourseOptions();
    // 加载班级列表
    loadEvaluationClassOptions();
}

// 加载课程选项
function loadEvaluationCourseOptions() {
    fetch('/teacher/course/list', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const select = document.getElementById('evaluationCourseFilter');
            select.innerHTML = '<option value="">请选择课程</option>';
            result.data.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.course_name;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('加载课程列表失败:', error));
}

// 加载班级选项
function loadEvaluationClassOptions() {
    fetch('/teacher/evaluation/classes', {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const select = document.getElementById('evaluationClassFilter');
            select.innerHTML = '<option value="">请选择班级</option>';
            result.data.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls;
                option.textContent = cls;
                select.appendChild(option);
            });
        }
    })
    .catch(error => console.error('加载班级列表失败:', error));
}

// 评估范围改变事件
function onEvaluationScopeChange() {
    const scope = document.getElementById('evaluationScope').value;
    const courseGroup = document.getElementById('courseFilterGroup');
    const classGroup = document.getElementById('classFilterGroup');
    
    if (scope === 'course') {
        courseGroup.style.display = 'block';
        classGroup.style.display = 'none';
    } else if (scope === 'class') {
        courseGroup.style.display = 'none';
        classGroup.style.display = 'block';
    } else {
        courseGroup.style.display = 'none';
        classGroup.style.display = 'none';
    }
}

// 生成评估报告
function generateEvaluationReport() {
    const scope = document.getElementById('evaluationScope').value;
    const courseId = document.getElementById('evaluationCourseFilter').value;
    const className = document.getElementById('evaluationClassFilter').value;
    
    // 显示加载状态
    const container = document.getElementById('evaluationReportContainer');
    const emptyState = document.getElementById('evaluationEmptyState');
    
    // 构建请求参数
    let url = '/teacher/evaluation/report';
    const params = [];
    if (scope === 'course' && courseId) {
        params.push(`course_id=${courseId}`);
    } else if (scope === 'class' && className) {
        params.push(`class_name=${encodeURIComponent(className)}`);
    }
    if (params.length > 0) {
        url += '?' + params.join('&');
    }
    
    fetch(url, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const data = result.data;
            
            // 显示报告容器
            container.style.display = 'block';
            emptyState.style.display = 'none';
            
            // 更新核心指标
            document.getElementById('evalTotalSessions').textContent = data.total_sessions || 0;
            document.getElementById('evalTotalCourses').textContent = data.total_courses || 0;
            document.getElementById('evalTotalStudents').textContent = data.total_students || 0;
            document.getElementById('evalTotalQuestions').textContent = data.total_questions || 0;
            document.getElementById('evalAvgHeadUpRate').textContent = (data.avg_head_up_rate || 0) + '%';
            document.getElementById('evalAvgCorrectRate').textContent = (data.avg_correct_rate || 0) + '%';
            
            // 渲染图表
            renderEvalCharts(data);

            // 渲染各图表的评估建议
            renderHeadUpTrendSuggestion(data);
            renderCorrectRateSuggestion(data);
            renderParticipationSuggestion(data);
            renderErrorRateSuggestion(data);

            // 渲染学生表现建议
            renderAbnormalStudentsSuggestion(data);
            renderExcellentStudentsSuggestion(data);

            // 渲染表格
            renderAbnormalStudentsTable(data.abnormal_students || []);
            renderExcellentStudentsTable(data.excellent_students || []);

            // 渲染综合教学建议
            renderTeachingSuggestions(data);
        } else {
            alert('生成报告失败：' + result.msg);
        }
    })
    .catch(error => {
        console.error('生成报告失败:', error);
        alert('生成报告失败，请稍后重试');
    });
}

// 渲染评估图表
function renderEvalCharts(data) {
    // 1. 抬头率趋势图
    const headUpCtx = document.getElementById('evalHeadUpTrendChart');
    if (headUpCtx) {
        if (evalHeadUpTrendChart) {
            evalHeadUpTrendChart.destroy();
        }
        
        const trendData = data.head_up_trend || [];
        const labels = trendData.map(item => item.date);
        const values = trendData.map(item => item.rate);
        
        if (labels.length === 0) {
            headUpCtx.style.display = 'none';
        } else {
            headUpCtx.style.display = 'block';
            evalHeadUpTrendChart = new Chart(headUpCtx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '平均抬头率',
                        data: values,
                        borderColor: 'rgba(102, 126, 234, 1)',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return '抬头率: ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { stepSize: 20 },
                            title: { display: true, text: '抬头率 (%)' }
                        },
                        x: {
                            title: { display: true, text: '日期' }
                        }
                    }
                }
            });
        }
    }
    
    // 2. 各课程正确率对比
    const correctRateCtx = document.getElementById('evalCorrectRateChart');
    if (correctRateCtx) {
        if (evalCorrectRateChart) {
            evalCorrectRateChart.destroy();
        }
        
        const courseStats = data.course_correct_rates || [];
        const labels = courseStats.map(item => item.course_name);
        const values = courseStats.map(item => item.correct_rate);
        
        if (labels.length === 0) {
            correctRateCtx.style.display = 'none';
        } else {
            correctRateCtx.style.display = 'block';
            evalCorrectRateChart = new Chart(correctRateCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '正确率',
                        data: values,
                        backgroundColor: 'rgba(40, 167, 69, 0.8)',
                        borderColor: 'rgba(40, 167, 69, 1)',
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
                                    return '正确率: ' + context.parsed.y.toFixed(1) + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { stepSize: 20 },
                            title: { display: true, text: '正确率 (%)' }
                        }
                    }
                }
            });
        }
    }
    
    // 3. 学生参与度分布
    const participationCtx = document.getElementById('evalParticipationChart');
    if (participationCtx) {
        if (evalParticipationChart) {
            evalParticipationChart.destroy();
        }
        
        const participationData = data.participation_distribution || {
            high: 0,
            medium: 0,
            low: 0
        };
        
        evalParticipationChart = new Chart(participationCtx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['高参与度(>80%)', '中参与度(60-80%)', '低参与度(<60%)'],
                datasets: [{
                    data: [participationData.high, participationData.medium, participationData.low],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.8)',
                        'rgba(255, 193, 7, 0.8)',
                        'rgba(220, 53, 69, 0.8)'
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(255, 193, 7, 1)',
                        'rgba(220, 53, 69, 1)'
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
    
    // 4. 题目错误率排行
    const errorRateCtx = document.getElementById('evalErrorRateChart');
    if (errorRateCtx) {
        if (evalErrorRateChart) {
            evalErrorRateChart.destroy();
        }
        
        const difficultQuestions = data.difficult_questions || [];
        // 只显示前5个
        const top5 = difficultQuestions.slice(0, 5);
        const labels = top5.map((item, index) => `题目${index + 1}`);
        const values = top5.map(item => item.error_rate);
        
        if (labels.length === 0) {
            errorRateCtx.style.display = 'none';
        } else {
            errorRateCtx.style.display = 'block';
            evalErrorRateChart = new Chart(errorRateCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '错误率',
                        data: values,
                        backgroundColor: 'rgba(220, 53, 69, 0.8)',
                        borderColor: 'rgba(220, 53, 69, 1)',
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
                                    const question = top5[context.dataIndex];
                                    return `错误率: ${context.parsed.x.toFixed(1)}% (${question.title.substring(0, 20)}...)`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: '错误率 (%)' }
                        }
                    }
                }
            });
        }
    }
}

// 渲染异常学生表格
function renderAbnormalStudentsTable(students) {
    const tbody = document.getElementById('abnormalStudentsTableBody');
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #6c757d;">暂无异常学生数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td>${student.class_name || '-'}</td>
            <td style="color: #dc3545; font-weight: bold;">${student.avg_head_up_rate}%</td>
        </tr>
    `).join('');
}

// 渲染优秀学生表格
function renderExcellentStudentsTable(students) {
    const tbody = document.getElementById('excellentStudentsTableBody');
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d;">暂无优秀学生数据</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td>${student.class_name || '-'}</td>
            <td style="color: #28a745; font-weight: bold;">${student.avg_head_up_rate}%</td>
            <td>${student.correct_rate}%</td>
        </tr>
    `).join('');
}

// 渲染易错题目表格
function renderDifficultQuestionsTable(questions) {
    const tbody = document.getElementById('difficultQuestionsTableBody');
    if (questions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6c757d;">暂无易错题目数据</td></tr>';
        return;
    }
    
    const typeMap = {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'judgment': '判断题',
        'subjective': '主观题'
    };
    
    tbody.innerHTML = questions.map(question => `
        <tr>
            <td title="${question.title}">${question.title.length > 30 ? question.title.substring(0, 30) + '...' : question.title}</td>
            <td>${typeMap[question.type] || question.type}</td>
            <td>${question.category || '-'}</td>
            <td>${question.answer_count}</td>
            <td style="color: #dc3545; font-weight: bold;">${question.error_rate}%</td>
        </tr>
    `).join('');
}

// 渲染抬头率趋势建议
function renderHeadUpTrendSuggestion(data) {
    const container = document.getElementById('headUpTrendSuggestion');
    const trendData = data.head_up_trend || [];

    if (trendData.length === 0) {
        container.innerHTML = '<p><i class="fas fa-info-circle text-info"></i> 暂无抬头率趋势数据，请开始课堂记录以获取分析数据。</p>';
        return;
    }

    // 计算趋势
    const values = trendData.map(item => item.rate);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const avgRate = values.reduce((a, b) => a + b, 0) / values.length;

    let suggestion = '';

    if (avgRate >= 80) {
        suggestion = `<p><i class="fas fa-thumbs-up text-success"></i> <strong>表现优秀！</strong> 学生平均抬头率达到 <strong>${avgRate.toFixed(1)}%</strong>，课堂专注度非常好。`;
        if (lastValue >= firstValue) {
            suggestion += ` 且呈现<span class="text-success">上升趋势</span>，说明您的教学方式越来越吸引学生。`;
        }
        suggestion += ` 请继续保持当前的教学方式。</p>`;
    } else if (avgRate >= 60) {
        suggestion = `<p><i class="fas fa-exclamation-circle text-warning"></i> <strong>需要关注。</strong> 学生平均抬头率为 <strong>${avgRate.toFixed(1)}%</strong>，处于中等水平。`;
        if (lastValue < firstValue) {
            suggestion += ` 近期呈现<span class="text-danger">下降趋势</span>，建议增加课堂互动环节，如提问、小组讨论等。`;
        } else {
            suggestion += ` 建议尝试增加课堂趣味性，提高学生参与度。`;
        }
        suggestion += `</p>`;
    } else {
        suggestion = `<p><i class="fas fa-exclamation-triangle text-danger"></i> <strong>需要改进！</strong> 学生平均抬头率仅为 <strong>${avgRate.toFixed(1)}%</strong>，课堂专注度较低。`;
        suggestion += ` 建议：<br>• 增加课堂互动，如随机提问、课堂小测验<br>• 调整教学内容难度，确保学生能跟上节奏<br>• 关注学生反馈，了解课堂枯燥的原因</p>`;
    }

    container.innerHTML = suggestion;
}

// 渲染课程正确率建议
function renderCorrectRateSuggestion(data) {
    const container = document.getElementById('correctRateSuggestion');
    const courseStats = data.course_correct_rates || [];

    if (courseStats.length === 0) {
        container.innerHTML = '<p><i class="fas fa-info-circle text-info"></i> 暂无课程正确率数据，请发布问题并收集学生答案。</p>';
        return;
    }

    const avgCorrectRate = data.avg_correct_rate || 0;
    const lowRateCourses = courseStats.filter(c => c.correct_rate < 60);
    const highRateCourses = courseStats.filter(c => c.correct_rate >= 80);

    let suggestion = '';

    if (avgCorrectRate >= 80) {
        suggestion = `<p><i class="fas fa-trophy text-success"></i> <strong>教学效果显著！</strong> 学生整体正确率达到 <strong>${avgCorrectRate.toFixed(1)}%</strong>，知识点掌握情况良好。`;
        if (highRateCourses.length > 0) {
            suggestion += `<br><br><span class="text-success"><i class="fas fa-star"></i> 表扬：</span>《${highRateCourses.map(c => c.course_name).join('》、《')}》等课程教学效果突出。`;
        }
        suggestion += `</p>`;
    } else if (avgCorrectRate >= 60) {
        suggestion = `<p><i class="fas fa-info-circle text-warning"></i> <strong>教学效果一般。</strong> 学生整体正确率为 <strong>${avgCorrectRate.toFixed(1)}%</strong>。`;
        if (lowRateCourses.length > 0) {
            suggestion += `<br><br><span class="text-danger"><i class="fas fa-exclamation-triangle"></i> 需要关注：</span>《${lowRateCourses.map(c => c.course_name).join('》、《')}》等课程正确率偏低，建议加强重点知识讲解。`;
        }
        suggestion += `</p>`;
    } else {
        suggestion = `<p><i class="fas fa-exclamation-triangle text-danger"></i> <strong>教学效果需提升。</strong> 学生整体正确率仅为 <strong>${avgCorrectRate.toFixed(1)}%</strong>。<br><br>`;
        suggestion += `<span class="text-danger"><i class="fas fa-lightbulb"></i> 建议：</span><br>`;
        suggestion += `• 复习基础知识，确保学生掌握前置知识点<br>`;
        suggestion += `• 调整教学进度，给予学生更多消化时间<br>`;
        suggestion += `• 增加课后辅导，帮助理解困难的学生<br>`;
        if (lowRateCourses.length > 0) {
            suggestion += `• 重点关注：《${lowRateCourses.map(c => c.course_name).join('》、《')}》`;
        }
        suggestion += `</p>`;
    }

    container.innerHTML = suggestion;
}

// 渲染学生参与度建议
function renderParticipationSuggestion(data) {
    const container = document.getElementById('participationSuggestion');
    const participation = data.participation_distribution || { high: 0, medium: 0, low: 0 };
    const totalStudents = participation.high + participation.medium + participation.low;

    if (totalStudents === 0) {
        container.innerHTML = '<p><i class="fas fa-info-circle text-info"></i> 暂无学生参与度数据，请开始课堂记录。</p>';
        return;
    }

    const highRate = (participation.high / totalStudents * 100).toFixed(1);
    const mediumRate = (participation.medium / totalStudents * 100).toFixed(1);
    const lowRate = (participation.low / totalStudents * 100).toFixed(1);

    let suggestion = `<p><strong>参与度分布：</strong><br>`;
    suggestion += `<span class="text-success"><i class="fas fa-smile"></i> 高参与度：${participation.high}人 (${highRate}%)</span><br>`;
    suggestion += `<span class="text-warning"><i class="fas fa-meh"></i> 中参与度：${participation.medium}人 (${mediumRate}%)</span><br>`;
    suggestion += `<span class="text-danger"><i class="fas fa-frown"></i> 低参与度：${participation.low}人 (${lowRate}%)</span></p>`;

    if (participation.high / totalStudents >= 0.6) {
        suggestion += `<p><i class="fas fa-thumbs-up text-success"></i> <strong>表扬！</strong> 超过60%的学生保持高参与度，课堂氛围良好。请继续保持！</p>`;
    } else if (participation.low / totalStudents >= 0.3) {
        suggestion += `<p><i class="fas fa-exclamation-triangle text-danger"></i> <strong>警告！</strong> 超过30%的学生参与度较低。建议：<br>`;
        suggestion += `• 采用分组讨论、角色扮演等互动教学方式<br>`;
        suggestion += `• 设置课堂奖励机制，激励学生参与<br>`;
        suggestion += `• 关注低参与度学生，了解具体原因</p>`;
    } else {
        suggestion += `<p><i class="fas fa-info-circle text-info"></i> 学生参与度分布较为均衡。建议关注中参与度学生，通过适当引导提升他们的参与积极性。</p>`;
    }

    container.innerHTML = suggestion;
}

// 渲染易错题目建议
function renderErrorRateSuggestion(data) {
    const container = document.getElementById('errorRateSuggestion');
    const questions = data.difficult_questions || [];

    if (questions.length === 0) {
        container.innerHTML = '<p><i class="fas fa-check-circle text-success"></i> <strong>好消息！</strong> 暂无错误率超过50%的题目，学生整体掌握情况良好。请继续保持！</p>';
        return;
    }

    const topQuestions = questions.slice(0, 3);
    let suggestion = `<p><i class="fas fa-exclamation-triangle text-warning"></i> <strong>发现 ${questions.length} 道易错题目</strong>，建议重点讲解：</p>`;
    suggestion += `<ul style="padding-left: 20px; margin-top: 10px;">`;
    topQuestions.forEach((q, index) => {
        suggestion += `<li style="margin-bottom: 8px;"><strong>题目${index + 1}：</strong>${q.title.substring(0, 30)}${q.title.length > 30 ? '...' : ''} <span class="text-danger">(错误率 ${q.error_rate}%)</span></li>`;
    });
    if (questions.length > 3) {
        suggestion += `<li style="color: #6c757d;">...还有 ${questions.length - 3} 道题目</li>`;
    }
    suggestion += `</ul>`;
    suggestion += `<p style="margin-top: 15px;"><i class="fas fa-lightbulb text-primary"></i> <strong>教学建议：</strong><br>`;
    suggestion += `• 在课堂上重点讲解这些易错知识点<br>`;
    suggestion += `• 分析学生错误原因，是否是概念理解偏差<br>`;
    suggestion += `• 设计针对性练习，巩固薄弱环节</p>`;

    container.innerHTML = suggestion;
}

// 渲染需关注学生建议
function renderAbnormalStudentsSuggestion(data) {
    const container = document.getElementById('abnormalStudentsSuggestion');
    const students = data.abnormal_students || [];

    if (students.length === 0) {
        container.innerHTML = '<p><i class="fas fa-check-circle text-success"></i> <strong>好消息！</strong> 所有学生抬头率均在60%以上，没有需要特别关注的异常学生。</p>';
        return;
    }

    let suggestion = `<p><i class="fas fa-exclamation-triangle text-warning"></i> 发现 <strong>${students.length}名</strong> 学生需要关注，他们的课堂专注度较低。</p>`;
    suggestion += `<p style="margin-top: 10px;"><i class="fas fa-user-md text-primary"></i> <strong>建议措施：</strong><br>`;
    suggestion += `• 私下与这些学生沟通，了解是否遇到困难<br>`;
    suggestion += `• 关注他们的学习状态，提供必要帮助<br>`;
    suggestion += `• 适当调整教学方式，增加课堂吸引力</p>`;

    container.innerHTML = suggestion;
}

// 渲染优秀学生建议
function renderExcellentStudentsSuggestion(data) {
    const container = document.getElementById('excellentStudentsSuggestion');
    const students = data.excellent_students || [];

    if (students.length === 0) {
        container.innerHTML = '<p><i class="fas fa-info-circle text-info"></i> 暂无抬头率超过90%的学生，鼓励学生更加专注课堂。</p>';
        return;
    }

    let suggestion = `<p><i class="fas fa-trophy text-success"></i> <strong>表扬！</strong> 有 <strong>${students.length}名</strong> 学生表现优秀，课堂专注度超过90%。</p>`;

    if (students.length > 0) {
        suggestion += `<p style="margin-top: 10px;"><i class="fas fa-star text-warning"></i> <strong>优秀学生代表：</strong></p>`;
        suggestion += `<ul style="padding-left: 20px;">`;
        students.slice(0, 3).forEach(s => {
            suggestion += `<li>${s.name}（${s.student_id}）- 抬头率 ${s.avg_head_up_rate}%</li>`;
        });
        if (students.length > 3) {
            suggestion += `<li style="color: #6c757d;">...还有 ${students.length - 3} 名优秀学生</li>`;
        }
        suggestion += `</ul>`;
    }

    suggestion += `<p style="margin-top: 10px;"><i class="fas fa-lightbulb text-primary"></i> <strong>建议：</strong> 可以邀请这些学生分享学习经验，带动班级整体学习氛围。</p>`;

    container.innerHTML = suggestion;
}

// 渲染综合教学建议
function renderTeachingSuggestions(data) {
    const container = document.getElementById('teachingSuggestions');
    const suggestions = [];

    const avgHeadUpRate = data.avg_head_up_rate || 0;
    const avgCorrectRate = data.avg_correct_rate || 0;
    const abnormalCount = (data.abnormal_students || []).length;
    const difficultCount = (data.difficult_questions || []).length;

    // 综合评估
    let overallScore = 0;
    if (avgHeadUpRate >= 80) overallScore += 2;
    else if (avgHeadUpRate >= 60) overallScore += 1;

    if (avgCorrectRate >= 80) overallScore += 2;
    else if (avgCorrectRate >= 60) overallScore += 1;

    if (overallScore >= 4) {
        suggestions.push('<p><i class="fas fa-award" style="color: #ffd700;"></i> <strong>综合评价：优秀</strong> 您的教学效果出色，学生专注度和学习效果都很好，请继续保持！</p>');
    } else if (overallScore >= 2) {
        suggestions.push('<p><i class="fas fa-thumbs-up" style="color: #90ee90;"></i> <strong>综合评价：良好</strong> 教学效果整体不错，仍有提升空间，请参考上述具体建议进行改进。</p>');
    } else {
        suggestions.push('<p><i class="fas fa-hand-holding-heart" style="color: #ffa07a;"></i> <strong>综合评价：需改进</strong> 教学效果有待提升，建议重点关注学生反馈，调整教学策略。</p>');
    }

    // 根据数据生成具体建议
    if (avgHeadUpRate >= 80) {
        suggestions.push('<p><i class="fas fa-check-circle"></i> <strong>课堂专注度：</strong>学生平均抬头率达到' + avgHeadUpRate + '%，说明课堂吸引力较强，请继续保持。</p>');
    } else if (avgHeadUpRate >= 60) {
        suggestions.push('<p><i class="fas fa-info-circle"></i> <strong>课堂专注度：</strong>学生平均抬头率为' + avgHeadUpRate + '%，建议增加互动环节，提高学生参与度。</p>');
    } else {
        suggestions.push('<p><i class="fas fa-exclamation-circle"></i> <strong>课堂专注度：</strong>学生平均抬头率仅为' + avgHeadUpRate + '%，建议调整教学方式，增加课堂趣味性。</p>');
    }

    if (avgCorrectRate >= 80) {
        suggestions.push('<p><i class="fas fa-check-circle"></i> <strong>学习效果：</strong>学生答题正确率达到' + avgCorrectRate + '%，知识点掌握情况较好。</p>');
    } else if (avgCorrectRate >= 60) {
        suggestions.push('<p><i class="fas fa-info-circle"></i> <strong>学习效果：</strong>学生答题正确率为' + avgCorrectRate + '%，建议加强重点知识讲解。</p>');
    } else {
        suggestions.push('<p><i class="fas fa-exclamation-circle"></i> <strong>学习效果：</strong>学生答题正确率仅为' + avgCorrectRate + '%，建议复习基础知识，调整教学进度。</p>');
    }

    if (abnormalCount > 0) {
        suggestions.push('<p><i class="fas fa-user-times"></i> <strong>关注异常学生：</strong>有' + abnormalCount + '名学生抬头率低于60%，建议单独沟通了解原因。</p>');
    }

    if (difficultCount > 0) {
        suggestions.push('<p><i class="fas fa-question-circle"></i> <strong>重点讲解易错题：</strong>有' + difficultCount + '道题目错误率超过50%，建议课堂上重点讲解。</p>');
    }

    if (suggestions.length === 0) {
        suggestions.push('<p>暂无具体建议，请继续积累教学数据。</p>');
    }

    container.innerHTML = suggestions.join('');
}

// 将函数绑定到全局作用域
if (typeof window !== 'undefined') {
    window.loadEvaluationData = loadEvaluationData;
    window.loadEvaluationCourseOptions = loadEvaluationCourseOptions;
    window.loadEvaluationClassOptions = loadEvaluationClassOptions;
    window.onEvaluationScopeChange = onEvaluationScopeChange;
    window.generateEvaluationReport = generateEvaluationReport;
    window.renderEvalCharts = renderEvalCharts;
    window.renderAbnormalStudentsTable = renderAbnormalStudentsTable;
    window.renderExcellentStudentsTable = renderExcellentStudentsTable;
    window.renderDifficultQuestionsTable = renderDifficultQuestionsTable;
    window.renderTeachingSuggestions = renderTeachingSuggestions;
    window.renderHeadUpTrendSuggestion = renderHeadUpTrendSuggestion;
    window.renderCorrectRateSuggestion = renderCorrectRateSuggestion;
    window.renderParticipationSuggestion = renderParticipationSuggestion;
    window.renderErrorRateSuggestion = renderErrorRateSuggestion;
    window.renderAbnormalStudentsSuggestion = renderAbnormalStudentsSuggestion;
    window.renderExcellentStudentsSuggestion = renderExcellentStudentsSuggestion;
}
