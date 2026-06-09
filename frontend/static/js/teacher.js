/**
 * 教师端前端逻辑
 * 包含：数据可视化、学生管理、问题管理等
 */

class TeacherSystem {
    constructor() {
        // 全局状态
        this.currentTab = 'dashboard';
        this.charts = {};
        this.students = []; // 保存学生数据

        // 绑定事件
        this.bindEvents();
    }

    // 绑定事件
    bindEvents() {
        // 退出登录
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // 添加问题表单
        const addQuestionForm = document.getElementById('addQuestionForm');
        if (addQuestionForm) {
            addQuestionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addQuestion();
            });
        }
        
        // 初始化答题系统
        this.initAnswerSystem();
    }
    
    // 初始化答题系统
    initAnswerSystem() {
        // 问题列表在切换到问题管理标签页时加载
    }
    
    // 显示添加问题表单
    showAddQuestionForm() {
        const form = document.getElementById('addQuestionForm');
        if (form) {
            form.style.display = 'block';
        }
    }
    
    // 隐藏添加问题表单
    hideAddQuestionForm() {
        const form = document.getElementById('addQuestionForm');
        if (form) {
            form.style.display = 'none';
            this.resetQuestionForm();
        }
    }
    
    // 切换问题选项显示
    toggleQuestionOptions() {
        const type = document.getElementById('questionType').value;
        const optionsDiv = document.getElementById('questionOptions');
        const answerGroup = document.getElementById('correctAnswerGroup');
        
        if (type === 'choice') {
            optionsDiv.style.display = 'block';
            answerGroup.querySelector('label').textContent = '正确答案（选项字母）：';
        } else {
            optionsDiv.style.display = 'none';
            if (type === 'judgment') {
                answerGroup.querySelector('label').textContent = '正确答案（true/false）：';
            } else {
                answerGroup.querySelector('label').textContent = '正确答案：';
            }
        }
    }
    
    // 重置问题表单
    resetQuestionForm() {
        const form = document.getElementById('addQuestionForm');
        if (form) {
            form.reset();
        }
        const optionsDiv = document.getElementById('questionOptions');
        if (optionsDiv) {
            optionsDiv.style.display = 'none';
        }
    }
    
    // 添加问题
    async addQuestion() {
        const formData = {
            title: document.getElementById('questionTitle').value,
            content: document.getElementById('questionContent').value,
            question_type: document.getElementById('questionType').value,
            options: document.getElementById('optionsText').value,
            correct_answer: document.getElementById('correctAnswer').value,
            score: parseInt(document.getElementById('questionScore').value),
            time_limit: parseInt(document.getElementById('timeLimit').value)
        };
        
        // 验证表单
        if (!formData.title.trim()) {
            alert('问题标题不能为空');
            return;
        }
        
        if (formData.question_type === 'choice' && !formData.options.trim()) {
            alert('选择题必须提供选项');
            return;
        }
        
        if (formData.question_type !== 'text' && !formData.correct_answer.trim()) {
            alert('请提供正确答案');
            return;
        }
        
        try {
            const response = await fetch('/teacher/question/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('问题添加成功！');
                this.hideAddQuestionForm();
                this.loadQuestions(); // 刷新问题列表
            } else {
                alert('添加失败: ' + result.msg);
            }
        } catch (error) {
            console.error('添加问题失败:', error);
            alert('网络错误，请重试');
        }
    }
    
    // 加载问题列表
    async loadQuestions() {
        try {
            const response = await fetch('/teacher/question/list', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.code === 200) {
                this.renderQuestionsList(result.data);
            } else {
                console.error('获取问题列表失败:', result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
        }
    }
    
    // 渲染问题列表
    renderQuestionsList(questions) {
        const container = document.getElementById('questionsList');
        if (!container) return;
        
        if (questions.length === 0) {
            container.innerHTML = '<p class="no-questions">暂无问题</p>';
            return;
        }
        
        container.innerHTML = questions.map(question => `
            <div class="question-item" data-id="${question.id}">
                <div class="question-header">
                    <h4>${question.title}</h4>
                    <span class="question-type">${this.getQuestionTypeText(question.question_type)}</span>
                    <span class="question-score">${question.score}分</span>
                    <span class="status-badge ${question.is_active ? 'active' : 'inactive'}">
                        ${question.is_active ? '已发布' : '未发布'}
                    </span>
                </div>
                <div class="question-content">
                    <p>${question.content}</p>
                    ${question.options ? `<p><strong>选项：</strong>${question.options}</p>` : ''}
                    ${question.correct_answer ? `<p><strong>答案：</strong>${question.correct_answer}</p>` : ''}
                </div>
                <div class="question-footer">
                    <span class="publish-time">发布时间: ${question.publish_time || '未发布'}</span>
                    <div class="question-actions">
                        ${question.is_active ? 
                            `<button onclick="teacherSystem.viewAnswers(${question.id})" class="view-answers-btn">查看答题情况</button>` :
                            `<button onclick="teacherSystem.publishQuestion(${question.id})" class="publish-btn">发布</button>`
                        }
                        <button onclick="teacherSystem.deleteQuestion(${question.id})" class="delete-btn">删除</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // 获取题型文本
    getQuestionTypeText(type) {
        const typeMap = {
            'text': '主观题',
            'choice': '选择题',
            'judgment': '判断题',
            'fill_blank': '填空题'
        };
        return typeMap[type] || '未知题型';
    }
    
    // 发布问题
    async publishQuestion(questionId) {
        try {
            const response = await fetch('/teacher/question/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question_id: questionId }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('问题发布成功！');
                this.loadQuestions(); // 刷新问题列表
            } else {
                alert('发布失败: ' + result.msg);
            }
        } catch (error) {
            console.error('发布问题失败:', error);
            alert('网络错误，请重试');
        }
    }
    
    // 查看答题情况
    async viewAnswers(questionId) {
        try {
            const response = await fetch(`/teacher/question/answers/${questionId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.code === 200) {
                this.showAnswersModal(result.data);
            } else {
                alert('获取答题情况失败: ' + result.msg);
            }
        } catch (error) {
            console.error('获取答题情况失败:', error);
            alert('网络错误，请重试');
        }
    }
    
    // 显示答题情况模态框
    showAnswersModal(data) {
        const answers = data.answers;
        const question = data.question;
        
        let modalContent = `
            <h3>${question.title} - 答题情况</h3>
            <p><strong>题型：</strong>${this.getQuestionTypeText(question.question_type)}</p>
            <p><strong>正确答案：</strong>${question.correct_answer}</p>
            <p><strong>总答题数：</strong>${data.total_count}</p>
            <p><strong>正确数：</strong>${data.correct_count}</p>
            <p><strong>正确率：</strong>${(data.correct_count / data.total_count * 100).toFixed(1)}%</p>
            <hr>
            <h4>详细答题记录：</h4>
            <div class="answers-list">
        `;
        
        answers.forEach(answer => {
            modalContent += `
                <div class="answer-item ${answer.is_correct ? 'correct' : 'incorrect'}">
                    <p><strong>${answer.student_name} (${answer.student_id})</strong></p>
                    <p>答案：${answer.content}</p>
                    <p>得分：${answer.score} | 用时：${answer.time_spent}秒</p>
                    <p>提交时间：${answer.submit_time}</p>
                </div>
            `;
        });
        
        modalContent += '</div>';
        
        // 这里可以扩展为更美观的模态框
        alert(modalContent);
    }
    
    // 删除问题
    async deleteQuestion(questionId) {
        if (!confirm('确定要删除这个问题吗？')) {
            return;
        }
        
        try {
            // 这里需要添加删除问题的API
            alert('删除功能待实现');
        } catch (error) {
            console.error('删除问题失败:', error);
            alert('删除失败，请重试');
        }
    }

    // 编辑问题
    async editQuestion(questionId) {
        try {
            // 获取问题详情
            const response = await fetch(`/teacher/question/detail/${questionId}`, {
                credentials: 'include'
            });
            const result = await response.json();

            if (result.code === 200) {
                this.showEditModal(result.data);
            } else {
                alert('获取问题详情失败：' + result.msg);
            }
        } catch (error) {
            console.error('获取问题详情失败:', error);
            alert('网络错误，请重试');
        }
    }

    // 显示编辑模态框
    showEditModal(question) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            justify-content: center; align-items: center;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; 
            max-width: 500px; width: 90%;
        `;

        modalContent.innerHTML = `
            <h3 style="margin-bottom: 16px;">编辑问题</h3>
            <form id="editQuestionForm">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题标题</label>
                    <input type="text" id="editTitle" value="${question.title}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题内容</label>
                    <textarea id="editContent" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 80px;" required>${question.content}</textarea>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题类型</label>
                    <select id="editType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="text" ${question.question_type === 'text' ? 'selected' : ''}>文本题</option>
                        <option value="choice" ${question.question_type === 'choice' ? 'selected' : ''}>选择题</option>
                        <option value="judgment" ${question.question_type === 'judgment' ? 'selected' : ''}>判断题</option>
                        <option value="fill_blank" ${question.question_type === 'fill_blank' ? 'selected' : ''}>填空题</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;" id="editOptionsGroup" style="display: ${question.question_type === 'choice' ? 'block' : 'none'};">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">选项（每行一个）</label>
                    <textarea id="editOptionsText" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px;">${question.options || ''}</textarea>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">正确答案</label>
                    <input type="text" id="editCorrectAnswer" value="${question.correct_answer}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">时间限制（秒）</label>
                    <input type="number" id="editTimeLimit" value="${question.time_limit}" min="30" max="300" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-primary" onclick="updateQuestion(${question.id})" style="flex: 1;">保存修改</button>
                    <button type="button" class="btn btn-secondary" onclick="closeEditModal()" style="flex: 1;">取消</button>
                </div>
            </form>
        `;

        modal.appendChild(modalContent);
        modal.onclick = (e) => {
            if (e.target === modal) this.closeEditModal();
        };

        document.body.appendChild(modal);
        this.currentEditModal = modal;
    }

    // 更新问题
    async updateQuestion(questionId) {
        const title = document.getElementById('editTitle').value;
        const content = document.getElementById('editContent').value;
        const questionType = document.getElementById('editType').value;
        const optionsText = document.getElementById('editOptionsText').value;
        const correctAnswer = document.getElementById('editCorrectAnswer').value;
        const timeLimit = document.getElementById('editTimeLimit').value;

        try {
            const response = await fetch('/teacher/question/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question_id: questionId,
                    title: title,
                    content: content,
                    question_type: questionType,
                    options: optionsText,
                    correct_answer: correctAnswer,
                    time_limit: parseInt(timeLimit)
                }),
                credentials: 'include'
            });

            const result = await response.json();

            if (result.code === 200) {
                alert('问题修改成功！');
                this.closeEditModal();
                this.loadQuestions(); // 刷新问题列表
            } else {
                alert('修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('更新问题失败:', error);
            alert('网络错误，请重试');
        }
    }

   // 关闭编辑模态框
    closeEditModal() {
        if (this.currentEditModal) {
            document.body.removeChild(this.currentEditModal);
            this.currentEditModal = null;
        }
    }
    
    // 获取学生列表
    async getStudentList() {
        const self = this;
        console.log('开始获取学生列表');
        try {
            const response = await fetch('/teacher/student/list', {
                credentials: 'include'
            });
            console.log('获取学生列表响应:', response);
            const result = await response.json();
            console.log('获取学生列表结果:', result);
            
            if (result.code === 200) {
                console.log('学生数据:', result.data);
                self.renderStudentList(result.data);
            } else {
                console.error('获取学生列表失败:', result.msg);
                alert('获取学生列表失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    }
    
    // 渲染学生列表
    renderStudentList(students) {
        const container = document.getElementById('studentTableBody');
        if (!container) return;
        
        console.log('渲染学生列表，学生数据:', students);
        
        // 保存学生数据
        this.students = students;
        
        if (students.length === 0) {
            container.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary-color); font-size: 16px;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <i class="fas fa-users" style="font-size: 48px; color: var(--primary-color);"></i>
                        <p>暂无学生数据</p>
                        <button class="btn btn-success" onclick="window.showImportModal()" style="padding: 8px 20px; font-size: 14px;">
                            <i class="fas fa-upload"></i> 导入学生
                        </button>
                    </div>
                </td></tr>
            `;
            return;
        }
        
        container.innerHTML = students.map(student => `
            <tr class="student-row" data-student-id="${student.id}" onclick="toggleStudentRow(this, event)" style="cursor: pointer;">
                <td onclick="event.stopPropagation()"><input type="checkbox" class="student-checkbox" value="${student.id}" style="transform: scale(1.2);" onchange="updateBatchDeleteButton()"></td>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${student.grade || '-'}</td>
                <td>${student.major || '-'}</td>
                <td>${student.class_name || '-'}</td>
                <td onclick="event.stopPropagation()">
                    <button class="btn btn-info" onclick="editStudent('${student.id}', '${student.name}', '${student.grade || ''}', '${student.major || ''}', '${student.class_name || ''}')" style="padding: 4px 12px; font-size: 12px; margin-right: 5px;">
                        <i class="fas fa-edit"></i> 修改
                    </button>
                    <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 4px 12px; font-size: 12px;">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </td>
            </tr>
        `).join('');
        
        // 重置批量删除按钮状态
        this.updateBatchDeleteButtonState();
    }
    
    // 更新筛选选项
    updateFilterOptions(selectId, options) {
        console.log('更新筛选选项，selectId:', selectId, 'options:', options);
        const select = document.getElementById(selectId);
        console.log('找到的select元素:', select);
        if (!select) return;
        
        // 保存当前选中值
        const currentValue = select.value;
        
        // 清空现有选项（保留第一个"全部"选项）
        select.innerHTML = '<option value="">全部</option>';
        
        // 添加新选项
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });
        
        // 恢复选中值
        select.value = currentValue;
        console.log('更新后的select选项:', Array.from(select.options).map(opt => opt.value));
    }
    
    // 筛选学生
    filterStudents() {
        const searchText = document.getElementById('studentSearchInput')?.value.trim() || '';
        const grade = document.getElementById('studentGradeFilter')?.value || '';
        const major = document.getElementById('studentMajorFilter')?.value || '';
        const className = document.getElementById('studentClassFilter')?.value || '';
        const self = this;
        
        try {
            // 构建查询参数
            let params = new URLSearchParams();
            if (searchText) params.append('search', searchText);
            if (grade) params.append('grade', grade);
            if (major) params.append('major', major);
            if (className) params.append('class_name', className);
            
            fetch(`/teacher/student/filter?${params.toString()}`, {
                credentials: 'include'
            }) 
                .then(response => response.json())
                .then(result => {
                    if (result.code === 200) {
                        self.renderStudentList(result.data);
                    } else {
                        console.error('筛选学生失败:', result.msg);
                        alert('筛选学生失败: ' + result.msg);
                    }
                });
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    }
    
    // 加载筛选选项（带防抖和保留当前选中值）
    async loadFilterOptions() {
        // 防抖：如果正在加载中，则不重复请求
        if (this._isLoadingFilterOptions) {
            return;
        }
        this._isLoadingFilterOptions = true;
        
        try {
            const response = await fetch('/teacher/student/filter-options', {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.code === 200) {
                const { grades, majors, classes } = result.data;
                
                // 保存当前选中值
                const gradeSelect = document.getElementById('studentGradeFilter');
                const majorSelect = document.getElementById('studentMajorFilter');
                const classSelect = document.getElementById('studentClassFilter');
                
                const currentGrade = gradeSelect?.value || '';
                const currentMajor = majorSelect?.value || '';
                const currentClass = classSelect?.value || '';
                
                // 更新年级下拉框
                if (gradeSelect) {
                    gradeSelect.innerHTML = '<option value="">全部年级</option>';
                    grades.forEach(grade => {
                        const option = document.createElement('option');
                        option.value = grade;
                        option.textContent = grade;
                        gradeSelect.appendChild(option);
                    });
                    // 恢复选中值
                    if (currentGrade && grades.includes(currentGrade)) {
                        gradeSelect.value = currentGrade;
                    }
                }
                
                // 更新专业下拉框
                if (majorSelect) {
                    majorSelect.innerHTML = '<option value="">全部专业</option>';
                    majors.forEach(major => {
                        const option = document.createElement('option');
                        option.value = major;
                        option.textContent = major;
                        majorSelect.appendChild(option);
                    });
                    // 恢复选中值
                    if (currentMajor && majors.includes(currentMajor)) {
                        majorSelect.value = currentMajor;
                    }
                }
                
                // 更新班级下拉框
                if (classSelect) {
                    classSelect.innerHTML = '<option value="">全部班级</option>';
                    classes.forEach(cls => {
                        const option = document.createElement('option');
                        option.value = cls;
                        option.textContent = cls;
                        classSelect.appendChild(option);
                    });
                    // 恢复选中值
                    if (currentClass && classes.includes(currentClass)) {
                        classSelect.value = currentClass;
                    }
                }
                
                console.log('筛选选项加载成功:', { grades, majors, classes });
            }
        } catch (error) {
            console.error('加载筛选选项失败:', error);
        } finally {
            this._isLoadingFilterOptions = false;
        }
    }
    
    // 重置筛选
    resetFilters() {
        // 清空搜索框
        const searchInput = document.getElementById('studentSearchInput');
        if (searchInput) searchInput.value = '';
        
        // 重置下拉框
        const gradeSelect = document.getElementById('studentGradeFilter');
        if (gradeSelect) gradeSelect.value = '';
        
        const majorSelect = document.getElementById('studentMajorFilter');
        if (majorSelect) majorSelect.value = '';
        
        const classSelect = document.getElementById('studentClassFilter');
        if (classSelect) classSelect.value = '';
        
        // 重新加载学生列表
        this.getStudentList();
    }
    
    // 显示导入学生模态框
    showImportModal() {
        const modal = document.getElementById('importStudentModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 下载学生模板
    downloadStudentTemplate() {
        window.location.href = '/teacher/student/template';
    }
    
    // 导入学生
    async importStudents() {
        console.log('开始导入学生');
        try {
            // 尝试获取主页面的文件输入元素
            let fileInput = document.getElementById('importStudentFileMain');
            console.log('主页面文件输入元素:', fileInput);
            let file = fileInput ? fileInput.files[0] : null;
            console.log('主页面文件:', file);
            
            // 如果主页面没有文件，尝试获取模态框中的文件输入元素
            if (!file) {
                fileInput = document.getElementById('importStudentFile');
                console.log('模态框文件输入元素:', fileInput);
                file = fileInput ? fileInput.files[0] : null;
                console.log('模态框文件:', file);
            }
            
            if (!file) {
                console.log('没有选择文件');
                alert('请选择要导入的文件');
                return;
            }
            
            console.log('选择的文件:', file.name);
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('开始发送请求');
            const response = await fetch('/teacher/student/import', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            console.log('请求响应状态:', response.status);
            console.log('请求响应状态文本:', response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('响应结果:', result);
            
            if (result.code === 200) {
                console.log('导入成功，显示弹窗');
                // 记录操作 - 记录为一次批量导入操作，包含所有学生ID
                const studentIds = result.data.students.map(student => student.id).join(',');
                // 调用异步的addOperationRecord函数
                addOperationRecord('import', `批量导入学生：${result.data.students.length} 名`, studentIds);
                // 显示确认弹窗
                try {
                    const confirmed = confirm('学生导入成功！\n\n点击确定完成导入，点击取消则取消导入。');
                    console.log('用户确认:', confirmed);
                } catch (alertError) {
                    console.error('弹窗显示失败:', alertError);
                    // 使用 alert 作为备选
                    alert('学生导入成功！');
                } finally {
                    // 无论用户是否确认，都刷新学生列表、操作记录和重置文件上传区域
                    this.getStudentList();
                    // 刷新学生管理模块的操作记录
                    if (typeof window.loadStudentOperationRecords === 'function') {
                        window.loadStudentOperationRecords();
                    }
                    // 重置文件上传区域
                    this.resetFileUpload();
                }
            } else {
                console.log('导入失败:', result.msg);
                alert('导入失败: ' + result.msg);
            }
        } catch (error) {
            console.error('导入学生失败:', error);
            alert('网络错误，请重试: ' + error.message);
        }
    }
    
    // 重置文件上传区域
    resetFileUpload() {
        console.log('重置文件上传区域');
        // 重置文件输入元素
        const fileInput = document.getElementById('importStudentFileMain');
        if (fileInput) {
            fileInput.value = '';
        }
        // 显示上传区域，隐藏预览区域
        const uploadArea = document.getElementById('fileUploadArea');
        const previewArea = document.getElementById('filePreviewArea');
        if (uploadArea) uploadArea.style.display = 'block';
        if (previewArea) previewArea.style.display = 'none';
        console.log('文件上传区域重置完成');
    }
    
    // 重置筛选
    resetFilters() {
        // 清除所有勾选的复选框并触发change事件
        document.querySelectorAll('input[name="grade"]:checked').forEach(cb => {
            cb.checked = false;
            const changeEvent = new Event('change');
            cb.dispatchEvent(changeEvent);
        });
        document.querySelectorAll('input[name="major"]:checked').forEach(cb => {
            cb.checked = false;
            const changeEvent = new Event('change');
            cb.dispatchEvent(changeEvent);
        });
        document.querySelectorAll('input[name="class"]:checked').forEach(cb => {
            cb.checked = false;
            const changeEvent = new Event('change');
            cb.dispatchEvent(changeEvent);
        });
        // 清除搜索框
        const searchInput = document.getElementById('studentSearchInput');
        if (searchInput) searchInput.value = '';
        // 重置下拉框
        const gradeSelect = document.getElementById('studentGradeFilter');
        if (gradeSelect) gradeSelect.value = '';
        
        const majorSelect = document.getElementById('studentMajorFilter');
        if (majorSelect) majorSelect.value = '';
        
        const classSelect = document.getElementById('studentClassFilter');
        if (classSelect) classSelect.value = '';
        // 重新加载学生列表
        this.getStudentList();
    }
    
    // 批量删除学生
    async batchDeleteStudents() {
        // 获取选中的学生ID
        const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            alert('请选择要删除的学生');
            return;
        }
        
        if (confirm(`确定要删除这 ${selectedIds.length} 名学生吗？`)) {
            try {
                // 调用批量删除API
                const response = await fetch('/teacher/student/batch-delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        student_ids: selectedIds
                    }),
                    credentials: 'include'
                });
                
                const result = await response.json();
                if (result.code === 200) {
                    alert(`成功删除 ${result.data.success_count} 名学生`);
                    // 重置批量删除按钮状态
                    this.updateBatchDeleteButtonState();
                    this.getStudentList(); // 刷新学生列表
                    // 刷新学生管理模块的操作记录
                    if (typeof window.loadStudentOperationRecords === 'function') {
                        window.loadStudentOperationRecords();
                    }
                } else {
                    alert('删除失败: ' + result.msg);
                }
            } catch (error) {
                console.error('批量删除学生失败:', error);
                alert('网络错误，请重试');
            }
        }
    }
    
    // 切换全选/取消全选
    toggleSelectAllStudents() {
        const selectAllCheckbox = document.getElementById('selectAllStudents');
        const studentCheckboxes = document.querySelectorAll('.student-checkbox');
        
        studentCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
        
        // 更新批量删除按钮状态
        this.updateBatchDeleteButtonState();
    }
    
    // 更新批量删除按钮状态
    updateBatchDeleteButtonState() {
        const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
        const selectedCount = selectedCheckboxes.length;
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        const selectedCountSpan = document.getElementById('selectedCount');
        
        if (batchDeleteBtn) {
            if (selectedCount > 0) {
                batchDeleteBtn.style.display = 'inline-flex';
                if (selectedCountSpan) {
                    selectedCountSpan.textContent = selectedCount;
                }
            } else {
                batchDeleteBtn.style.display = 'none';
            }
        }
        
        // 更新全选复选框状态
        const selectAllCheckbox = document.getElementById('selectAllStudents');
        const allCheckboxes = document.querySelectorAll('.student-checkbox');
        if (selectAllCheckbox && allCheckboxes.length > 0) {
            selectAllCheckbox.checked = selectedCount === allCheckboxes.length;
        }
    }
}

// 处理文件选择
function handleFileSelect(event) {
    console.log('文件选择事件触发');
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('选择的文件:', file.name);
    
    // 显示文件预览区域
    document.getElementById('fileUploadArea').style.display = 'none';
    document.getElementById('filePreviewArea').style.display = 'block';
    
    // 显示加载状态
    document.getElementById('previewContent').innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: var(--primary-color);"></i> <p style="margin-top: 10px;">正在解析文件...</p></div>';
    
    // 检查文件类型
    if (file.name.endsWith('.csv')) {
        // 处理 CSV 文件
        handleCSVFile(file);
    } else if (file.name.endsWith('.xlsx')) {
        // 处理 Excel 文件
        handleExcelFile(file);
    } else {
        document.getElementById('previewContent').innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;"><i class="fas fa-exclamation-circle"></i> <p style="margin-top: 10px;">不支持的文件格式</p></div>';
    }
}

// 处理 CSV 文件
function handleCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',');
            const students = [];
            
            // 解析 CSV 数据
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',');
                if (values.length >= 2) {
                    const studentId = values[0].trim();
                    const name = values[1].trim();
                    if (studentId && name) {
                        students.push({ id: studentId, name: name });
                    }
                }
            }
            
            // 显示预览
            displayFilePreview(students);
        } catch (error) {
            console.error('解析 CSV 文件失败:', error);
            document.getElementById('previewContent').innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;"><i class="fas fa-exclamation-circle"></i> <p style="margin-top: 10px;">解析文件失败</p></div>';
        }
    };
    reader.readAsText(file);
}

