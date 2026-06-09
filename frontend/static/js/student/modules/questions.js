// 学生端问题管理模块
const questionsModule = {
    // 问题相关变量
    questionsList: null,
    questionsContainer: null,
    questionCount: null,
    loadQuestionsBtn: null,
    viewAnswersBtn: null,
    startQuizBtn: null,
    answerModal: null,
    currentQuestion: null,
    timerInterval: null,
    
    // 初始化问题管理
    init() {
        this.questionsList = document.getElementById('questionsList');
        this.questionsContainer = document.getElementById('questionsContainer');
        this.questionCount = document.getElementById('questionCount');
        this.loadQuestionsBtn = document.getElementById('loadQuestionsBtn');
        this.viewAnswersBtn = document.getElementById('viewAnswersBtn');
        this.startQuizBtn = document.getElementById('startQuizBtn');
        this.answerModal = document.getElementById('answerModal');
        
        this.bindEvents();
        // 初始加载问题列表
        this.loadActiveQuestions();
    },
    
    // 绑定事件
    bindEvents() {
        if (this.loadQuestionsBtn) {
            this.loadQuestionsBtn.addEventListener('click', () => this.loadActiveQuestions());
        }
        
        if (this.viewAnswersBtn) {
            this.viewAnswersBtn.addEventListener('click', () => this.viewMyAnswers());
        }
        
        if (this.startQuizBtn) {
            this.startQuizBtn.addEventListener('click', () => this.startQuiz());
        }
    },
    
    // 加载活跃问题
    loadActiveQuestions() {
        // 显示加载状态
        if (this.questionsList) {
            this.questionsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <p>加载问题中...</p>
                </div>
            `;
        }
        
        // 调用后端API获取活跃问题（添加时间戳避免缓存）
        const timestamp = new Date().getTime();
        fetch(`/student/questions/active?_t=${timestamp}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderQuestions(data.data);
            } else {
                console.error('获取问题失败:', data.msg);
                this.renderNoQuestions();
            }
        })
        .catch(error => {
            console.error('获取问题失败:', error);
            this.renderNoQuestions();
        });
    },
    
    // 渲染问题列表
    renderQuestions(questions) {
        if (!this.questionsList) return;
        
        if (!questions || questions.length === 0) {
            this.renderNoQuestions();
            return;
        }
        
        // 更新问题计数
        if (this.questionCount) {
            this.questionCount.textContent = questions.length;
        }
        
        // 渲染问题列表
        this.questionsList.innerHTML = questions.map(question => `
            <div class="question-item">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <h4 style="margin: 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">${question.title}</h4>
                    <span class="question-type">${this.getQuestionTypeText(question.question_type)}</span>
                </div>
                <p style="margin: 12px 0; color: var(--secondary-color); font-size: 14px; line-height: 1.5;">${question.content}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
                    <div style="display: flex; gap: 15px; font-size: 13px; color: var(--secondary-color);">
                        <span><i class="fas fa-clock"></i> ${question.time_limit}秒</span>
                        <span><i class="fas fa-star"></i> ${question.score}分</span>
                    </div>
                    <button class="btn btn-primary" onclick="questionsModule.openAnswerModal(${question.id}, ${JSON.stringify(question).replace(/"/g, '&quot;')})">
                        ${question.has_answered ? '查看答案' : '立即作答'}
                    </button>
                </div>
            </div>
        `).join('');
    },
    
    // 渲染无问题状态
    renderNoQuestions() {
        if (this.questionsList) {
            this.questionsList.innerHTML = `
                <div class="no-questions" style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    <i class="fas fa-inbox" style="font-size: 64px; margin-bottom: 20px; color: var(--primary-color); animation: pulse 2s infinite;"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">暂无活跃问题</p>
                    <p style="font-size: 14px; margin-top: 8px; color: var(--secondary-color);">老师还没有发布任何问题</p>
                    <button class="btn btn-primary" style="margin-top: 20px; padding: 12px 28px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);" onclick="questionsModule.loadActiveQuestions()">
                        <i class="fas fa-sync-alt"></i> 刷新列表
                    </button>
                </div>
            `;
        }
        
        if (this.questionCount) {
            this.questionCount.textContent = '0';
        }
    },
    
    // 清空问题列表（课程结束时调用）
    clearQuestions() {
        console.log('questionsModule: 清空问题列表');
        this.renderNoQuestions();
    },
    
    // 获取问题类型文本
    getQuestionTypeText(type) {
        const typeMap = {
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'judgment': '判断题',
            'subjective': '主观题',
            // 兼容旧数据
            'choice': '单选题',
            'text': '主观题',
            'fill_blank': '主观题'
        };
        return typeMap[type] || type;
    },
    
    // 打开答题模态框
    openAnswerModal(questionId, questionStr) {
        try {
            const question = JSON.parse(questionStr.replace(/&quot;/g, '"'));
            this.currentQuestion = question;
            
            // 填充模态框内容
            document.getElementById('modalQuestionTitle').textContent = question.title;
            document.getElementById('modalQuestionType').textContent = this.getQuestionTypeText(question.question_type);
            document.getElementById('modalQuestionScore').textContent = question.score + '分';
            document.getElementById('modalQuestionContent').textContent = question.content;
            
            // 生成答题表单
            this.generateAnswerForm(question);
            
            // 显示模态框
            if (this.answerModal) {
                this.answerModal.style.display = 'block';
                // 启动计时器
                this.startAnswerTimer(question.time_limit);
            }
        } catch (error) {
            console.error('解析问题数据失败:', error);
        }
    },
    
    // 生成答题表单
    generateAnswerForm(question) {
        const form = document.getElementById('answerForm');
        if (!form) return;
        
        form.innerHTML = '';
        
        switch (question.question_type) {
            case 'choice':
            case 'single_choice':
            case 'multiple_choice':
                // 选择题
                let options = question.options;
                // 如果 options 是字符串，解析为数组
                if (options && typeof options === 'string') {
                    // 处理 Windows 换行符 \r\n 和 Unix 换行符 \n
                    const normalizedOptions = options.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                    options = normalizedOptions.split('\n').map(opt => {
                        // 移除选项前缀（如 A. B. C. D.）
                        return opt.replace(/^[A-F][.、]\s*/i, '').trim();
                    }).filter(opt => opt);
                }
                if (options && Array.isArray(options)) {
                    options.forEach((option, index) => {
                        const optionItem = document.createElement('div');
                        optionItem.className = 'option-item';
                        optionItem.innerHTML = `
                            <input type="radio" name="answer" value="${String.fromCharCode(65 + index)}" id="option${index}">
                            <label for="option${index}"><strong style="color: var(--primary-color); margin-right: 8px;">${String.fromCharCode(65 + index)}.</strong>${option}</label>
                        `;
                        form.appendChild(optionItem);
                    });
                }
                break;
            
            case 'judgment':
                // 判断题
                const trueOption = document.createElement('div');
                trueOption.className = 'option-item';
                trueOption.innerHTML = `
                    <input type="radio" name="answer" value="true" id="trueOption">
                    <label for="trueOption">正确</label>
                `;
                form.appendChild(trueOption);
                
                const falseOption = document.createElement('div');
                falseOption.className = 'option-item';
                falseOption.innerHTML = `
                    <input type="radio" name="answer" value="false" id="falseOption">
                    <label for="falseOption">错误</label>
                `;
                form.appendChild(falseOption);
                break;
            
            case 'fill_blank':
                // 填空题
                const input = document.createElement('input');
                input.type = 'text';
                input.name = 'answer';
                input.className = 'form-control';
                input.style = 'width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px;';
                input.placeholder = '请输入答案';
                form.appendChild(input);
                break;
            
            case 'text':
                // 主观题
                const textarea = document.createElement('textarea');
                textarea.name = 'answer';
                textarea.className = 'form-control';
                textarea.style = 'width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 16px; min-height: 120px; resize: vertical;';
                textarea.placeholder = '请输入答案';
                form.appendChild(textarea);
                break;
        }
    },
    
    // 启动答题计时器
    startAnswerTimer(seconds) {
        const timeLeftEl = document.getElementById('timeLeft');
        let timeLeft = seconds;
        
        if (timeLeftEl) {
            timeLeftEl.textContent = timeLeft;
        }
        
        // 清除之前的计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // 启动新计时器
        this.timerInterval = setInterval(() => {
            timeLeft--;
            if (timeLeftEl) {
                timeLeftEl.textContent = timeLeft;
            }
            
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.submitAnswer();
            }
        }, 1000);
    },
    
    // 提交答案
    submitAnswer() {
        if (!this.currentQuestion) return;
        
        // 获取答案
        let answer = '';
        const form = document.getElementById('answerForm');
        if (form) {
            const radioInputs = form.querySelectorAll('input[type="radio"]:checked');
            if (radioInputs.length > 0) {
                answer = radioInputs[0].value;
            } else {
                const textInput = form.querySelector('input[type="text"]');
                const textareaInput = form.querySelector('textarea');
                if (textInput) {
                    answer = textInput.value;
                } else if (textareaInput) {
                    answer = textareaInput.value;
                }
            }
        }
        
        // 验证答案
        if (!answer) {
            alert('请输入答案');
            return;
        }
        
        // 停止计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // 调用后端API提交答案
        fetch('/student/submit_answer', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: this.currentQuestion.id,
                content: answer,
                time_spent: this.currentQuestion.time_limit - parseInt(document.getElementById('timeLeft').textContent)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                alert('答题成功！' + (data.data.is_correct ? '回答正确！' : '回答错误。'));
                // 关闭模态框
                this.closeAnswerModal();
                // 刷新问题列表
                this.loadActiveQuestions();
            } else {
                alert('答题失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('提交答案失败:', error);
            alert('提交答案失败，请稍后重试');
        });
    },
    
    // 关闭答题模态框
    closeAnswerModal() {
        if (this.answerModal) {
            this.answerModal.style.display = 'none';
        }
        
        // 清除计时器
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.currentQuestion = null;
    },
    
    // 查看我的答题记录
    viewMyAnswers() {
        // 调用后端API获取答题记录
        fetch('/student/my_answers', {
            method: 'GET',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderMyAnswers(data.data);
            } else {
                console.error('获取答题记录失败:', data.msg);
                alert('获取答题记录失败');
            }
        })
        .catch(error => {
            console.error('获取答题记录失败:', error);
            alert('获取答题记录失败，请稍后重试');
        });
    },
    
    // 渲染我的答题记录
    renderMyAnswers(data) {
        // 创建答题记录模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style = 'display: block; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); backdrop-filter: blur(5px);';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; margin: 50px auto; padding: 30px; border-radius: 16px; width: 800px; max-width: 95vw; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideIn 0.3s ease;">
                <div class="modal-header" style="border-bottom: 1px solid #e9ecef; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: var(--primary-color); font-size: 20px; font-weight: 600;">我的答题记录</h3>
                    <span class="close" onclick="this.parentElement.parentElement.parentElement.style.display='none'" style="float: right; font-size: 28px; cursor: pointer; color: var(--secondary-color); transition: all 0.3s ease; padding: 5px; border-radius: 50%;">&times;</span>
                </div>
                <div class="modal-body">
                    ${data.items && data.items.length > 0 ? data.items.map(answer => `
                        <div style="border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin-bottom: 15px; background: white; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; position: relative; overflow: hidden;">
                            <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${answer.is_correct ? '#28a745' : '#dc3545'};"></div>
                            <h4 style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 16px; font-weight: 600; padding-left: 10px;">${answer.question_title}</h4>
                            <div style="display: flex; gap: 15px; margin-bottom: 10px; font-size: 14px; padding-left: 10px;">
                                <span style="background: #e3f2fd; color: #0277bd; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${this.getQuestionTypeText(answer.question_type)}</span>
                                <span style="background: ${answer.is_correct ? '#d4edda' : '#f8d7da'}; color: ${answer.is_correct ? '#155724' : '#721c24'}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${answer.is_correct ? '正确' : '错误'}</span>
                                <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${answer.score}分</span>
                            </div>
                            <p style="margin: 10px 0; color: var(--secondary-color); font-size: 14px; line-height: 1.5; padding-left: 10px;">我的答案: ${answer.content}</p>
                            <div style="font-size: 13px; color: var(--secondary-color); padding-left: 10px; margin-top: 10px;">
                                <span><i class="fas fa-clock"></i> 提交时间: ${answer.submit_time}</span>
                                <span style="margin-left: 20px;"><i class="fas fa-stopwatch"></i> 用时: ${answer.time_spent}秒</span>
                            </div>
                        </div>
                    `).join('') : `
                        <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                            <i class="fas fa-inbox" style="font-size: 64px; margin-bottom: 20px; color: var(--primary-color);"></i>
                            <p style="font-size: 18px; margin-bottom: 10px;">暂无答题记录</p>
                            <p style="font-size: 14px; margin-top: 8px; color: var(--secondary-color);">您还没有回答过任何问题</p>
                        </div>
                    `}
                </div>
                <div class="modal-footer" style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 20px; text-align: center;">
                    <button class="btn btn-primary" onclick="this.parentElement.parentElement.parentElement.style.display='none'" style="padding: 10px 24px; font-size: 16px; font-weight: 600;">
                        <i class="fas fa-times"></i> 关闭
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    // 开始答题竞赛
    startQuiz() {
        alert('答题竞赛功能即将上线，敬请期待！');
    },
    
    // 按题型筛选问题
    filterQuestionsByType(type) {
        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 这里可以实现按题型筛选的逻辑
        console.log('筛选题型:', type);
    },
    
    // 按学科筛选问题
    filterQuestionsBySubject(subject) {
        // 更新按钮状态
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // 这里可以实现按学科筛选的逻辑
        console.log('筛选学科:', subject);
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questionsModule;
} else {
    window.questionsModule = questionsModule;
}
