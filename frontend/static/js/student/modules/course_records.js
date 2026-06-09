const courseRecordsModule = {
    currentCourseId: null,
    currentRecordId: null,

    loadCourseRecords(courseId) {
        this.currentCourseId = courseId;
        const container = document.getElementById('courseRecordsList');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                <p>加载课程记录中...</p>
            </div>
        `;

        // 加载课堂会话记录
        this.loadCourseSessions(courseId);
    },

    async loadCourseSessions(courseId) {
        const container = document.getElementById('courseRecordsList');
        if (!container) return;

        try {
            // 添加时间戳参数强制刷新，避免缓存
            const timestamp = new Date().getTime();
            const response = await fetch(`/student/course/${courseId}/sessions?t=${timestamp}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                this.renderCourseSessions(data.data, courseId);
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                        <p>${data.msg || '加载失败'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('加载课堂记录失败:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <p>网络错误，请稍后重试</p>
                </div>
            `;
        }
    },

    renderCourseSessions(sessions, courseId) {
        const container = document.getElementById('courseRecordsList');
        if (!container) return;

        // 调试：打印第一个会话的数据
        if (sessions && sessions.length > 0) {
            console.log('第一个会话数据:', JSON.stringify(sessions[0], null, 2));
        }

        if (!sessions || sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>暂无课堂记录</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: var(--dark-color);">课堂记录列表</h4>
                <p style="margin: 0; color: var(--secondary-color); font-size: 14px;">点击查看每次课堂的详细记录</p>
            </div>
            
            <div style="display: grid; gap: 15px;">
                ${sessions.map(session => `
                    <div class="session-card" onclick="courseRecordsModule.viewSessionDetail(${session.id})" 
                         style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e9ecef; cursor: pointer; transition: all 0.3s; ${session.has_warning ? 'border-left: 4px solid #dc3545;' : ''}"
                         onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)';"
                         onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)';">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <h5 style="margin: 0 0 8px 0; color: var(--dark-color); font-size: 16px;">
                                    ${session.session_name || '课堂记录'}
                                    ${session.has_warning ? '<span style="color: #dc3545; font-size: 12px; margin-left: 8px;"><i class="fas fa-exclamation-triangle"></i> 有未回答问题</span>' : ''}
                                </h5>
                                <div style="display: flex; gap: 20px; color: var(--secondary-color); font-size: 13px;">
                                    <span><i class="fas fa-clock" style="margin-right: 5px;"></i>${session.start_time}</span>
                                    <span><i class="fas fa-question-circle" style="margin-right: 5px;"></i>答题: ${session.answered_count}/${session.total_questions}</span>
                                    <span><i class="fas fa-eye" style="margin-right: 5px;"></i>抬头率: ${session.avg_head_up_rate ? session.avg_head_up_rate.toFixed(1) : 0}%</span>
                                    <span><i class="fas fa-microphone" style="margin-right: 5px;"></i>提问: ${session.audio_count || 0}</span>
                                </div>
                            </div>

                        </div>
                        ${session.has_warning ? `
                            <div style="margin-top: 12px; padding: 10px; background: #fff3cd; border-radius: 8px; font-size: 13px; color: #856404;">
                                <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                                您有未回答的问题，请查看详情了解情况
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    async viewSessionDetail(sessionId) {
        try {
            const response = await fetch(`/student/session/${sessionId}/detail`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                this.showSessionDetailModal(data.data);
            } else {
                alert(data.msg || '获取详情失败');
            }
        } catch (error) {
            console.error('获取课堂详情失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    showSessionDetailModal(data) {
        const session = data.session;
        const record = data.student_record;

        const modal = document.createElement('div');
        modal.id = 'session-detail-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 95%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                    <div>
                        <h3 style="margin: 0; color: var(--dark-color); font-size: 20px; font-weight: 600;">
                            ${session.session_name || '课堂记录详情'}
                            ${record.has_warning ? '<span style="color: #dc3545; font-size: 14px; margin-left: 10px;"><i class="fas fa-exclamation-triangle"></i> 有异常</span>' : ''}
                        </h3>
                        <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 13px;">
                            ${session.start_time} ${session.end_time ? ' - ' + session.end_time : ''}
                        </p>
                    </div>
                    <button onclick="courseRecordsModule.closeModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>

                <div style="padding: 25px;">
                    ${record.has_warning && record.warning_reasons && record.warning_reasons.length > 0 ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;">
                            <h5 style="margin: 0 0 10px 0; color: #856404; font-size: 14px;">
                                <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>异常提醒
                            </h5>
                            <div style="font-size: 13px; color: #856404;">
                                ${record.warning_reasons.map(r => `<div style="margin-bottom: 5px;"><i class="fas fa-info-circle" style="margin-right: 5px;"></i>${r}</div>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                        <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${record.avg_head_up_rate ? record.avg_head_up_rate.toFixed(1) : 0}%</div>
                            <div style="font-size: 12px; opacity: 0.9;">抬头率</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #28a745, #218838); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${record.audio_count || 0}</div>
                            <div style="font-size: 12px; opacity: 0.9;">提问次数</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                            <div style="font-size: 24px; font-weight: 700;">${record.answered_count}/${record.question_count}</div>
                            <div style="font-size: 12px; opacity: 0.9;">答题情况</div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 15px;">
                            <i class="fas fa-microphone" style="color: #dc3545; margin-right: 8px;"></i>提问记录
                        </h5>
                        ${record.audio_records && record.audio_records.length > 0 ? `
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 200px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #dee2e6;">
                                            <th style="padding: 8px; text-align: center;">时间</th>
                                            <th style="padding: 8px; text-align: left;">提问内容</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${record.audio_records.map(a => `
                                            <tr style="border-bottom: 1px solid #dee2e6;">
                                                <td style="padding: 8px; text-align: center;">${a.record_time}</td>
                                                <td style="padding: 8px;">${a.content || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<p style="color: var(--secondary-color); text-align: center; padding: 20px;">暂无提问记录</p>'}
                    </div>

                    <div>
                        <h5 style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 15px;">
                            <i class="fas fa-edit" style="color: #ffc107; margin-right: 8px;"></i>答题记录
                        </h5>
                        ${record.answer_records && record.answer_records.length > 0 ? `
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 300px; overflow-y: auto;">
                                <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid #dee2e6;">
                                            <th style="padding: 8px; text-align: center;">问题ID</th>
                                            <th style="padding: 8px; text-align: left;">答案</th>
                                            <th style="padding: 8px; text-align: center;">状态</th>
                                            <th style="padding: 8px; text-align: center;">得分</th>
                                            <th style="padding: 8px; text-align: center;">提交时间</th>
                                            <th style="padding: 8px; text-align: center;">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${record.answer_records.map(a => `
                                            <tr style="border-bottom: 1px solid #dee2e6;">
                                                <td style="padding: 8px; text-align: center;">${a.question_id}</td>
                                                <td style="padding: 8px;">${a.content || '-'}</td>
                                                <td style="padding: 8px; text-align: center;">
                                                    ${a.is_correct 
                                                        ? '<span style="color: #28a745;">正确</span>' 
                                                        : '<span style="color: #dc3545;">错误</span>'}
                                                </td>
                                                <td style="padding: 8px; text-align: center; font-weight: 600;">${a.score}</td>
                                                <td style="padding: 8px; text-align: center;">${a.submit_time}</td>
                                                <td style="padding: 8px; text-align: center;">
                                                    <button class="btn btn-sm btn-info" onclick="event.stopPropagation(); courseRecordsModule.showQuestionDiscussion(${a.question_id})">
                                                        <i class="fas fa-comments"></i> 讨论
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : '<p style="color: var(--secondary-color); text-align: center; padding: 20px;">暂无答题记录</p>'}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    },

    async showQuestionDiscussion(questionId) {
        try {
            const response = await fetch(`/student/question/${questionId}/comments`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                this.showDiscussionModal(questionId, data.data);
            } else {
                alert(data.msg || '获取讨论区失败');
            }
        } catch (error) {
            console.error('获取讨论区失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    showDiscussionModal(questionId, data) {
        const modal = document.createElement('div');
        modal.id = 'discussion-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; justify-content: center;';

        const comments = data.comments || [];
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 95%; max-width: 700px; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                    <h3 style="margin: 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">
                        <i class="fas fa-comments" style="color: #17a2b8; margin-right: 8px;"></i>问题讨论区
                    </h3>
                    <button onclick="courseRecordsModule.closeDiscussionModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>

                <div style="padding: 20px;">
                    <!-- 发表评论区域 -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <textarea id="newCommentContent" placeholder="发表你的看法..." style="width: 100%; min-height: 80px; padding: 10px; border: 1px solid #dee2e6; border-radius: 8px; resize: vertical; font-size: 14px;"></textarea>
                        <button class="btn btn-primary" onclick="courseRecordsModule.addComment(${questionId})" style="margin-top: 10px;">
                            <i class="fas fa-paper-plane"></i> 发表评论
                        </button>
                    </div>

                    <!-- 评论列表 -->
                    <div id="commentsList">
                        ${comments.length > 0 ? comments.map(comment => this.renderComment(comment, questionId)).join('') : `
                            <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                                <p>暂无评论，快来发表第一条评论吧！</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeDiscussionModal();
            }
        });
    },

    renderComment(comment, questionId, depth = 0) {
        const marginLeft = depth * 20;
        const isAuthor = comment.is_author;
        
        let repliesHtml = '';
        if (comment.replies && comment.replies.length > 0) {
            repliesHtml = comment.replies.map(reply => this.renderComment(reply, questionId, depth + 1)).join('');
        }

        return `
            <div style="margin-left: ${marginLeft}px; margin-bottom: 15px; padding: 15px; background: ${depth > 0 ? '#f8f9fa' : 'white'}; border: 1px solid #e9ecef; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: ${comment.author_type === 'teacher' ? '#dc3545' : '#007bff'}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                            ${comment.author_name.charAt(0)}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--dark-color);">
                                ${comment.author_name}
                                ${comment.author_type === 'teacher' ? '<span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px;">教师</span>' : ''}
                                ${isAuthor ? '<span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px;">我</span>' : ''}
                            </div>
                            <div style="font-size: 12px; color: var(--secondary-color);">${comment.create_time}</div>
                        </div>
                    </div>
                    ${isAuthor ? `
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-sm btn-secondary" onclick="courseRecordsModule.editComment(${comment.id}, '${comment.content.replace(/'/g, "\\'")}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="courseRecordsModule.deleteComment(${comment.id}, ${questionId})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div style="color: var(--dark-color); line-height: 1.6; margin-bottom: 10px;">${comment.content}</div>
                <div>
                    <button class="btn btn-sm btn-outline-primary" onclick="courseRecordsModule.showReplyInput(${comment.id}, ${questionId})">
                        <i class="fas fa-reply"></i> 回复
                    </button>
                </div>
                <div id="replyInput_${comment.id}" style="display: none; margin-top: 10px;">
                    <textarea id="replyContent_${comment.id}" placeholder="回复..." style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #dee2e6; border-radius: 8px; resize: vertical; font-size: 13px;"></textarea>
                    <div style="margin-top: 8px;">
                        <button class="btn btn-primary btn-sm" onclick="courseRecordsModule.addReply(${questionId}, ${comment.id})">发送</button>
                        <button class="btn btn-secondary btn-sm" onclick="courseRecordsModule.hideReplyInput(${comment.id})">取消</button>
                    </div>
                </div>
                ${repliesHtml ? `<div style="margin-top: 10px;">${repliesHtml}</div>` : ''}
            </div>
        `;
    },

    async addComment(questionId) {
        const content = document.getElementById('newCommentContent').value.trim();
        if (!content) {
            alert('请输入评论内容');
            return;
        }

        try {
            const response = await fetch(`/student/question/${questionId}/comment`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                document.getElementById('newCommentContent').value = '';
                this.showQuestionDiscussion(questionId);
            } else {
                alert(data.msg || '评论失败');
            }
        } catch (error) {
            console.error('评论失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    async addReply(questionId, parentId) {
        const content = document.getElementById(`replyContent_${parentId}`).value.trim();
        if (!content) {
            alert('请输入回复内容');
            return;
        }

        try {
            const response = await fetch(`/student/question/${questionId}/comment`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, parent_id: parentId })
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                this.showQuestionDiscussion(questionId);
            } else {
                alert(data.msg || '回复失败');
            }
        } catch (error) {
            console.error('回复失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    showReplyInput(commentId, questionId) {
        document.getElementById(`replyInput_${commentId}`).style.display = 'block';
    },

    hideReplyInput(commentId) {
        document.getElementById(`replyInput_${commentId}`).style.display = 'none';
    },

    async editComment(commentId, oldContent) {
        const newContent = prompt('修改评论:', oldContent);
        if (newContent === null || newContent.trim() === '') return;

        try {
            const response = await fetch(`/student/comment/${commentId}`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent.trim() })
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                const modal = document.getElementById('discussion-modal');
                const questionId = modal.dataset.questionId;
                this.showQuestionDiscussion(questionId);
            } else {
                alert(data.msg || '修改失败');
            }
        } catch (error) {
            console.error('修改失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    async deleteComment(commentId, questionId) {
        if (!confirm('确定要删除这条评论吗？')) return;

        try {
            const response = await fetch(`/student/comment/${commentId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                this.showQuestionDiscussion(questionId);
            } else {
                alert(data.msg || '删除失败');
            }
        } catch (error) {
            console.error('删除失败:', error);
            alert('网络错误，请稍后重试');
        }
    },

    closeModal() {
        const modal = document.getElementById('session-detail-modal');
        if (modal) {
            modal.remove();
        }
    },

    closeDiscussionModal() {
        const modal = document.getElementById('discussion-modal');
        if (modal) {
            modal.remove();
        }
    },

    loadAllRecords() {
        const container = document.getElementById('allRecordsList');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                <p>加载所有记录中...</p>
            </div>
        `;

        fetch('/student/my_records', {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderAllRecords(data.data);
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
            console.error('加载记录失败:', error);
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                    <p>网络错误，请稍后重试</p>
                </div>
            `;
        });
    },

    renderAllRecords(data) {
        const container = document.getElementById('allRecordsList');
        if (!container) return;

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${data.total_video_records}</div>
                    <div style="font-size: 14px; opacity: 0.9;">视频检测记录</div>
                </div>
                <div style="background: linear-gradient(135deg, #28a745, #218838); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${data.total_audio_records}</div>
                    <div style="font-size: 14px; opacity: 0.9;">语音识别记录</div>
                </div>
                <div style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 25px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${data.total_answers}</div>
                    <div style="font-size: 14px; opacity: 0.9;">答题记录</div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e9ecef;">
                <h5 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">
                    <i class="fas fa-history" style="color: var(--primary-color); margin-right: 8px;"></i>最近活动
                </h5>
                <div style="display: grid; gap: 15px;">
                    ${data.last_video_time ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                            <span><i class="fas fa-video" style="color: #007bff; margin-right: 8px;"></i>最近视频检测</span>
                            <span style="color: var(--secondary-color);">${data.last_video_time}</span>
                        </div>
                    ` : ''}
                    ${data.last_audio_time ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                            <span><i class="fas fa-microphone" style="color: #dc3545; margin-right: 8px;"></i>最近语音识别</span>
                            <span style="color: var(--secondary-color);">${data.last_audio_time}</span>
                        </div>
                    ` : ''}
                    ${data.last_answer_time ? `
                        <div style="display: flex; justify-content: space-between; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                            <span><i class="fas fa-check-circle" style="color: #28a745; margin-right: 8px;"></i>最近答题</span>
                            <span style="color: var(--secondary-color);">${data.last_answer_time}</span>
                        </div>
                    ` : ''}
                    ${!data.last_video_time && !data.last_audio_time && !data.last_answer_time ? `
                        <div style="text-align: center; padding: 30px; color: var(--secondary-color);">
                            <i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 10px;"></i>
                            <p>暂无活动记录</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = courseRecordsModule;
} else {
    window.courseRecordsModule = courseRecordsModule;
}