// 处理 Excel 文件
function handleExcelFile(file) {
    // 检查是否已加载 SheetJS 库
    if (typeof XLSX === 'undefined') {
        // 动态加载 SheetJS 库（使用不同的 CDN）
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() {
            processExcelFile(file);
        };
        script.onerror = function() {
            document.getElementById('previewContent').innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;"><i class="fas fa-exclamation-circle"></i> <p style="margin-top: 10px;">加载 Excel 解析库失败</p></div>';
        };
        document.head.appendChild(script);
    } else {
        processExcelFile(file);
    }
}

// 处理 Excel 文件
function processExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // 提取学生数据
            const students = jsonData.map(row => {
                return {
                    id: row['学号'] ? String(row['学号']).trim() : '',
                    name: row['姓名'] ? String(row['姓名']).trim() : ''
                };
            }).filter(student => student.id && student.name);
            
            // 显示预览
            displayFilePreview(students);
        } catch (error) {
            console.error('解析 Excel 文件失败:', error);
            document.getElementById('previewContent').innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;"><i class="fas fa-exclamation-circle"></i> <p style="margin-top: 10px;">解析文件失败</p></div>';
        }
    };
    reader.readAsArrayBuffer(file);
}

// 显示文件预览
function displayFilePreview(students) {
    if (students.length === 0) {
        document.getElementById('previewContent').innerHTML = '<div style="color: var(--danger-color); text-align: center; padding: 20px;"><i class="fas fa-exclamation-circle"></i> <p style="margin-top: 10px;">文件中没有有效学生数据</p></div>';
        return;
    }
    
    // 生成预览表格
    let html = `
        <div style="margin-bottom: 15px;">
            <p style="font-weight: 600; color: var(--dark-color);">总计：${students.length} 名学生</p>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                    <tr style="background-color: #e9ecef;">
                        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">学号</th>
                        <th style="padding: 8px; border: 1px solid #dee2e6; text-align: left;">姓名</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // 添加学生数据
    students.forEach(student => {
        html += `
            <tr>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${student.id}</td>
                <td style="padding: 8px; border: 1px solid #dee2e6;">${student.name}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('previewContent').innerHTML = html;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    window.teacherSystem = new TeacherSystem();
    
    // 初始化时加载筛选选项
    setTimeout(() => {
        if (typeof window.loadStudentFilterOptions === 'function') {
            window.loadStudentFilterOptions();
        }
        // 加载课堂管理班级选项
        if (typeof window.loadCourseClassOptions === 'function') {
            window.loadCourseClassOptions();
        }
    }, 100);

    // 获取标签页显示名称
    function getTabDisplayName(tabName) {
        const tabNames = {
            'dashboard': '数据仪表盘',
            'students': '学生管理',
            'classroom': '课堂管理',
            'questions': '问题管理',
            'assistant': '智能助手',
            'records': '记录查询',
            'evaluation': '互动评估'
        };
        return tabNames[tabName] || '';
    }
    
    // 切换标签页函数
    window.switchTab = function(tabName) {
        // 隐藏所有标签内容
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const targetTab = document.getElementById(tabName + '-tab');
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            console.error('标签页未找到:', tabName + '-tab');
        }
        
        // 高亮选中的菜单项
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 查找并高亮当前菜单项
        const menuItems = document.querySelectorAll('.menu-item');
        for (let item of menuItems) {
            // 检查菜单项的文本内容是否包含对应的功能名称
            if (item.textContent.includes(getTabDisplayName(tabName))) {
                item.classList.add('active');
                break;
            }
        }
        
        // 如果切换到学生管理标签，加载学生列表和筛选选项
        if (tabName === 'students') {
            window.getStudentList();
            if (typeof window.loadStudentFilterOptions === 'function') {
                window.loadStudentFilterOptions();
            }
        }
        // 如果切换到课堂管理标签，激活默认子标签页并加载选项
        if (tabName === 'classroom') {
            window.switchClassroomTab('create');
            // 加载班级下拉选项
            if (typeof window.loadCourseClassOptions === 'function') {
                window.loadCourseClassOptions();
            }
        }
    };

    // 将编辑功能暴露到全局作用域
    window.editQuestion = function(questionId) {
        if (window.teacherSystem) {
            window.teacherSystem.editQuestion(questionId);
        } else {
            alert('系统未初始化，请刷新页面重试');
        }
    };

    window.updateQuestion = function(questionId) {
        if (window.teacherSystem) {
            window.teacherSystem.updateQuestion(questionId);
        }
    };

    window.closeEditModal = function() {
        if (window.teacherSystem) {
            window.teacherSystem.closeEditModal();
        }
    };
    
    // 学生管理相关全局函数
    window.getStudentList = function() {
        if (window.teacherSystem) {
            window.teacherSystem.getStudentList();
        }
    };
    
    window.filterStudents = function() {
        if (window.teacherSystem) {
            window.teacherSystem.filterStudents();
        }
    };
    
    window.resetStudentFilter = function() {
        if (window.teacherSystem) {
            window.teacherSystem.resetFilters();
        }
    };
    
    window.loadStudentFilterOptions = function() {
        if (window.teacherSystem) {
            window.teacherSystem.loadFilterOptions();
        }
    };
    
    window.searchStudents = function() {
        if (window.teacherSystem) {
            window.teacherSystem.searchStudents();
        }
    };
    
    window.showImportModal = function() {
        if (window.teacherSystem) {
            window.teacherSystem.showImportModal();
        }
    };
    
    window.closeImportModal = function() {
        if (window.teacherSystem) {
            window.teacherSystem.closeImportModal();
        }
    };
    
    window.downloadStudentTemplate = function() {
        if (window.teacherSystem) {
            window.teacherSystem.downloadStudentTemplate();
        }
    };
    
    window.importStudents = function() {
        console.log('全局 importStudents 函数被调用');
        if (window.teacherSystem) {
            console.log('调用 teacherSystem.importStudents()');
            // 直接调用，确保 this 上下文正确
            window.teacherSystem.importStudents();
        } else {
            console.log('teacherSystem 未初始化');
            alert('系统未初始化，请刷新页面重试');
        }
    };
    
    window.resetFilters = function() {
        if (window.teacherSystem) {
            window.teacherSystem.resetFilters();
        }
    };
    
    // 批量删除学生
    window.batchDeleteStudents = function() {
        if (window.teacherSystem) {
            window.teacherSystem.batchDeleteStudents();
        }
    };
    
    // 全选/取消全选学生
    window.toggleSelectAllStudents = function() {
        if (window.teacherSystem) {
            window.teacherSystem.toggleSelectAllStudents();
        }
    };
    
    // 更新批量删除按钮状态
    window.updateBatchDeleteButton = function() {
        if (window.teacherSystem) {
            window.teacherSystem.updateBatchDeleteButtonState();
        }
    };
    
    // 点击行切换勾选状态
    window.toggleStudentRow = function(row, event) {
        const checkbox = row.querySelector('.student-checkbox');
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            // 触发更新批量删除按钮
            if (window.teacherSystem) {
                window.teacherSystem.updateBatchDeleteButtonState();
            }
        }
    };
    
    // 操作记录相关全局函数
    // loadOperationRecords 在 records.js 中定义
    // withdrawOperation 和 viewOperationDetail 在 records.js 中定义
    
    // 学生操作函数
    window.viewStudentDetail = function(studentId) {
        alert('查看学生详情功能待实现');
    };
    
    window.editStudent = function(studentId, name, grade, major, class_name) {
        console.log('编辑学生:', { studentId, name, grade, major, class_name });
        
        // 填充表单数据
        document.getElementById('editStudentId').value = studentId;
        document.getElementById('editStudentIdDisplay').value = studentId;
        document.getElementById('editStudentName').value = name;
        document.getElementById('editStudentGrade').value = grade || '';
        document.getElementById('editStudentMajor').value = major || '';
        document.getElementById('editStudentClass').value = class_name || '';
        
        // 显示模态框
        const modal = document.getElementById('editStudentModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    };
    
    window.closeEditStudentModal = function() {
        const modal = document.getElementById('editStudentModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
    
    window.updateStudent = function() {
        const studentId = document.getElementById('editStudentId').value;
        const name = document.getElementById('editStudentName').value;
        const grade = document.getElementById('editStudentGrade').value;
        const major = document.getElementById('editStudentMajor').value;
        const class_name = document.getElementById('editStudentClass').value;
        
        if (!name) {
            alert('姓名不能为空');
            return;
        }
        
        // 发送请求更新学生信息
        fetch('/teacher/student/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: studentId,
                name: name,
                grade: grade,
                major: major,
                class_name: class_name
            }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                alert('修改成功');
                // 关闭模态框
                closeEditStudentModal();
                getStudentList(); // 刷新学生列表
            } else {
                alert('修改失败: ' + result.msg);
            }
        })
        .catch(error => {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        });
    };
    
    window.deleteStudent = function(studentId) {
        if (confirm('确定要删除这个学生吗？')) {
            // 发送请求删除学生
            fetch('/teacher/student/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId
                }),
                credentials: 'include'
            })
            .then(response => response.json())
            .then(result => {
                if (result.code === 200) {
                    alert('删除成功');
                    getStudentList(); // 刷新学生列表
                    // 刷新仪表盘数据
                    if (typeof loadDashboardData === 'function') {
                        console.log('正在刷新仪表盘数据...');
                        loadDashboardData();
                    } else {
                        console.warn('loadDashboardData 函数未定义');
                    }
                } else {
                    alert('删除失败: ' + result.msg);
                }
            })
            .catch(error => {
                console.error('网络错误:', error);
                alert('网络错误，请重试');
            });
        }
    };
    
    // 显示添加学生模态框
    window.showAddStudentModal = function() {
        const modal = document.getElementById('addStudentModal');
        if (modal) {
            modal.style.display = 'flex';
            // 清空表单
            document.getElementById('addStudentIdInput').value = '';
            document.getElementById('addStudentNameInput').value = '';
            document.getElementById('addStudentGradeInput').value = '';
            document.getElementById('addStudentMajorInput').value = '';
            document.getElementById('addStudentClassInput').value = '';
        }
    };
    
    // 关闭添加学生模态框
    window.closeAddStudentModal = function() {
        const modal = document.getElementById('addStudentModal');
        if (modal) {
            modal.style.display = 'none';
        }
    };
    
    // 提交添加学生
    window.submitAddStudent = function() {
        const studentId = document.getElementById('addStudentIdInput').value.trim();
        const name = document.getElementById('addStudentNameInput').value.trim();
        const grade = document.getElementById('addStudentGradeInput').value.trim();
        const major = document.getElementById('addStudentMajorInput').value.trim();
        const class_name = document.getElementById('addStudentClassInput').value.trim();
        
        if (!studentId) {
            alert('学号不能为空');
            return;
        }
        if (!name) {
            alert('姓名不能为空');
            return;
        }
        
        // 发送请求添加学生
        fetch('/teacher/student/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: studentId,
                name: name,
                grade: grade,
                major: major,
                class_name: class_name
            }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                alert('添加成功');
                closeAddStudentModal();
                getStudentList(); // 刷新学生列表
            } else {
                alert('添加失败: ' + result.msg);
            }
        })
        .catch(error => {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        });
    };
    
    // 退出登录函数
    window.logout = function() {
        fetch('/teacher/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                window.location.href = '/teacher/login';
            } else {
                alert('退出失败: ' + result.msg);
            }
        })
        .catch(error => {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        });
    };

    
    // 页面加载时默认显示课程管理界面
    document.addEventListener('DOMContentLoaded', function() {
        // 延迟执行，确保DOM完全加载
        setTimeout(function() {
            // 检查当前是否是课堂管理标签
            const classroomTab = document.getElementById('classroom-tab');
            if (classroomTab && classroomTab.classList.contains('active')) {
                window.switchClassroomTab('manage');
            }
        }, 100);
    });
    
    // 当切换到课堂管理标签时，默认显示课程管理界面
    window.switchTab = function(tabName) {
        // 隐藏所有标签内容
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const targetTab = document.getElementById(tabName + '-tab');
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // 高亮选中的菜单项（支持新旧两种class）
        document.querySelectorAll('.nav-item, .menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // 查找并高亮当前菜单项
        const menuItems = document.querySelectorAll('.nav-item, .menu-item');
        for (let item of menuItems) {
            // 检查菜单项的onclick属性或文本内容
            const onclickAttr = item.getAttribute('onclick');
            if (onclickAttr && onclickAttr.includes(`switchTab('${tabName}'`)) {
                item.classList.add('active');
                break;
            }
            // 兼容旧的文本匹配方式
            if (item.textContent.includes(getTabDisplayName(tabName))) {
                item.classList.add('active');
                break;
            }
        }
        
        // 更新顶部标题
        const headerTitle = document.querySelector('.header-title');
        if (headerTitle) {
            const titleMap = {
                'dashboard': '数据仪表盘',
                'students': '学生管理',
                'classroom': '课堂管理',
                'questions': '问题管理',
                'assistant': '智能助手',
                'records': '记录查询',
                'evaluation': '互动效果评估'
            };
            headerTitle.textContent = titleMap[tabName] || tabName;
        }
        
        // 如果切换到数据仪表盘标签，加载仪表盘数据
        if (tabName === 'dashboard') {
            loadDashboardData();
        }
        // 如果切换到学生管理标签，加载学生列表
        if (tabName === 'students') {
            window.getStudentList();
        }
        // 如果切换到课堂管理标签，默认显示课程管理内容
        if (tabName === 'classroom') {
            window.switchClassroomTab('manage');
        }
        // 如果切换到问题管理标签，默认显示问题列表标签页
        if (tabName === 'questions') {
            switchQuestionTab('list');
            // 自动加载问题列表
            if (window.questionsModule) {
                window.questionsModule.getQuestionList();
            }
        }
        // 如果切换到互动评估标签，加载评估数据
        if (tabName === 'evaluation') {
            if (typeof window.loadEvaluationData === 'function') {
                window.loadEvaluationData();
            }
        }

    };
    
    // 切换问题管理标签页
    window.switchQuestionTab = function(tabName, event) {
        if (event) event.preventDefault();
        
        // 隐藏所有问题标签内容
        document.querySelectorAll('.question-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const targetTab = document.getElementById(`${tabName}-question-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        
        // 更新标签按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('switchQuestionTab')) {
                btn.classList.remove('active');
            }
        });
        
        // 激活当前标签按钮
        const activeBtn = document.querySelector(`.tab-btn[onclick*="switchQuestionTab('${tabName}'"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    };
    
    // 获取问题列表
    window.getQuestionList = function() {
        if (window.questionsModule) {
            window.questionsModule.getQuestionList();
        }
    };
    
    // 一键发布所有问题
    window.publishAllQuestions = function() {
        alert('一键发布所有问题功能待实现');
    };
    
    // 删除选中问题
    window.deleteSelectedQuestions = function() {
        alert('删除选中问题功能待实现');
    };
    
    // 筛选问题列表
    window.filterQuestions = function() {
        const filterValue = document.getElementById('questionStatusFilter').value;
        const rows = document.querySelectorAll('#questionTableBody tr');
        
        rows.forEach(row => {
            if (row.cells.length < 7) return; // 跳过表头行
            
            const statusCell = row.cells[6];
            const statusText = statusCell.textContent.trim();
            
            let showRow = true;
            if (filterValue === 'active' && statusText !== '已发布') {
                showRow = false;
            } else if (filterValue === 'inactive' && statusText !== '未发布') {
                showRow = false;
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    };
    
    // 全选/取消全选问题
    window.toggleSelectAll = function() {
        const selectAllCheckbox = document.getElementById('selectAllQuestions');
        const questionCheckboxes = document.querySelectorAll('#questionTableBody input[type="checkbox"]');
        
        questionCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    };
    
    // 切换学生管理子模块标签页（已移至文件末尾）
    
    // 加载学生统计数据
    function loadStudentStatistics() {
        console.log('开始加载学生统计数据...');
        fetch('/teacher/student/statistics', {
            credentials: 'include'
        })
        .then(response => {
            console.log('响应状态:', response.status);
            return response.json();
        })
        .then(result => {
            console.log('获取学生统计数据结果:', result);
            if (result.code === 200) {
                const data = result.data;
                console.log('学生统计数据:', data);
                // 更新统计卡片
                const totalStudentsCount = document.getElementById('totalStudentsCount');
                const gradeCount = document.getElementById('gradeCount');
                const majorCount = document.getElementById('majorCount');
                const classCount = document.getElementById('classCount');
                
                console.log('DOM元素状态:', {
                    totalStudentsCount: totalStudentsCount,
                    gradeCount: gradeCount,
                    majorCount: majorCount,
                    classCount: classCount
                });
                
                if (totalStudentsCount) totalStudentsCount.textContent = data.total_students || 0;
                if (gradeCount) gradeCount.textContent = data.grade_count || 0;
                if (majorCount) majorCount.textContent = data.major_count || 0;
                if (classCount) classCount.textContent = data.class_count || 0;
                
                // 绘制年级分布图表
                drawGradeDistributionChart(data.grade_distribution || []);
                // 绘制专业分布图表
                drawMajorDistributionChart(data.major_distribution || []);
            } else {
                console.error('获取学生统计数据失败:', result.msg);
                alert('获取学生统计数据失败: ' + result.msg);
            }
        })
        .catch(error => {
            console.error('网络错误:', error);
            alert('网络错误，请重试: ' + error.message);
        });
    }
    
    // 绘制年级分布图表
    function drawGradeDistributionChart(data) {
        const ctx = document.getElementById('gradeDistributionChart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        // 销毁旧图表实例
        if (window.gradeDistributionChart) {
            window.gradeDistributionChart.destroy();
        }
        // 创建新图表
        window.gradeDistributionChart = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.grade + '级'),
                datasets: [{
                    label: '学生数量',
                    data: data.map(item => item.count),
                    backgroundColor: 'rgba(54, 162, 235, 0.8)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 15,
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '学生数量'
                        },
                        ticks: {
                            stepSize: 1,
                            precision: 0
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '年级'
                        }
                    }
                }
            }
        });
    }
    
    // 绘制专业分布图表
    function drawMajorDistributionChart(data) {
        const ctx = document.getElementById('majorDistributionChart');
        if (!ctx) return;
        
        const chartCtx = ctx.getContext('2d');
        // 销毁旧图表实例
        if (window.majorDistributionChart) {
            window.majorDistributionChart.destroy();
        }
        // 创建新图表
        window.majorDistributionChart = new Chart(chartCtx, {
            type: 'pie',
            data: {
                labels: data.map(item => item.major),
                datasets: [{
                    data: data.map(item => item.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 15,
                        cornerRadius: 8
                    }
                }
            }
        });
    }
    
    // 添加操作记录
    function addOperationRecord(type, content, studentIds) {
        fetch('/teacher/operation/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operation_type: type,
                operation_content: content,
                student_ids: studentIds
            }),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code !== 200) {
                console.error('添加操作记录失败:', result.msg);
            }
        })
        .catch(error => {
            console.error('添加操作记录失败:', error);
        });
    }
    
    // 切换下拉复选框
    function toggleDropdown(element, event) {
        event.stopPropagation();
        element.classList.toggle('active');
    }
    
    // 点击其他地方关闭下拉复选框
    document.addEventListener('click', function(event) {
        const dropdowns = document.querySelectorAll('.dropdown-checkbox');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(event.target)) {
                dropdown.classList.remove('active');
            }
        });
    });
    
    // 加载仪表盘数据
    function loadDashboardData() {
        // 检查是否在仪表盘页面
        const dashboardTab = document.getElementById('dashboard-tab');
        if (!dashboardTab || !dashboardTab.classList.contains('active')) {
            console.log('当前不在仪表盘页面，跳过刷新');
            return;
        }
        
        fetch('/teacher/dashboard/data', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                const data = result.data;
                // 安全地更新DOM元素
                const totalStudentsEl = document.getElementById('totalStudents');
                const totalClassesEl = document.getElementById('totalClasses');
                const avgHeadUpRateEl = document.getElementById('avgHeadUpRate');
                const totalQuestionsEl = document.getElementById('totalQuestions');
                const avgCorrectRateEl = document.getElementById('avgCorrectRate');
                const totalAnswersEl = document.getElementById('totalAnswers');
                const totalCoursesEl = document.getElementById('totalCourses');
                const totalMajorsEl = document.getElementById('totalMajors');
                
                if (totalStudentsEl) totalStudentsEl.textContent = data.total_students || 0;
                if (totalClassesEl) totalClassesEl.textContent = data.total_classes || 0;
                if (avgHeadUpRateEl) avgHeadUpRateEl.textContent = (data.avg_head_up_rate || 0) + '%';
                if (totalQuestionsEl) totalQuestionsEl.textContent = data.total_questions || 0;
                if (avgCorrectRateEl) avgCorrectRateEl.textContent = (data.avg_correct_rate || 0) + '%';
                if (totalAnswersEl) totalAnswersEl.textContent = data.total_answers || 0;
                if (totalCoursesEl) totalCoursesEl.textContent = data.total_courses || 0;
                if (totalMajorsEl) totalMajorsEl.textContent = data.total_majors || 0;
                
                // 刷新图表
                if (typeof initDashboardCharts === 'function') {
                    initDashboardCharts(data);
                }
            }
        })
        .catch(error => {
            console.error('加载仪表盘数据失败:', error);
        });
    }
    
    // 加载学生选择下拉框
    function loadStudentSelect() {
        fetch('/teacher/student/list', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                const students = result.data;
                const select = document.getElementById('recordStudentSelect');
                if (select) {
                    select.innerHTML = '<option value="">请选择学生</option>';
                    students.forEach(student => {
                        const option = document.createElement('option');
                        option.value = student.id;
                        option.textContent = student.name + ' (' + student.id + ')';
                        select.appendChild(option);
                    });
                }
            }
        })
        .catch(error => {
            console.error('加载学生选择下拉框失败:', error);
        });
    }
    
    // 获取学生记录
    function getStudentRecords() {
        const studentId = document.getElementById('recordStudentSelect').value;
        if (!studentId) return;
        
        fetch(`/teacher/student/records/${studentId}`, {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                const data = result.data;
                // 更新学生数据汇总
                document.getElementById('summaryVideo').textContent = data.video_count || 0;
                document.getElementById('summaryRate').textContent = data.avg_head_up_rate || '0.00';
                document.getElementById('summaryAudio').textContent = data.audio_count || 0;
                document.getElementById('summaryQuestions').textContent = data.question_count || 0;
                document.getElementById('summaryAnswers').textContent = data.answer_count || 0;
                document.getElementById('studentRecordSummary').style.display = 'block';
                
                // 更新视频记录
                const videoRecords = document.getElementById('studentVideoRecords');
                if (videoRecords) {
                    if (data.videos && data.videos.length > 0) {
                        videoRecords.innerHTML = data.videos.map(video => `
                            <div class="record-item">
                                <h5>${video.video_id}</h5>
                                <p>时间: ${video.create_time}</p>
                                <p>抬头率: ${video.head_up_rate}</p>
                            </div>
                        `).join('');
                    } else {
                        videoRecords.innerHTML = '<p>暂无视频记录</p>';
                    }
                }
                
                // 更新语音记录
                const audioRecords = document.getElementById('studentAudioRecords');
                if (audioRecords) {
                    if (data.audios && data.audios.length > 0) {
                        audioRecords.innerHTML = data.audios.map(audio => `
                            <div class="record-item">
                                <h5>${audio.audio_id}</h5>
                                <p>时间: ${audio.create_time}</p>
                                <p>内容: ${audio.content}</p>
                            </div>
                        `).join('');
                    } else {
                        audioRecords.innerHTML = '<p>暂无语音记录</p>';
                    }
                }
                
                // 更新答题记录
                const answerRecords = document.getElementById('studentAnswerRecords');
                if (answerRecords) {
                    if (data.answers && data.answers.length > 0) {
                        answerRecords.innerHTML = data.answers.map(answer => `
                            <div class="record-item">
                                <h5>${answer.question_title}</h5>
                                <p>时间: ${answer.submit_time}</p>
                                <p>答案: ${answer.content}</p>
                                <p>得分: ${answer.score}</p>
                            </div>
                        `).join('');
                    } else {
                        answerRecords.innerHTML = '<p>暂无答题记录</p>';
                    }
                }
            }
        })
        .catch(error => {
            console.error('获取学生记录失败:', error);
        });
    }
    
    // 智能助手功能
    function analyzeClass() {
        alert('班级分析功能待实现');
    }
    
    function viewStudentInsights() {
        alert('学生洞察功能待实现');
    }
    
    function generateClassReport() {
        alert('班级报告功能待实现');
    }
    
    // 加载班级列表
    function loadClassList() {
        console.log('开始加载班级列表...');
        fetch('/teacher/student/classes', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(result => {
            console.log('班级列表加载结果:', result);
            if (result.code === 200) {
                const classes = result.data;
                console.log('获取到班级列表:', classes);
                const dropdowns = document.querySelectorAll('#courseClassDropdown');
                
                dropdowns.forEach(dropdown => {
                    if (classes.length > 0) {
                        dropdown.innerHTML = classes.map(className => `
                            <div class="checkbox-item">
                                <input type="checkbox" name="courseClass" value="${className}">
                                <span>${className}</span>
                            </div>
                        `).join('');
                    } else {
                        dropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: #6c757d;">暂无班级数据</div>';
                    }
                });
            }
        })
        .catch(error => {
            console.error('加载班级列表失败:', error);
            const dropdowns = document.querySelectorAll('#courseClassDropdown');
            dropdowns.forEach(dropdown => {
                dropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: #dc3545;">加载失败</div>';
            });
        });
    };

    // 根据学号添加学生
    window.addStudentBy学号 = async function(context = 'create') {
        const inputId = context === 'create' ? 'addStudentIdToCourse' : 'addStudentIdToCourseManage';
        const studentId = document.getElementById(inputId).value.trim();
        
        if (!studentId) {
            alert('请输入学生学号');
            return;
        }
        
        try {
            const response = await fetch(`/teacher/student/filter?search=${encodeURIComponent(studentId)}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.code === 200) {
                const students = result.data;
                if (students.length === 0) {
                    alert('未找到该学号的学生');
                    return;
                }
                
                // 显示找到的学生，使用append模式
                if (typeof window.displayCourseStudents === 'function') {
                    window.displayCourseStudents(students, context, true);
                }
                // 清空输入框
                document.getElementById(inputId).value = '';
            } else {
                alert('获取学生信息失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    };

    // 批量导入学生到课程
    window.importStudentsForCourse = function(context = 'create') {
        // 这里可以复用现有的导入功能，或者实现一个专门的导入界面
        alert('批量导入功能待实现');
    };

    // 添加选中的学生到课程
    window.addSelectedStudentsToCourse = async function() {
        const courseId = document.getElementById('courseSelect').value;
        if (!courseId) {
            alert('请先选择课程');
            return;
        }
        
        // 从表格中提取学生ID
        const studentRows = document.querySelectorAll('#courseStudentList tbody tr');
        const studentIds = [];
        studentRows.forEach(row => {
            const studentId = row.cells[0].textContent;
            studentIds.push(studentId);
        });
        
        if (studentIds.length === 0) {
            alert('请先选择学生');
            return;
        }
        
        try {
            const response = await fetch('/teacher/course/add_students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course_id: courseId,
                    student_ids: studentIds
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('学生添加成功');
                // 刷新课程数据
                if (typeof window.loadCourseData === 'function') window.loadCourseData();
                // 清空选择的学生列表
                document.getElementById('courseStudentList').innerHTML = '<p style="color: var(--secondary-color); text-align: center;">请点击按钮选择学生</p>';
            } else {
                alert('添加失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    };

    // 显示课程学生列表
    function displayCourseStudents(students, context = 'create', append = false) {
        const containerId = context === 'create' ? 'createCourseStudentList' : 'courseStudentList';
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (students.length === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">没有找到学生</p>';
            return;
        }
        
        // 获取现有学生数据
        let existingStudents = [];
        if (append) {
            const existingRows = container.querySelectorAll('tbody tr');
            existingRows.forEach(row => {
                const studentId = row.cells[0].textContent;
                existingStudents.push({
                    id: studentId,
                    name: row.cells[1].textContent,
                    grade: row.cells[2].textContent,
                    major: row.cells[3].textContent,
                    class_name: row.cells[4].textContent
                });
            });
            
            // 合并学生数据，去重
            const studentMap = new Map();
            existingStudents.forEach(student => studentMap.set(student.id, student));
            students.forEach(student => studentMap.set(student.id, student));
            students = Array.from(studentMap.values());
        }
        
        container.innerHTML = `
            <div style="max-height: 300px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="position: sticky; top: 0; background: #f8f9fa; z-index: 1;">
                        <tr>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">年级</th>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">专业</th>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">班级</th>
                            <th style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr data-student-id="${student.id}">
                                <td style="padding: 8px; border: 1px solid #e9ecef;">${student.id}</td>
                                <td style="padding: 8px; border: 1px solid #e9ecef;">${student.name}</td>
                                <td style="padding: 8px; border: 1px solid #e9ecef;">${student.grade || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #e9ecef;">${student.major || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #e9ecef;">${student.class_name || '-'}</td>
                                <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">
                                    <button class="btn btn-danger" onclick="removeStudentFromList('${student.id}', '${context}')" style="padding: 4px 12px; font-size: 12px;">
                                        <i class="fas fa-trash"></i> 删除
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="margin-top: 10px; font-size: 14px; color: var(--secondary-color); text-align: right;">
                共 ${students.length} 名学生
            </div>
        `;
    }





    // 添加操作记录
    window.addOperationRecord = async function(type, content, extraData) {
        try {
            const response = await fetch('/teacher/operation/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    content: content,
                    extraData: extraData
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            if (result.code !== 200) {
                console.error('添加操作记录失败:', result.msg);
            }
        } catch (error) {
            console.error('添加操作记录失败:', error);
        }
    };

    // 新增学生
    window.addStudent = async function() {
        const studentId = document.getElementById('addStudentId').value.trim();
        const name = document.getElementById('addStudentName').value.trim();
        
        if (!studentId || !name) {
            alert('学号和姓名不能为空');
            return;
        }
        
        try {
            const response = await fetch('/teacher/student/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    name: name
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('添加成功');
                // 重置表单
                document.getElementById('addStudentId').value = '';
                document.getElementById('addStudentName').value = '';
                // 刷新学生列表
                window.getStudentList();
                // 刷新学生管理模块的操作记录
                if (typeof window.loadStudentOperationRecords === 'function') {
                    window.loadStudentOperationRecords();
                }
            } else {
                alert('添加失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    };

    // 重置新增学生表单
    window.resetAddStudentForm = function() {
        document.getElementById('addStudentId').value = '';
        document.getElementById('addStudentName').value = '';
    };

    // 切换学生管理子标签页
    window.switchStudentTab = function(tabName) {
        // 更新标签页按钮状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('switchStudentTab')) {
                btn.classList.remove('active');
            }
        });
        const activeBtn = document.querySelector(`.tab-btn[onclick*="switchStudentTab('${tabName}'"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // 更新标签页内容显示
        document.querySelectorAll('.student-tab-content').forEach(content => content.classList.remove('active'));
        const tabContent = document.getElementById(`student-${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // 如果切换到导入标签，加载班级列表
        if (tabName === 'import') {
            if (typeof window.loadClassList === 'function') window.loadClassList();
        }
        // 如果切换到导出标签，加载班级列表
        if (tabName === 'export') {
            if (typeof window.loadExportClassList === 'function') window.loadExportClassList();
        }
        // 如果切换到列表标签，加载学生列表和筛选选项
        if (tabName === 'list') {
            window.getStudentList();
            if (typeof window.loadStudentFilterOptions === 'function') {
                window.loadStudentFilterOptions();
            }
        }
        // 如果切换到操作记录标签，加载操作记录
        if (tabName === 'operation') {
            if (typeof window.loadStudentOperationRecords === 'function') {
                window.loadStudentOperationRecords();
            }
        }
    };
});