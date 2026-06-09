const teacherCourseRecordsModule = {
    currentCourseId: null,
    currentRecordId: null,

    loadCourseRecords(courseId) {
        this.currentCourseId = courseId;
        const container = document.getElementById('teacherCourseRecordsList');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                <p>加载课程记录中...</p>
            </div>
        `;

        fetch(`/teacher/course/${courseId}/records`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderCourseRecords(data.data);
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                        <p>${data.msg || '加载失败'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('加载课程记录失败:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <p>网络错误，请稍后重试</p>
                </div>
            `;
        });
    },

    renderCourseRecords(data) {
        const container = document.getElementById('teacherCourseRecordsList');
        if (!container) return;

        const records = data.records || [];
        
        if (records.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">暂无课程记录</p>
                    <p style="font-size: 14px; color: #6c757d;">点击下方按钮创建新的课程记录</p>
                    <button onclick="teacherCourseRecordsModule.createRecord()" style="margin-top: 20px; background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 25px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-plus"></i> 创建课程记录
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h4 style="margin: 0 0 10px 0; color: var(--dark-color);">${data.course_name} - 课程记录</h4>
                    <p style="margin: 0; color: var(--secondary-color); font-size: 14px;">共 ${records.length} 次课程记录</p>
                </div>
                <button onclick="teacherCourseRecordsModule.createRecord()" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 25px; font-size: 14px; cursor: pointer;">
                    <i class="fas fa-plus"></i> 创建课程记录
                </button>
            </div>
            ${records.map((record, index) => `
                <div class="record-card" style="background: linear-gradient(135deg, white, #f8f9fa); border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; border: 1px solid #e9ecef;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <span style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${record.record_name}</span>
                                <span style="color: var(--secondary-color); font-size: 14px;">${record.record_date}</span>
                            </div>
                            ${record.description ? `<p style="margin: 0; color: var(--secondary-color); font-size: 14px;">${record.description}</p>` : ''}
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span style="background: #e3f2fd; color: #0277bd; padding: 4px 12px; border-radius: 12px; font-size: 12px;"><i class="fas fa-users"></i> ${record.student_count} 学生</span>
                            <button onclick="teacherCourseRecordsModule.viewRecordStudents(${record.id})" style="background: var(--primary-color); color: white; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
                                <i class="fas fa-eye"></i> 查看详情
                            </button>
                            <button onclick="teacherCourseRecordsModule.archiveRecord(${record.id})" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
                                <i class="fas fa-archive"></i> 归档
                            </button>
                            <button onclick="teacherCourseRecordsModule.deleteRecord(${record.id})" style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    },

    createRecord() {
        const modal = document.createElement('div');
        modal.id = 'create-record-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">创建课程记录</h3>
                    <button onclick="teacherCourseRecordsModule.closeModal('create-record-modal')" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>
                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--dark-color); font-size: 14px; font-weight: 600;">记录名称</label>
                        <input type="text" id="recordName" placeholder="例如：第一次课" style="width: 100%; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--dark-color); font-size: 14px; font-weight: 600;">描述（可选）</label>
                        <textarea id="recordDescription" placeholder="课程内容描述..." style="width: 100%; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; font-size: 14px; min-height: 80px; resize: vertical;"></textarea>
                    </div>
                </div>
                <div style="padding: 15px 25px; border-top: 1px solid #e9ecef; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="teacherCourseRecordsModule.closeModal('create-record-modal')" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">取消</button>
                    <button onclick="teacherCourseRecordsModule.submitCreateRecord()" style="background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">创建</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    submitCreateRecord() {
        const name = document.getElementById('recordName').value.trim();
        const description = document.getElementById('recordDescription').value.trim();

        fetch(`/teacher/course/${this.currentCourseId}/create_record`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ record_name: name, description: description })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.closeModal('create-record-modal');
                this.loadCourseRecords(this.currentCourseId);
                alert('创建成功！');
            } else {
                alert(data.msg || '创建失败');
            }
        })
        .catch(error => {
            console.error('创建记录失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    viewRecordStudents(recordId) {
        this.currentRecordId = recordId;
        
        fetch(`/teacher/course_record/${recordId}/students`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.showStudentsModal(data.data);
            } else {
                alert(data.msg || '获取学生列表失败');
            }
        })
        .catch(error => {
            console.error('获取学生列表失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    showStudentsModal(data) {
        const modal = document.createElement('div');
        modal.id = 'students-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

        const students = data.students || [];

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 1000px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                    <div>
                        <h3 style="margin: 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">${data.record_info.record_name} - 学生列表</h3>
                        <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 14px;">${data.record_info.record_date} | 共 ${students.length} 名学生</p>
                    </div>
                    <button onclick="teacherCourseRecordsModule.closeModal('students-modal')" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>
                <div style="padding: 25px;">
                    ${students.length === 0 ? `
                        <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                            <i class="fas fa-users-slash" style="font-size: 48px; margin-bottom: 20px;"></i>
                            <p>暂无学生记录，请先归档数据</p>
                        </div>
                    ` : `
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">学生姓名</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">抬头率</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">识别提问数</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">答题情况</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">得分</th>
                                    <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e9ecef; font-size: 14px; color: var(--dark-color);">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(s => `
                                    <tr style="border-bottom: 1px solid #e9ecef;">
                                        <td style="padding: 12px; font-size: 14px; color: var(--dark-color); font-weight: 500;">${s.student_name}</td>
                                        <td style="padding: 12px; text-align: center; font-size: 14px;">
                                            <span style="color: ${s.avg_head_up_rate >= 70 ? 'var(--success-color)' : s.avg_head_up_rate >= 50 ? 'var(--primary-color)' : 'var(--danger-color)'}; font-weight: 600;">${s.avg_head_up_rate}%</span>
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-size: 14px; color: #6f42c1;">${s.audio_count}</td>
                                        <td style="padding: 12px; text-align: center; font-size: 14px;">
                                            <span style="color: #fd7e14;">${s.answered_count}/${s.question_count}</span>
                                            ${s.correct_count > 0 ? `<span style="color: var(--success-color); margin-left: 5px;">(${s.correct_count}正确)</span>` : ''}
                                        </td>
                                        <td style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; color: var(--primary-color);">${s.total_score}</td>
                                        <td style="padding: 12px; text-align: center;">
                                            <button onclick="teacherCourseRecordsModule.viewStudentDetail(${s.id})" style="background: var(--primary-color); color: white; border: none; padding: 6px 12px; border-radius: 15px; font-size: 12px; cursor: pointer;">
                                                <i class="fas fa-eye"></i> 查看详情
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal('students-modal');
            }
        });
    },

    viewStudentDetail(studentRecordId) {
        fetch(`/teacher/student_record/${studentRecordId}/detail`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.showStudentDetailModal(data.data);
            } else {
                alert(data.msg || '获取详情失败');
            }
        })
        .catch(error => {
            console.error('获取详情失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    showStudentDetailModal(data) {
        const modal = document.createElement('div');
        modal.id = 'student-detail-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; justify-content: center;';

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                    <div>
                        <h3 style="margin: 0; color: var(--dark-color); font-size: 20px; font-weight: 600;">${data.student_record.student_name} 的课程记录</h3>
                        <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 14px;">${data.record_info.record_name} | ${data.record_info.record_date}</p>
                    </div>
                    <button onclick="teacherCourseRecordsModule.closeModal('student-detail-modal')" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>

                <div style="padding: 25px;">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                        <div style="background: linear-gradient(135deg, #28a745, #218838); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${data.student_record.total_head_up_count}</div>
                            <div style="font-size: 13px; opacity: 0.9;">抬头次数</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${data.student_record.total_head_down_count}</div>
                            <div style="font-size: 13px; opacity: 0.9;">低头次数</div>
                        </div>
                        <div style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${data.student_record.avg_head_up_rate}%</div>
                            <div style="font-size: 13px; opacity: 0.9;">抬头率</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #fd7e14, #e06c0d); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${data.student_record.total_score}</div>
                            <div style="font-size: 13px; opacity: 0.9;">总得分</div>
                        </div>
                    </div>

                    ${data.video_records.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;"><i class="fas fa-video" style="color: var(--primary-color); margin-right: 8px;"></i>视频检测记录 (${data.video_records.length}条)</h4>
                            <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                ${data.video_records.map(v => `
                                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                        <span style="color: var(--secondary-color); font-size: 13px;">${v.record_time}</span>
                                        <span style="font-size: 13px;">抬头: <strong style="color: var(--success-color);">${v.head_up_count}</strong> | 低头: <strong style="color: var(--danger-color);">${v.head_down_count}</strong> | 抬头率: <strong style="color: var(--primary-color);">${v.head_up_rate}%</strong></span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.audio_records.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;"><i class="fas fa-microphone" style="color: #dc3545; margin-right: 8px;"></i>识别提问记录 (${data.audio_records.length}条)</h4>
                            <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                ${data.audio_records.map(a => `
                                    <div style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="color: var(--secondary-color); font-size: 13px;">${a.record_time}</span>
                                            ${a.is_question ? '<span style="background: #e3f2fd; color: #0277bd; padding: 2px 8px; border-radius: 10px; font-size: 11px;">提问</span>' : ''}
                                        </div>
                                        <p style="margin: 0; color: var(--dark-color); font-size: 14px;">${a.content || '无内容'}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.answer_records.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;"><i class="fas fa-pencil-alt" style="color: #ffc107; margin-right: 8px;"></i>答题记录 (${data.answer_records.length}条)</h4>
                            <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                ${data.answer_records.map(a => `
                                    <div style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="font-weight: 600; color: var(--dark-color); font-size: 14px;">${a.question_title || '问题'}</span>
                                            <span style="font-size: 13px;">
                                                ${a.is_correct === true ? '<span style="color: var(--success-color);"><i class="fas fa-check-circle"></i> 正确</span>' : 
                                                  a.is_correct === false ? '<span style="color: var(--danger-color);"><i class="fas fa-times-circle"></i> 错误</span>' : 
                                                  '<span style="color: var(--secondary-color);">待批改</span>'}
                                                <span style="margin-left: 8px; font-weight: 600; color: var(--primary-color);">+${a.score}分</span>
                                            </span>
                                        </div>
                                        <p style="margin: 0; color: var(--secondary-color); font-size: 13px;">答案: ${a.content || '无'}</p>
                                        <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 12px;">${a.submit_time}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.comment_records.length > 0 ? `
                        <div style="margin-bottom: 25px;">
                            <h4 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;"><i class="fas fa-comments" style="color: #6f42c1; margin-right: 8px;"></i>讨论区记录 (${data.comment_records.length}条)</h4>
                            <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; border-radius: 8px; padding: 15px;">
                                ${data.comment_records.map(c => `
                                    <div style="padding: 10px 0; border-bottom: 1px solid #e9ecef;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="font-weight: 600; color: var(--dark-color); font-size: 14px;">${c.question_title || '问题'}</span>
                                            <span style="color: var(--secondary-color); font-size: 12px;">${c.create_time}</span>
                                        </div>
                                        <p style="margin: 0; color: var(--dark-color); font-size: 14px;">${c.content}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${data.video_records.length === 0 && data.audio_records.length === 0 && data.answer_records.length === 0 && data.comment_records.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                            <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px;"></i>
                            <p>暂无详细记录数据</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal('student-detail-modal');
            }
        });
    },

    archiveRecord(recordId) {
        if (!confirm('确定要归档此课程记录吗？这将收集所有学生的当日数据。')) return;

        fetch(`/teacher/course_record/${recordId}/archive`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                alert(`归档成功！已归档 ${data.data.archived_count} 名学生的记录。`);
                this.loadCourseRecords(this.currentCourseId);
            } else {
                alert(data.msg || '归档失败');
            }
        })
        .catch(error => {
            console.error('归档失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    deleteRecord(recordId) {
        if (!confirm('确定要删除此课程记录吗？此操作不可恢复！')) return;

        fetch(`/teacher/course_record/${recordId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                alert('删除成功！');
                this.loadCourseRecords(this.currentCourseId);
            } else {
                alert(data.msg || '删除失败');
            }
        })
        .catch(error => {
            console.error('删除失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.remove();
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = teacherCourseRecordsModule;
} else {
    window.teacherCourseRecordsModule = teacherCourseRecordsModule;
}
