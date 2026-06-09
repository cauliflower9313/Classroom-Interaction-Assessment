/**
 * 教师端记录查询模块 - 主界面
 */

// 当前查询的学生数据缓存
let currentStudentRecords = [];

// 加载课程列表到下拉框
window.loadCourseFilterOptions = async function() {
    const courseSelect = document.getElementById('studentRecordCourseFilter');
    if (!courseSelect) return;
    
    try {
        const response = await fetch('/teacher/course/list', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.code === 200 && result.data) {
            // 保存当前选中的值
            const currentValue = courseSelect.value;
            
            // 清空下拉框，保留"全部课程"选项
            courseSelect.innerHTML = '<option value="">全部课程</option>';
            
            // 添加课程选项
            result.data.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.course_name;
                courseSelect.appendChild(option);
            });
            
            // 恢复之前选中的值（如果还存在）
            if (currentValue) {
                courseSelect.value = currentValue;
            }
            
            console.log('课程列表加载完成:', result.data.length, '门课程');
        }
    } catch (error) {
        console.error('加载课程列表失败:', error);
    }
};

// 切换记录查询标签页
window.switchRecordTab = function(tabName, evt) {
    if (evt) evt.preventDefault();
    
    // 隐藏所有标签内容
    document.querySelectorAll('.record-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 显示选中的标签内容
    const targetTab = document.getElementById(`${tabName}-record-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('switchRecordTab')) {
            btn.classList.remove('active');
        }
    });
    
    // 激活当前标签按钮
    const activeBtn = document.querySelector(`.tab-btn[onclick*="switchRecordTab('${tabName}'"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 加载对应标签页的数据
    if (tabName === 'video') {
        loadVideoRecords();
    } else if (tabName === 'audio') {
        loadAudioRecords();
    } else if (tabName === 'answer') {
        loadAnswerRecords();
    }
}

// 加载视频记录
function loadVideoRecords() {
    console.log('加载视频记录...');
}

// 加载音频记录
function loadAudioRecords() {
    console.log('加载音频记录...');
}

// 加载答题记录
function loadAnswerRecords() {
    console.log('加载答题记录...');
}

// ==================== 学生课程记录查询功能 ====================

// 查询学生课程记录
window.searchStudentRecords = async function() {
    const studentId = document.getElementById('studentRecordSearchId')?.value.trim();
    const courseId = document.getElementById('studentRecordCourseFilter')?.value;
    
    if (!studentId) {
        alert('请输入学生学号');
        return;
    }
    
    console.log('查询学生课程记录:', studentId, '课程筛选:', courseId || '全部');
    
    // 显示加载状态
    const emptyDiv = document.getElementById('studentRecordEmpty');
    const overviewDiv = document.getElementById('studentRecordOverview');
    
    if (emptyDiv) emptyDiv.style.display = 'none';
    // 显示加载状态，但不覆盖 innerHTML
    if (overviewDiv) {
        overviewDiv.style.display = 'block';
        // 创建一个临时的加载提示元素
        let loadingDiv = document.getElementById('studentRecordLoading');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'studentRecordLoading';
            loadingDiv.style.cssText = 'text-align: center; padding: 40px;';
            loadingDiv.innerHTML = `
                <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: var(--primary-color);"></i>
                <p style="margin-top: 16px; color: #6c757d;">查询中...</p>
            `;
            // 插入到 overviewDiv 的第一个子元素位置
            overviewDiv.insertBefore(loadingDiv, overviewDiv.firstChild);
        }
        loadingDiv.style.display = 'block';
        // 隐藏其他内容
        const panels = overviewDiv.querySelectorAll('.panel');
        panels.forEach(panel => panel.style.display = 'none');
    }
    
    try {
        // 构建URL，如果选择了课程则添加筛选参数
        let url = `/teacher/student/${studentId}/course-records`;
        if (courseId) {
            url += `?course_id=${courseId}`;
        }
        
        const response = await fetch(url, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            currentStudentRecords = result.data;
            renderStudentCourseRecords(result.data, courseId);
        } else {
            alert('查询失败: ' + result.msg);
            if (emptyDiv) emptyDiv.style.display = 'block';
            if (overviewDiv) overviewDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('查询失败:', error);
        alert('网络错误，请重试');
        if (emptyDiv) emptyDiv.style.display = 'block';
        if (overviewDiv) overviewDiv.style.display = 'none';
    }
}

// 重置查询
window.resetStudentRecordSearch = function() {
    const searchInput = document.getElementById('studentRecordSearchId');
    if (searchInput) searchInput.value = '';
    
    const emptyDiv = document.getElementById('studentRecordEmpty');
    const overviewDiv = document.getElementById('studentRecordOverview');
    
    if (emptyDiv) emptyDiv.style.display = 'block';
    if (overviewDiv) overviewDiv.style.display = 'none';
    
    currentStudentRecords = [];
}

// 渲染学生课程记录
function renderStudentCourseRecords(data, filterCourseId = null) {
    let { student_info, course_records, statistics } = data;
    
    // 如果指定了课程筛选，过滤数据
    if (filterCourseId) {
        course_records = course_records.filter(r => r.course_id == filterCourseId);
        // 重新计算统计数据
        if (course_records.length > 0) {
            const totalHeadUpRates = course_records.map(r => r.head_up_rate).filter(r => r > 0);
            const totalCorrectRates = course_records.map(r => r.correct_rate).filter(r => r > 0);
            const totalQuestions = course_records.reduce((sum, r) => sum + (r.audio_question_count || 0), 0);
            const abnormalCount = course_records.filter(r => r.head_up_rate < 30).length;
            
            statistics = {
                total_courses: course_records.length,
                avg_head_up_rate: totalHeadUpRates.length > 0 ? totalHeadUpRates.reduce((a, b) => a + b, 0) / totalHeadUpRates.length : 0,
                avg_correct_rate: totalCorrectRates.length > 0 ? totalCorrectRates.reduce((a, b) => a + b, 0) / totalCorrectRates.length : 0,
                total_questions: totalQuestions,
                abnormal_count: abnormalCount
            };
        } else {
            statistics = {
                total_courses: 0,
                avg_head_up_rate: 0,
                avg_correct_rate: 0,
                total_questions: 0,
                abnormal_count: 0
            };
        }
    }
    
    // 先显示总览区域
    const overviewDiv = document.getElementById('studentRecordOverview');
    if (overviewDiv) {
        overviewDiv.style.display = 'block';
        // 隐藏加载提示
        const loadingDiv = document.getElementById('studentRecordLoading');
        if (loadingDiv) loadingDiv.style.display = 'none';
        // 显示内容面板
        const panels = overviewDiv.querySelectorAll('.panel');
        panels.forEach(panel => panel.style.display = 'block');
    }
    
    // 更新总览统计
    const studentNameEl = document.getElementById('overviewStudentName');
    const courseCountEl = document.getElementById('overviewCourseCount');
    const avgHeadUpEl = document.getElementById('overviewAvgHeadUpRate');
    const avgCorrectEl = document.getElementById('overviewAvgCorrectRate');
    const totalQuestionsEl = document.getElementById('overviewTotalQuestions');
    const abnormalCountEl = document.getElementById('overviewAbnormalCount');
    
    if (studentNameEl) studentNameEl.textContent = student_info?.name || '-';
    if (courseCountEl) courseCountEl.textContent = statistics?.total_courses || 0;
    if (avgHeadUpEl) avgHeadUpEl.textContent = (statistics?.avg_head_up_rate || 0).toFixed(1) + '%';
    if (avgCorrectEl) avgCorrectEl.textContent = (statistics?.avg_correct_rate || 0).toFixed(1) + '%';
    if (totalQuestionsEl) totalQuestionsEl.textContent = statistics?.total_questions || 0;
    if (abnormalCountEl) abnormalCountEl.textContent = statistics?.abnormal_count || 0;
    
    // 渲染课程记录表格
    const tbody = document.getElementById('studentCourseRecordTableBody');
    if (tbody) {
        if (course_records.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                        暂无课程记录
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = course_records.map(record => {
                const statusClass = record.status === 'completed' ? 'success' : 'warning';
                const statusText = record.status === 'completed' ? '已完成' : '进行中';
                
                return `
                    <tr>
                        <td>${record.course_name}</td>
                        <td>${record.session_time}</td>
                        <td>${record.head_up_rate?.toFixed(1) || 0}%</td>
                        <td>${record.answered_questions || 0}/${record.total_questions || 0}</td>
                        <td>${record.correct_rate?.toFixed(1) || 0}%</td>
                        <td>${record.audio_question_count || 0}</td>
                        <td><span class="badge badge-${statusClass}">${statusText}</span></td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewStudentCourseRecordDetail(${record.record_id})">
                                <i class="fas fa-eye"></i> 详情
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
    
    // 隐藏空状态提示
    const emptyDiv = document.getElementById('studentRecordEmpty');
    if (emptyDiv) {
        emptyDiv.style.display = 'none';
    }
}

// 查看学生课程记录详情
window.viewStudentCourseRecordDetail = async function(recordId) {
    const studentId = document.getElementById('studentRecordSearchId')?.value.trim();
    if (!studentId) return;
    
    try {
        const response = await fetch(`/teacher/student/${studentId}/record/${recordId}/detail`, {
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            showStudentCourseRecordDetailModal(result.data);
        } else {
            alert('获取详情失败: ' + result.msg);
        }
    } catch (error) {
        console.error('获取详情失败:', error);
        alert('网络错误，请重试');
    }
}

// 显示学生课程记录详情弹窗
function showStudentCourseRecordDetailModal(data) {
    const modal = document.getElementById('studentCourseRecordDetailModal');
    if (!modal) return;
    
    // 设置标题和概览信息
    document.getElementById('studentCourseRecordDetailTitle').textContent = 
        `${data.student_name} - ${data.course_name} 课程记录`;
    document.getElementById('detailCourseName').textContent = data.course_name;
    document.getElementById('detailSessionTime').textContent = data.session_time;
    document.getElementById('detailHeadUpRate').textContent = (data.head_up_rate || 0).toFixed(1) + '%';
    document.getElementById('detailAnswerStats').textContent = 
        `${data.answered_count || 0}/${data.total_questions || 0}`;
    document.getElementById('detailCorrectRate').textContent = (data.correct_rate || 0).toFixed(1) + '%';
    document.getElementById('detailQuestionCount').textContent = data.audio_question_count || 0;
    
    // 渲染视频抬头记录
    const videoDiv = document.getElementById('detailVideoRecords');
    if (videoDiv) {
        if (data.video_records && data.video_records.length > 0) {
            videoDiv.innerHTML = `
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>抬头次数</th>
                            <th>低头次数</th>
                            <th>抬头率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.video_records.map(v => `
                            <tr>
                                <td>${v.record_time}</td>
                                <td>${v.head_up_count}</td>
                                <td>${v.head_down_count}</td>
                                <td>${v.head_up_rate?.toFixed(1) || 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            videoDiv.innerHTML = '<p style="color: #6c757d; text-align: center; margin: 0;">暂无视频抬头记录</p>';
        }
    }
    
    // 渲染语音提问记录
    const audioDiv = document.getElementById('detailAudioRecords');
    if (audioDiv) {
        if (data.audio_records && data.audio_records.length > 0) {
            audioDiv.innerHTML = `
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>时间</th>
                            <th>内容</th>
                            <th>类型</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.audio_records.map(a => `
                            <tr>
                                <td>${a.record_time}</td>
                                <td>${a.content}</td>
                                <td><span class="badge badge-${a.is_question ? 'success' : 'secondary'}">${a.is_question ? '提问' : '陈述'}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            audioDiv.innerHTML = '<p style="color: #6c757d; text-align: center; margin: 0;">暂无语音提问记录</p>';
        }
    }
    
    // 渲染答题记录
    const answerDiv = document.getElementById('detailAnswerRecords');
    if (answerDiv) {
        if (data.answer_records && data.answer_records.length > 0) {
            answerDiv.innerHTML = `
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>问题</th>
                            <th>答案</th>
                            <th>状态</th>
                            <th>得分</th>
                            <th>提交时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.answer_records.map(a => `
                            <tr>
                                <td>${a.question_title}</td>
                                <td>${a.answer}</td>
                                <td><span class="badge badge-${a.is_correct ? 'success' : 'danger'}">${a.is_correct ? '正确' : '错误'}</span></td>
                                <td>${a.score}</td>
                                <td>${a.submit_time}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            answerDiv.innerHTML = '<p style="color: #6c757d; text-align: center; margin: 0;">暂无答题记录</p>';
        }
    }
    
    modal.style.display = 'flex';
}

// 关闭学生课程记录详情弹窗
window.closeStudentCourseRecordDetailModal = function() {
    const modal = document.getElementById('studentCourseRecordDetailModal');
    if (modal) modal.style.display = 'none';
}

// ==================== 原有功能保留 ====================

// 加载学生课堂记录
function loadStudentRecords() {
    console.log('开始加载学生课堂记录...');
    const recordContainer = document.getElementById('studentRecordsContainer');
    if (!recordContainer) {
        console.error('容器元素不存在');
        return;
    }
    
    recordContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 15px;"></i>
            <p>加载中...</p>
        </div>
    `;
    
    fetch('/teacher/records/student-records', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('响应不是JSON格式，可能需要重新登录');
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            renderStudentRecords(result.data);
        } else {
            recordContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>加载失败：${result.message}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        if (error.message.includes('响应不是JSON格式')) {
            window.location.href = '/teacher/login';
        } else {
            recordContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>网络错误，请重试</p>
                </div>
            `;
        }
    });
}

// 渲染学生课堂记录
function renderStudentRecords(records) {
    const recordContainer = document.getElementById('studentRecordsContainer');
    const totalRecordsElement = document.getElementById('totalStudentRecords');
    
    if (totalRecordsElement) {
        totalRecordsElement.textContent = records.length;
    }
    
    if (!recordContainer) return;
    
    if (records.length === 0) {
        recordContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <i class="fas fa-user" style="font-size: 48px; color: var(--primary-color);"></i>
                    <p>暂无学生课堂记录</p>
                </div>
            </div>
        `;
        return;
    }
    
    recordContainer.innerHTML = records.map(record => {
        return `
            <div style="display: grid; grid-template-columns: 80px 100px 100px 120px 150px 1fr 100px 120px; padding: 15px; border-bottom: 1px solid #e9ecef; align-items: center;">
                <div style="font-size: 14px; color: var(--dark-color);">${record.id}</div>
                <div style="font-size: 14px; color: var(--dark-color);">${record.student_id}</div>
                <div style="font-size: 14px; color: var(--dark-color);">${record.student_name}</div>
                <div style="font-size: 14px; color: var(--secondary-color);">${record.class_name || '-'}</div>
                <div style="font-size: 14px; color: var(--secondary-color);">${record.start_time}</div>
                <div style="font-size: 14px; color: var(--dark-color); word-break: break-word;">会话ID: ${record.session_id}</div>
                <div style="font-size: 14px; font-weight: 600; color: var(--primary-color);">${record.overall_score}</div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-info" onclick="viewStudentRecordDetail(${record.id})" style="padding: 4px 8px; font-size: 12px;" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 加载班级记录
function loadClassRecords() {
    console.log('开始加载班级记录...');
    const recordContainer = document.getElementById('classRecordsContainer');
    if (!recordContainer) {
        console.error('容器元素不存在');
        return;
    }
    
    recordContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
            <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 15px;"></i>
            <p>加载中...</p>
        </div>
    `;
    
    fetch('/teacher/records/class-records', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('响应不是JSON格式，可能需要重新登录');
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            renderClassRecords(result.data);
        } else {
            recordContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>加载失败：${result.message}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        if (error.message.includes('响应不是JSON格式')) {
            window.location.href = '/teacher/login';
        } else {
            recordContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 15px;"></i>
                    <p>网络错误，请重试</p>
                </div>
            `;
        }
    });
}

// 渲染班级记录
function renderClassRecords(records) {
    const recordContainer = document.getElementById('classRecordsContainer');
    const totalRecordsElement = document.getElementById('totalClassRecords');
    
    if (totalRecordsElement) {
        totalRecordsElement.textContent = records.length;
    }
    
    if (!recordContainer) return;
    
    if (records.length === 0) {
        recordContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                    <i class="fas fa-users" style="font-size: 48px; color: var(--primary-color);"></i>
                    <p>暂无班级记录</p>
                </div>
            </div>
        `;
        return;
    }
    
    // 按班级分组统计
    const classGroups = {};
    records.forEach(record => {
        if (!classGroups[record.class_name]) {
            classGroups[record.class_name] = {
                class_name: record.class_name,
                records: [],
                total_score: 0,
                count: 0
            };
        }
        classGroups[record.class_name].records.push(record);
        classGroups[record.class_name].total_score += record.overall_score;
        classGroups[record.class_name].count++;
    });
    
    // 转换为数组并计算平均分
    const classStats = Object.values(classGroups).map(group => ({
        ...group,
        avg_score: group.count > 0 ? (group.total_score / group.count).toFixed(2) : 0
    }));
    
    recordContainer.innerHTML = classStats.map(group => {
        return `
            <div style="display: grid; grid-template-columns: 80px 150px 120px 150px 1fr 100px 120px; padding: 15px; border-bottom: 1px solid #e9ecef; align-items: center;">
                <div style="font-size: 14px; color: var(--dark-color);">${group.records[0].id}</div>
                <div style="font-size: 14px; color: var(--dark-color);">${group.class_name}</div>
                <div style="font-size: 14px; font-weight: 600; color: var(--primary-color);">课堂记录</div>
                <div style="font-size: 14px; color: var(--secondary-color);">${group.records[0].start_time}</div>
                <div style="font-size: 14px; color: var(--dark-color); word-break: break-word;">共 ${group.count} 条记录</div>
                <div style="font-size: 14px; color: var(--dark-color); font-weight: 600;">${group.avg_score}</div>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-info" onclick="viewClassRecordDetail(${group.records[0].id})" style="padding: 4px 8px; font-size: 12px;" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 查看学生课堂记录详情
function viewStudentRecordDetail(recordId) {
    fetch('/teacher/records/student-records', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('响应不是JSON格式，可能需要重新登录');
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            const record = result.data.find(r => r.id === recordId);
            if (record) {
                showStudentRecordDetailModal(record);
            } else {
                alert('记录不存在');
            }
        } else {
            alert('获取记录失败: ' + result.message);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        if (error.message.includes('响应不是JSON格式')) {
            window.location.href = '/teacher/login';
        } else {
            alert('网络错误，请重试');
        }
    });
}

// 查看班级记录详情
function viewClassRecordDetail(recordId) {
    fetch('/teacher/records/class-records', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('响应不是JSON格式，可能需要重新登录');
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            const record = result.data.find(r => r.id === recordId);
            if (record) {
                showClassRecordDetailModal(record);
            } else {
                alert('记录不存在');
            }
        } else {
            alert('获取记录失败: ' + result.message);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        if (error.message.includes('响应不是JSON格式')) {
            window.location.href = '/teacher/login';
        } else {
            alert('网络错误，请重试');
        }
    });
}

// 显示学生课堂记录详情模态框
function showStudentRecordDetailModal(record) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; 
            max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--dark-color);">
                    <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 10px;"></i>
                    学生课堂记录详情
                </h3>
                <button onclick="this.closest('div').parentElement.remove()" 
                    style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 120px;">记录ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">学生学号</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.student_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">学生姓名</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.student_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">班级</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.class_name || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">开始时间</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.start_time}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">结束时间</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.end_time || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">会话ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.session_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">课程ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.class_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">抬头率</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.avg_head_up_rate}%</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">参与度</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.participation_score}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">理解度</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.understanding_score}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">综合得分</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600; color: var(--primary-color);">${record.overall_score}</td>
                </tr>
            </table>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// 显示班级记录详情模态框
function showClassRecordDetailModal(record) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 12px; 
            max-width: 600px; width: 90%; max-height: 80%; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: var(--dark-color);">
                    <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 10px;"></i>
                    班级记录详情
                </h3>
                <button onclick="this.closest('div').parentElement.remove()" 
                    style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600; width: 120px;">记录ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">学生学号</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.student_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">学生姓名</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.student_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">班级</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.class_name}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">开始时间</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.start_time}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">结束时间</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.end_time || '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">会话ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.session_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">课程ID</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.class_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">抬头率</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.avg_head_up_rate}%</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">参与度</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.participation_score}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">理解度</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${record.understanding_score}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600;">综合得分</td>
                    <td style="padding: 12px; border-bottom: 1px solid #e9ecef; font-weight: 600; color: var(--primary-color);">${record.overall_score}</td>
                </tr>
            </table>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// 获取记录类型文本
function getRecordTypeText(type) {
    const typeMap = {
        'video': '视频记录',
        'audio': '语音记录',
        'answer': '答题记录'
    };
    return typeMap[type] || type;
}

// 分页功能
function changeStudentRecordPage(page) {
    console.log('切换到学生记录页面:', page);
    loadStudentRecords();
}

function changeClassRecordPage(page) {
    console.log('切换到班级记录页面:', page);
    loadClassRecords();
}

// 将函数绑定到全局作用域
if (typeof window !== 'undefined') {
    window.switchRecordTab = switchRecordTab;
    window.loadStudentRecords = loadStudentRecords;
    window.loadClassRecords = loadClassRecords;
    window.viewStudentRecordDetail = viewStudentRecordDetail;
    window.viewClassRecordDetail = viewClassRecordDetail;
    window.changeStudentRecordPage = changeStudentRecordPage;
    window.changeClassRecordPage = changeClassRecordPage;
    // 新增学生课程记录查询函数
    window.searchStudentRecords = searchStudentRecords;
    window.resetStudentRecordSearch = resetStudentRecordSearch;
    window.viewStudentCourseRecordDetail = viewStudentCourseRecordDetail;
    window.closeStudentCourseRecordDetailModal = closeStudentCourseRecordDetailModal;
}
