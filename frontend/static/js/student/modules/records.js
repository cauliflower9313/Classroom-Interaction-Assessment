// 学生端记录管理模块 - 参考教师端记录查询样式
const recordsModule = {
    // 记录相关变量
    studentRecords: null,
    currentRecordData: null,
    
    // 初始化记录管理
    init() {
        this.studentRecords = document.getElementById('studentRecords');
        this.loadStudentRecords();
    },
    
    // 加载学生记录 - 自动加载，不需要查询
    loadStudentRecords() {
        // 显示加载状态
        if (this.studentRecords) {
            this.studentRecords.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>加载记录中...</p>
                </div>
            `;
        }
        
        // 调用后端API获取学生记录 - 参考教师端，获取详细课程记录
        fetch('/student/my_course_records', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.currentRecordData = data.data;
                this.renderStudentRecords(data.data);
            } else {
                console.error('获取记录失败:', data.msg);
                this.renderNoRecords();
            }
        })
        .catch(error => {
            console.error('获取记录失败:', error);
            this.renderNoRecords();
        });
    },
    
    // 渲染学生记录 - 参考教师端记录查询样式
    renderStudentRecords(data) {
        if (!this.studentRecords) return;
        
        const stats = data.statistics || {};
        const courseRecords = data.course_records || [];
        
        this.studentRecords.innerHTML = `
            <!-- 统计概览卡片 - 参考教师端样式 -->
            <div class="panel" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin-bottom: 24px;">
                <div class="panel-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 20px; text-align: center;">
                        <div>
                            <div style="font-size: 28px; font-weight: bold;">${stats.total_courses || 0}</div>
                            <div style="font-size: 13px; opacity: 0.9;">参与课程数</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: bold;">${(stats.avg_head_up_rate || 0).toFixed(1)}%</div>
                            <div style="font-size: 13px; opacity: 0.9;">平均抬头率</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: bold;">${(stats.avg_correct_rate || 0).toFixed(1)}%</div>
                            <div style="font-size: 13px; opacity: 0.9;">平均正确率</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: bold;">${stats.total_questions || 0}</div>
                            <div style="font-size: 13px; opacity: 0.9;">累计识别提问数</div>
                        </div>
                        <div>
                            <div style="font-size: 28px; font-weight: bold;">${stats.total_answers || 0}</div>
                            <div style="font-size: 13px; opacity: 0.9;">答题次数</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 课程详细记录表格 - 参考教师端样式 -->
            <div class="panel">
                <div class="panel-header">
                    <div class="panel-title"><i class="fas fa-list"></i> 课程学习记录</div>
                </div>
                <div class="panel-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>课程名称</th>
                                    <th>课堂时间</th>
                                    <th>抬头率</th>
                                    <th>答题情况</th>
                                    <th>正确率</th>
                                    <th>识别提问数</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${courseRecords.length > 0 ? courseRecords.map(record => `
                                    <tr>
                                        <td>${record.course_name}</td>
                                        <td>${record.session_time}</td>
                                        <td>${(record.head_up_rate || 0).toFixed(1)}%</td>
                                        <td>${record.answered_questions || 0}/${record.total_questions || 0}</td>
                                        <td>${(record.correct_rate || 0).toFixed(1)}%</td>
                                        <td>${record.audio_question_count || 0}</td>
                                        <td>
                                            <button class="btn btn-sm btn-info" onclick="recordsModule.viewRecordDetail(${record.record_id})">
                                                <i class="fas fa-eye"></i> 详情
                                            </button>
                                        </td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                                            <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                                            暂无课程记录
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- 视频记录明细 -->
            ${data.video_records && data.video_records.length > 0 ? `
            <div class="panel" style="margin-top: 24px;">
                <div class="panel-header">
                    <div class="panel-title"><i class="fas fa-video"></i> 视频检测记录明细</div>
                </div>
                <div class="panel-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>记录时间</th>
                                    <th>抬头次数</th>
                                    <th>低头次数</th>
                                    <th>抬头率</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.video_records.map(v => `
                                    <tr>
                                        <td>${v.record_time}</td>
                                        <td>${v.head_up_count || 0}</td>
                                        <td>${v.head_down_count || 0}</td>
                                        <td>${(v.head_up_rate || 0).toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- 答题记录明细 -->
            ${data.answer_records && data.answer_records.length > 0 ? `
            <div class="panel" style="margin-top: 24px;">
                <div class="panel-header">
                    <div class="panel-title"><i class="fas fa-pencil-alt"></i> 答题记录明细</div>
                </div>
                <div class="panel-body" style="padding: 0;">
                    <div class="table-container">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>问题</th>
                                    <th>我的答案</th>
                                    <th>是否正确</th>
                                    <th>得分</th>
                                    <th>提交时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.answer_records.map(a => `
                                    <tr>
                                        <td>${a.question_title}</td>
                                        <td>${a.answer || '-'}</td>
                                        <td>
                                            ${a.is_correct ? 
                                                '<span class="badge badge-success">正确</span>' : 
                                                '<span class="badge badge-danger">错误</span>'}
                                        </td>
                                        <td>${a.score || 0}</td>
                                        <td>${a.submit_time || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
        `;
    },
    
    // 查看记录详情
    viewRecordDetail(recordId) {
        // 可以在这里实现查看详情的功能
        console.log('查看记录详情:', recordId);
        alert('查看详情功能开发中...');
    },
    
    // 渲染无记录状态
    renderNoRecords() {
        if (this.studentRecords) {
            this.studentRecords.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    <i class="fas fa-chart-bar" style="font-size: 64px; margin-bottom: 20px; color: var(--primary-color);"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">暂无记录</p>
                    <p style="font-size: 14px; margin-top: 8px; color: var(--secondary-color);">加入课程并参与课堂活动后，记录将在此显示</p>
                    <button class="btn btn-primary" style="margin-top: 20px; padding: 12px 28px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);" onclick="switchTab('courses')">
                        <i class="fas fa-book"></i> 查看我的课程
                    </button>
                </div>
            `;
        }
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = recordsModule;
} else {
    window.recordsModule = recordsModule;
}
