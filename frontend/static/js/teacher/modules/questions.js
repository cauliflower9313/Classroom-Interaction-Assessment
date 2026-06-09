/**
 * 教师端问题管理模块
 */

// 问题管理模块
const questionsModule = {
    // 切换问题管理标签页
    switchQuestionTab(tabName, event) {
        // 阻止事件冒泡
        if (event) {
            event.preventDefault();
        }
        
        // 隐藏所有问题标签内容
        document.querySelectorAll('.question-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 显示选中的标签内容
        const targetTab = document.getElementById(tabName + '-question-tab');
        if (targetTab) {
            targetTab.classList.add('active');
        } else {
            console.error('问题标签页未找到:', tabName + '-question-tab');
        }
        
        // 高亮选中的标签按钮
        document.querySelectorAll('.question-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 查找并高亮当前标签按钮
        const tabButtons = document.querySelectorAll('.question-tab-btn');
        for (let btn of tabButtons) {
            // 检查按钮的文本内容是否包含对应的标签名称
            if ((tabName === 'add' && btn.textContent.includes('添加新问题')) ||
                (tabName === 'list' && btn.textContent.includes('问题列表')) ||
                (tabName === 'import' && btn.textContent.includes('导入问题')) ||
                (tabName === 'statistics' && btn.textContent.includes('答题统计'))) {
                btn.classList.add('active');
                break;
            }
        }
    },
    
    // 获取问题列表
    getQuestionList() {
        fetch("/teacher/question/list", {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            const tbody = document.getElementById("questionTableBody");
            const tableContainer = tbody.closest('.table-container');
            
            // 设置表格容器的样式，添加垂直滚动
            if (tableContainer) {
                tableContainer.style.maxHeight = '500px';
                tableContainer.style.overflowY = 'auto';
            }
            
            tbody.innerHTML = "";
            if (data.code !== 200) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">${data.msg}</td></tr>`;
                return;
            }
            const questions = data.data.items || [];
            if (questions.length === 0) {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center;">暂无问题数据</td></tr>`;
                return;
            }
            // 按创建时间倒序排列，最新的问题显示在前面
            const sortedQuestions = questions.sort((a, b) => new Date(b.create_time) - new Date(a.create_time));
            sortedQuestions.forEach((question, index) => {
                const tr = document.createElement("tr");
                const typeMap = {
                    'text': '主观题',
                    'choice': '选择题',
                    'single_choice': '单选题',
                    'multiple_choice': '多选题',
                    'judgment': '判断题',
                    'fill_blank': '填空题',
                    'subjective': '主观题'
                };
                // 序号从大到小显示：最新的问题序号最大
                const displayIndex = sortedQuestions.length - index;
                tr.innerHTML = `
                    <td><input type="checkbox" class="question-checkbox" value="${question.id}"></td>
                    <td>${displayIndex}</td>
                    <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${question.title}</td>
                    <td>${typeMap[question.question_type] || question.question_type}</td>
                    <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${question.category || '默认分类'}</td>
                    <td>${question.score}</td>
                    <td style="text-align: center;">
                        <span class="status-badge ${question.is_active ? 'active' : 'inactive'}" style="padding: 4px 12px; font-size: 12px;">
                            ${question.is_active ? '已发布' : '未发布'}
                        </span>
                    </td>
                    <td style="white-space: nowrap; font-size: 12px;">${question.create_time}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-info btn-sm" onclick="questionsModule.viewQuestionDetail(${question.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" title="查看详情/讨论区">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${question.is_active ? 
                            `<button class="btn btn-success btn-sm" onclick="viewQuestionAnswers(${question.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" title="查看答题统计"><i class="fas fa-chart-bar"></i></button>
                            <button class="btn btn-warning btn-sm" onclick="unpublishQuestion(${question.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" title="撤回发布"><i class="fas fa-undo"></i></button>` :
                            `<button class="btn btn-primary btn-sm" onclick="publishQuestion(${question.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" title="发布问题"><i class="fas fa-paper-plane"></i></button>
                            <button class="btn btn-secondary btn-sm" onclick="editQuestion(${question.id})" style="padding: 4px 8px; font-size: 12px; margin-right: 4px;" title="编辑"><i class="fas fa-edit"></i></button>`
                        }
                        <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${question.id})" style="padding: 4px 8px; font-size: 12px;" title="删除"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }).catch(err => {
            console.error('获取问题列表失败:', err);
            alert('网络错误，请重试');
        });
    },
    
    // 一键发布所有问题
    publishAllQuestions() {
        if (!confirm('确定要一键发布所有未发布的问题吗？')) {
            return;
        }
        
        fetch("/teacher/question/list", {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                const questions = data.data.items || [];
                const unpublishedQuestions = questions.filter(q => !q.is_active);
                if (unpublishedQuestions.length === 0) {
                    alert("没有未发布的问题！");
                    return;
                }
                
                let successCount = 0;
                let errorCount = 0;
                
                // 逐个发布问题
                unpublishedQuestions.forEach((question, index) => {
                    setTimeout(() => {
                        fetch("/teacher/question/publish", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            credentials: "include",
                            body: JSON.stringify({ question_id: question.id })
                        }).then(res => res.json()).then(result => {
                            if (result.code === 200) {
                                successCount++;
                            } else {
                                errorCount++;
                            }
                            
                            // 最后一个请求完成后显示结果
                            if (index === unpublishedQuestions.length - 1) {
                                setTimeout(() => {
                                    alert(`一键发布完成！\n成功：${successCount}个\n失败：${errorCount}个`);
                                    questionsModule.getQuestionList(); // 刷新列表
                                }, 500);
                            }
                        }).catch(() => {
                            errorCount++;
                        });
                    }, index * 200); // 间隔200ms避免请求过于密集
                });
            } else {
                alert("获取问题列表失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    // 删除选中问题
    deleteSelectedQuestions() {
        const selectedCheckboxes = document.querySelectorAll('.question-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
        
        if (selectedIds.length === 0) {
            alert('请选择要删除的问题');
            return;
        }
        
        if (!confirm(`确定要删除这 ${selectedIds.length} 个问题吗？删除后将无法恢复，包括所有学生的答题记录。`)) {
            return;
        }
        
        let successCount = 0;
        let errorCount = 0;
        
        // 逐个删除问题
        selectedIds.forEach((questionId, index) => {
            setTimeout(() => {
                fetch("/teacher/question/delete", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "include",
                    body: JSON.stringify({ question_id: questionId })
                }).then(res => res.json()).then(result => {
                    if (result.code === 200) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                    
                    // 最后一个请求完成后显示结果
                    if (index === selectedIds.length - 1) {
                        setTimeout(() => {
                            alert(`删除完成！\n成功：${successCount}个\n失败：${errorCount}个`);
                            questionsModule.getQuestionList(); // 刷新列表
                            // 刷新仪表盘数据
                            if (typeof loadDashboardData === 'function') {
                                console.log('批量删除问题后刷新仪表盘数据...');
                                loadDashboardData();
                            }
                        }, 500);
                    }
                }).catch(() => {
                    errorCount++;
                });
            }, index * 200); // 间隔200ms避免请求过于密集
        });
    },
    
    // 筛选问题列表
    filterQuestions() {
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
    },
    
    // 全选/取消全选问题
    toggleSelectAll() {
        const selectAllCheckbox = document.getElementById('selectAllQuestions');
        const questionCheckboxes = document.querySelectorAll('#questionTableBody input[type="checkbox"]');
        
        questionCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCheckbox.checked;
        });
    },
    
    // 切换问题选项显示
    toggleQuestionOptions() {
        const questionType = document.getElementById("questionType").value;
        const optionsDiv = document.getElementById("questionOptions");
        const correctAnswerGroup = document.getElementById("correctAnswerGroup");
        
        if (questionType === 'choice') {
            optionsDiv.style.display = 'block';
            // 清空选项区域
            optionsDiv.innerHTML = '';
            
            // 创建选项输入框容器
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'optionsContainer';
            
            // 创建默认的三个选项
            for (let i = 0; i < 3; i++) {
                const optionChar = String.fromCharCode(65 + i); // A=65, B=66, etc.
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
                optionDiv.innerHTML = `
                    <label style="margin-right: 8px; font-weight: bold;">${optionChar}.</label>
                    <input type="text" class="option-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="选项${i+1}">
                `;
                optionsContainer.appendChild(optionDiv);
            }
            
            // 添加添加选项按钮
            const addButton = document.createElement('button');
            addButton.className = 'add-option-btn btn btn-info';
            addButton.innerHTML = '<i class="fas fa-plus"></i> 添加选项';
            addButton.onclick = function(e) {
                e.preventDefault();
                const optionsContainer = document.getElementById("optionsContainer");
                const currentOptions = optionsContainer.querySelectorAll('.option-input');
                const nextOption = String.fromCharCode(65 + currentOptions.length); // A=65, B=66, etc.
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
                optionDiv.innerHTML = `
                    <label style="margin-right: 8px; font-weight: bold;">${nextOption}.</label>
                    <input type="text" class="option-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="选项${currentOptions.length+1}">
                `;
                optionsContainer.appendChild(optionDiv);
            };
            
            optionsDiv.appendChild(optionsContainer);
            optionsDiv.appendChild(addButton);
            
            correctAnswerGroup.querySelector('label').innerText = '正确答案（选项字母）';
            document.getElementById("correctAnswer").placeholder = "如：A 或 A,B（多选）";
        } else if (questionType === 'judgment') {
            optionsDiv.style.display = 'none';
            correctAnswerGroup.querySelector('label').innerText = '正确答案';
            // 替换为下拉列表
            const correctAnswerInput = document.getElementById("correctAnswer");
            if (correctAnswerInput.tagName === 'INPUT') {
                const selectElement = document.createElement('select');
                selectElement.id = 'correctAnswer';
                selectElement.style = correctAnswerInput.style.cssText;
                selectElement.innerHTML = `
                    <option value="正确">正确</option>
                    <option value="错误">错误</option>
                `;
                correctAnswerInput.parentNode.replaceChild(selectElement, correctAnswerInput);
            }
        } else {
            optionsDiv.style.display = 'none';
            correctAnswerGroup.querySelector('label').innerText = '正确答案';
            // 确保是输入框
            const correctAnswerSelect = document.getElementById("correctAnswer");
            if (correctAnswerSelect.tagName === 'SELECT') {
                const inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.id = 'correctAnswer';
                inputElement.style = correctAnswerSelect.style.cssText;
                inputElement.placeholder = "输入正确答案";
                correctAnswerSelect.parentNode.replaceChild(inputElement, correctAnswerSelect);
            } else {
                document.getElementById("correctAnswer").placeholder = "输入正确答案";
            }
        }
    },
    
    // 添加问题
    addQuestion() {
        const title = document.getElementById("questionTitle").value;
        const questionType = document.getElementById("questionType").value;
        let optionsText = '';
        const correctAnswer = document.getElementById("correctAnswer").value;
        const questionScore = document.getElementById("questionScore").value;
        const timeLimit = document.getElementById("timeLimit").value;
        const questionCategory = document.getElementById("questionCategory").value;
        const msg = document.getElementById("questionMessage");

        if (!title || !correctAnswer) {
            msg.className = "message error";
            msg.innerText = "问题标题和正确答案不能为空";
            return;
        }

        if (questionType === 'choice') {
            const optionInputs = document.querySelectorAll('.option-input');
            const options = [];
            optionInputs.forEach((input, index) => {
                const optionText = input.value.trim();
                if (optionText) {
                    const optionChar = String.fromCharCode(65 + index); // A=65, B=66, etc.
                    options.push(`${optionChar}. ${optionText}`);
                }
            });
            if (options.length === 0) {
                msg.className = "message error";
                msg.innerText = "选择题必须填写选项";
                return;
            }
            optionsText = options.join('\n');
        }

        const questionData = {
            title: title,
            question_type: questionType,
            options: questionType === 'choice' ? optionsText : '',
            correct_answer: correctAnswer,
            score: parseInt(questionScore),
            time_limit: parseInt(timeLimit),
            category: questionCategory
        };

        fetch("/teacher/question/add", {
            method: "POST",
            credentials: "include",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(questionData)
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                msg.className = "message success";
                msg.innerText = "问题添加成功！";
                // 清空输入框
                document.getElementById("questionTitle").value = "";
                // 清空选项输入框
                const optionInputs = document.querySelectorAll('.option-input');
                optionInputs.forEach(input => {
                    input.value = "";
                });
                document.getElementById("correctAnswer").value = "";
                document.getElementById("questionScore").value = "5";
                document.getElementById("timeLimit").value = "60";
                document.getElementById("questionCategory").value = "";
                // 自动切换到问题列表标签页并刷新
                questionsModule.switchQuestionTab('list');
                questionsModule.getQuestionList();
                // 刷新仪表盘数据
                if (typeof loadDashboardData === 'function') {
                    console.log('添加问题后刷新仪表盘数据...');
                    loadDashboardData();
                }
            } else {
                msg.className = "message error";
                msg.innerText = "添加失败：" + data.msg;
            }
        }).catch(err => {
            msg.className = "message error";
            msg.innerText = "网络错误：" + err.message;
        });
    },
    
    // 发布单个问题
    publishQuestion(questionId) {
        if (!confirm('确定要发布这个问题吗？发布后学生将可以开始答题。')) {
            return;
        }
        
        fetch("/teacher/question/publish", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ question_id: questionId })
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                alert("问题发布成功！");
                questionsModule.getQuestionList(); // 刷新列表
            } else {
                alert("发布失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    // 撤回问题
    unpublishQuestion(questionId) {
        if (!confirm('确定要撤回这个问题吗？撤回后学生将无法继续答题。')) {
            return;
        }
        
        fetch("/teacher/question/unpublish", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ question_id: questionId })
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                alert("问题撤回成功！");
                questionsModule.getQuestionList(); // 刷新列表
            } else {
                alert("撤回失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    // 删除问题
    deleteQuestion(questionId) {
        if (!confirm('确定要删除这个问题吗？删除后将无法恢复，包括所有学生的答题记录。')) {
            return;
        }
        
        fetch("/teacher/question/delete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ question_id: questionId })
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                alert("问题删除成功！");
                questionsModule.getQuestionList(); // 刷新列表
                // 刷新仪表盘数据
                if (typeof loadDashboardData === 'function') {
                    console.log('删除问题后刷新仪表盘数据...');
                    loadDashboardData();
                }
            } else {
                alert("删除失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    // 查看问题答题情况
    viewQuestionAnswers(questionId) {
        fetch(`/teacher/question/answers/${questionId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                questionsModule.showAnswersModal(data.data);
            } else {
                alert("获取答题情况失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    viewQuestionDetail(questionId) {
        fetch(`/teacher/question/detail/${questionId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                questionsModule.showQuestionDetailModal(data.data);
            } else {
                alert("获取问题详情失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
    showQuestionDetailModal(question) {
        const modal = document.createElement('div');
        modal.id = 'question-detail-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            justify-content: center; align-items: center;
        `;
        
        const typeMap = {
            'text': '主观题',
            'choice': '选择题',
            'judgment': '判断题',
            'fill_blank': '填空题'
        };
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 800px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: white; z-index: 1;">
                    <div>
                        <h3 style="margin: 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">问题详情</h3>
                        <div style="display: flex; gap: 10px; margin-top: 8px;">
                            <span style="background: #e3f2fd; color: #0277bd; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${typeMap[question.question_type] || question.question_type}</span>
                            <span style="background: #fff3cd; color: #856404; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${question.score}分</span>
                            <span style="background: ${question.is_active ? '#d4edda' : '#f8d7da'}; color: ${question.is_active ? '#155724' : '#721c24'}; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${question.is_active ? '已发布' : '未发布'}</span>
                        </div>
                    </div>
                    <button onclick="questionsModule.closeQuestionDetailModal()" style="background: none; border: none; font-size: 28px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>
                
                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">${question.title}</h4>
                        ${question.content ? `<p style="margin: 0; color: var(--secondary-color); font-size: 14px; line-height: 1.6;">${question.content}</p>` : ''}
                    </div>
                    
                    ${(question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && question.options ? `
                        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <h5 style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 14px;">选项：</h5>
                            ${question.options.split('\n').map(opt => `<div style="padding: 5px 0; color: var(--dark-color); font-size: 14px;">${opt}</div>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-radius: 8px;">
                        <span style="font-weight: 600; color: #155724;">正确答案：</span>
                        <span style="color: #155724;">${question.correct_answer}</span>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">
                            <i class="fas fa-comments" style="color: var(--primary-color); margin-right: 8px;"></i>讨论区
                        </h5>
                        <div id="question-comments-container" style="max-height: 300px; overflow-y: auto;">
                            <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                                <i class="fas fa-spinner fa-spin"></i> 加载评论中...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                questionsModule.closeQuestionDetailModal();
            }
        });
        
        questionsModule.loadQuestionComments(questionId);
    },
    
    loadQuestionComments(questionId) {
        const container = document.getElementById('question-comments-container');
        if (!container) return;
        
        fetch(`/teacher/question/${questionId}/comments`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                questionsModule.renderQuestionComments(data.data.comments || []);
            } else {
                container.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                        <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i>加载评论失败
                    </div>
                `;
            }
        }).catch(err => {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i>网络错误
                </div>
            `;
        });
    },
    
    renderQuestionComments(comments) {
        const container = document.getElementById('question-comments-container');
        if (!container) return;
        
        if (!comments || comments.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--secondary-color); background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-comment-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p style="font-size: 14px; margin: 0;">暂无评论</p>
                </div>
            `;
            return;
        }
        
        const renderCommentItem = (comment, depth = 0) => {
            const indentStyle = depth > 0 ? `margin-left: ${depth * 30}px; border-left: 3px solid var(--primary-color);` : '';
            const authorBadge = comment.author_type === 'teacher' ?
                `<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;"><i class="fas fa-chalkboard-teacher"></i> 教师</span>` :
                `<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;"><i class="fas fa-user"></i> 学生</span>`;
            
            let html = `
                <div class="comment-item" style="background: ${depth > 0 ? '#f8f9fa' : 'white'}; border-radius: 8px; padding: 12px; margin-bottom: 10px; border: 1px solid #e9ecef; ${indentStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 32px; height: 32px; background: linear-gradient(135deg, var(--primary-color), #0056b3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px; margin-right: 10px;">
                                ${comment.author_name.charAt(0)}
                            </div>
                            <div>
                                <div style="display: flex; align-items: center;">
                                    <span style="font-weight: 600; color: var(--dark-color); font-size: 13px;">${comment.author_name}</span>
                                    ${authorBadge}
                                </div>
                                <span style="font-size: 11px; color: var(--secondary-color);">${comment.create_time}</span>
                            </div>
                        </div>
                    </div>
                    <p style="margin: 0; color: var(--dark-color); font-size: 13px; line-height: 1.5; padding-left: 42px;">${comment.content}</p>
                </div>
            `;
            
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    html += renderCommentItem(reply, depth + 1);
                });
            }
            
            return html;
        };
        
        container.innerHTML = comments.map(comment => renderCommentItem(comment)).join('');
    },
    
    closeQuestionDetailModal() {
        const modal = document.getElementById('question-detail-modal');
        if (modal) {
            modal.remove();
        }
    },
    
    // 编辑问题
    editQuestion(questionId) {
        fetch(`/teacher/question/detail/${questionId}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                questionsModule.showEditModal(data.data);
            } else {
                alert("获取问题详情失败：" + data.msg);
            }
        }).catch(err => {
            alert("网络错误：" + err.message);
        });
    },
    
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
            background: white; padding: 25px; border-radius: 8px; 
            max-width: 900px; max-height: 95vh; overflow-y: auto;
            width: 90%;
        `;

        modalContent.innerHTML = `
            <h3 style="margin-bottom: 16px;">编辑问题</h3>
            <form id="editQuestionForm">
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题标题</label>
                    <input type="text" id="editTitle" value="${question.title}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题类型</label>
                    <select id="editType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="text" ${question.question_type === 'text' || question.question_type === 'subjective' ? 'selected' : ''}>文本题</option>
                        <option value="single_choice" ${question.question_type === 'choice' || question.question_type === 'single_choice' ? 'selected' : ''}>单选题</option>
                        <option value="multiple_choice" ${question.question_type === 'multiple_choice' ? 'selected' : ''}>多选题</option>
                        <option value="judgment" ${question.question_type === 'judgment' ? 'selected' : ''}>判断题</option>
                        <option value="fill_blank" ${question.question_type === 'fill_blank' ? 'selected' : ''}>填空题</option>
                    </select>
                </div>
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">问题分类</label>
                    <div class="dropdown-checkbox" onclick="toggleEditCategoryDropdown(event)">
                        <div class="dropdown-header">
                            <span class="selected-text" id="editCategorySelectedText">${question.category || '请选择分类'}</span>
                        </div>
                        <div class="dropdown-content" id="editCategoryDropdownContent">
                            <!-- 分类选项将通过JavaScript动态生成 -->
                        </div>
                    </div>
                    <input type="hidden" id="editCategory" value="${question.category || ''}">
                </div>
                <div style="margin-bottom: 12px; display: ${(question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice') ? 'block' : 'none'};" id="editOptionsGroup">
                    <label style="display: block; margin-bottom: 4px; font-weight: bold;">选项</label>
                    <div id="editOptionsContainer">
                        <!-- 选项输入框将通过JavaScript动态生成 -->
                    </div>
                    <button type="button" class="add-option-btn btn btn-info" onclick="addEditOption()" style="margin-top: 8px;">
                        <i class="fas fa-plus"></i> 添加选项
                    </button>
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
            if (e.target === modal) questionsModule.closeEditModal();
        };

        document.body.appendChild(modal);
        window.currentEditModal = modal;
        
        // 加载编辑模态框的分类列表
        questionsModule.loadEditCategories();
        
        // 检查当前问题的分类是否在分类列表中，如果不在，添加到本地存储
        if (question.category) {
            let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
            if (!categories.includes(question.category)) {
                categories.push(question.category);
                localStorage.setItem('questionCategories', JSON.stringify(categories));
                // 重新渲染分类下拉列表
                questionsModule.renderEditCategoryDropdown(categories);
            }
        }
        
        // 生成编辑选项输入框
        if (question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
            questionsModule.generateEditOptions(question.options);
        }

        // 添加问题类型切换事件监听器
        const editTypeSelect = document.getElementById('editType');
        if (editTypeSelect) {
            editTypeSelect.addEventListener('change', function() {
                const questionType = this.value;
                const editOptionsGroup = document.getElementById('editOptionsGroup');
                if (editOptionsGroup) {
                    const isChoiceType = questionType === 'choice' || questionType === 'single_choice' || questionType === 'multiple_choice';
                    editOptionsGroup.style.display = isChoiceType ? 'block' : 'none';
                    if (isChoiceType) {
                        questionsModule.generateEditOptions('');
                    }
                }
            });
        }
    },
    
    // 加载编辑模态框的分类列表
    loadEditCategories() {
        // 从本地存储获取分类
        let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
        // 如果没有分类，添加默认分类
        if (categories.length === 0) {
            categories = ['默认分类'];
            localStorage.setItem('questionCategories', JSON.stringify(categories));
        }
        this.renderEditCategoryDropdown(categories);
    },
    
    // 渲染编辑模态框的分类下拉列表
    renderEditCategoryDropdown(categories) {
        const dropdownContent = document.getElementById('editCategoryDropdownContent');
        if (!dropdownContent) return;
        
        let html = '';
        categories.forEach(category => {
            html += `
                <div class="checkbox-item" onclick="selectEditCategory('${category}')">
                    <span>${category}</span>
                </div>
            `;
        });
        
        // 添加添加新分类的选项
        html += `
            <div style="border-top: 1px solid #e9ecef; margin-top: 10px; padding-top: 10px;">
                <div class="checkbox-item" onclick="addNewEditCategory()">
                    <i class="fas fa-plus" style="color: var(--primary-color); margin-right: 8px;"></i>
                    <span>添加自定义分类</span>
                </div>
            </div>
        `;
        
        dropdownContent.innerHTML = html;
    },
    
    // 切换编辑模态框的分类下拉列表
    toggleEditCategoryDropdown(event) {
        event.stopPropagation();
        const dropdown = event.currentTarget;
        dropdown.classList.toggle('active');
    },
    
    // 选择编辑模态框的分类
    selectEditCategory(category) {
        document.getElementById('editCategorySelectedText').textContent = category;
        document.getElementById('editCategory').value = category;
        // 关闭下拉列表
        const dropdown = document.querySelector('#editQuestionForm .dropdown-checkbox');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    },
    
    // 在编辑模态框中添加新分类
    addNewEditCategory() {
        const newCategory = prompt('请输入新的分类名称：');
        if (newCategory && newCategory.trim()) {
            let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
            // 检查分类是否已存在
            if (!categories.includes(newCategory.trim())) {
                categories.push(newCategory.trim());
                localStorage.setItem('questionCategories', JSON.stringify(categories));
                // 重新渲染分类下拉列表
                questionsModule.renderEditCategoryDropdown(categories);
                // 选择新添加的分类
                questionsModule.selectEditCategory(newCategory.trim());
            } else {
                alert('该分类已存在');
            }
        }
    },
    
    // 生成编辑选项输入框
    generateEditOptions(optionsText) {
        const optionsContainer = document.getElementById('editOptionsContainer');
        if (!optionsContainer) return;
        
        // 清空容器
        optionsContainer.innerHTML = '';
        
        let options = [];
        if (optionsText) {
            // 处理 Windows 换行符 \r\n 和 Unix 换行符 \n
            const normalizedOptions = optionsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            options = normalizedOptions.split('\n').filter(line => line.trim() !== '');
        }
        
        // 如果没有选项，创建默认的三个选项
        if (options.length === 0) {
            for (let i = 0; i < 3; i++) {
                const optionChar = String.fromCharCode(65 + i); // A=65, B=66, etc.
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
                optionDiv.innerHTML = `
                    <label style="margin-right: 8px; font-weight: bold;">${optionChar}.</label>
                    <input type="text" class="edit-option-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="选项${i+1}">
                `;
                optionsContainer.appendChild(optionDiv);
            }
        } else {
            // 为每个现有选项创建输入框
            options.forEach((option, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
                // 提取选项文本（去掉选项字母和点）
                const optionText = option.replace(/^[A-Z]\.\s*/, '');
                const optionChar = String.fromCharCode(65 + index); // A=65, B=66, etc.
                optionDiv.innerHTML = `
                    <label style="margin-right: 8px; font-weight: bold;">${optionChar}.</label>
                    <input type="text" class="edit-option-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" value="${optionText}">
                `;
                optionsContainer.appendChild(optionDiv);
            });
        }
    },
    
    // 添加编辑选项
    addEditOption() {
        const optionsContainer = document.getElementById('editOptionsContainer');
        if (!optionsContainer) return;
        
        const currentOptions = optionsContainer.querySelectorAll('.edit-option-input');
        const nextOption = String.fromCharCode(65 + currentOptions.length); // A=65, B=66, etc.
        const optionDiv = document.createElement('div');
        optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
        optionDiv.innerHTML = `
            <label style="margin-right: 8px; font-weight: bold;">${nextOption}.</label>
            <input type="text" class="edit-option-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="选项${currentOptions.length+1}">
        `;
        optionsContainer.appendChild(optionDiv);
    },
    
    // 关闭编辑模态框
    closeEditModal() {
        if (window.currentEditModal) {
            document.body.removeChild(window.currentEditModal);
            window.currentEditModal = null;
        }
    },
    
    // 显示答题情况模态框
    showAnswersModal(data) {
        const answers = data.answers;
        const question = data.question;
        
        let modalContent = `
            <h3>${question.title} - 答题情况</h3>
            <p><strong>题型：</strong>${question.question_type}</p>
            <p><strong>正确答案：</strong>${question.correct_answer}</p>
            <p><strong>总答题数：</strong>${data.total_count}</p>
            <p><strong>正确数：</strong>${data.correct_count}</p>
            <p><strong>正确率：</strong>${(data.correct_count / data.total_count * 100).toFixed(1)}%</p>
            <hr>
            <h4>详细答题记录：</h4>
            <div style="max-height: 300px; overflow-y: auto;">
        `;
        
        answers.forEach(answer => {
            modalContent += `
                <div style="border: 1px solid #ddd; padding: 10px; margin: 5px 0; border-radius: 4px; background-color: ${answer.is_correct ? '#d4edda' : '#f8d7da'};">
                    <p><strong>${answer.student_name} (${answer.student_id})</strong></p>
                    <p>答案：${answer.content}</p>
                    <p>得分：${answer.score} | 用时：${answer.time_spent}秒</p>
                    <p>提交时间：${answer.submit_time}</p>
                </div>
            `;
        });
        
        modalContent += '</div>';
        
        // 创建模态框
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
            justify-content: center; align-items: center;
        `;
        
        const modalContentDiv = document.createElement('div');
        modalContentDiv.style.cssText = `
            background: white; padding: 20px; border-radius: 8px; 
            max-width: 600px; max-height: 80vh; overflow-y: auto;
        `;
        modalContentDiv.innerHTML = modalContent;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        closeBtn.style.cssText = 'margin-top: 10px; padding: 5px 10px;';
        closeBtn.onclick = () => document.body.removeChild(modal);
        
        modalContentDiv.appendChild(closeBtn);
        modal.appendChild(modalContentDiv);
        modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
        };
        
        document.body.appendChild(modal);
    },
    
    // 初始化问题管理模块
    init() {
        console.log('问题管理模块初始化');
        // 加载分类列表
        this.loadCategories();
    },
    
    // 导入问题
    importQuestions(event) {
        // 阻止表单默认提交行为
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const fileInput = document.getElementById('importFile');
        const msg = document.getElementById('importMessage');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            msg.className = "message error";
            msg.innerText = "请选择要导入的文件";
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        formData.append('auto_category', false);
        
        msg.className = "message info";
        msg.innerText = "正在导入问题，请稍候...";
        
        fetch('/teacher/question/import', {
            method: 'POST',
            credentials: 'include',
            body: formData
        }).then(res => res.json()).then(data => {
            if (data.code === 200) {
                msg.className = "message success";
                msg.innerText = `导入成功，共导入 ${data.data.count} 个问题`;
                
                // 重置导入表单，恢复文件上传页面
                setTimeout(() => {
                    questionsModule.resetImportForm();
                }, 1500);
                
                // 导入成功后，获取问题列表并提取新的类别
                fetch("/teacher/question/list", {
                    method: "GET",
                    credentials: "include"
                }).then(res => res.json()).then(listData => {
                    if (listData.code === 200) {
                        const questions = listData.data.items || [];
                        const categories = new Set(JSON.parse(localStorage.getItem('questionCategories') || '[]'));
                        
                        // 提取所有问题的类别
                        questions.forEach(question => {
                            if (question.category) {
                                categories.add(question.category);
                            }
                        });
                        
                        // 更新本地存储
                        localStorage.setItem('questionCategories', JSON.stringify([...categories]));
                    }
                });
                
                // 自动切换到问题列表标签页并刷新
                questionsModule.switchQuestionTab('list');
                questionsModule.getQuestionList();
                // 刷新仪表盘数据
                if (typeof loadDashboardData === 'function') {
                    console.log('导入问题后刷新仪表盘数据...');
                    loadDashboardData();
                }
            } else {
                msg.className = "message error";
                msg.innerText = "导入失败：" + data.msg;
            }
        }).catch(err => {
            msg.className = "message error";
            msg.innerText = "网络错误：" + err.message;
        });
    },
    
    // 重置导入表单
    resetImportForm() {
        document.getElementById('importFile').value = '';
        document.getElementById('importMessage').innerText = '';
        document.getElementById('importMessage').className = "message";
        document.getElementById('questionPreview').style.display = 'none';
        const fileUploadArea = document.getElementById('questionFileUploadArea');
        if (fileUploadArea) fileUploadArea.style.display = 'block';
    },
    
    // 预览问题
    previewQuestions(event) {
        // 阻止表单默认提交行为
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        const fileInput = document.getElementById('importFile');
        const previewDiv = document.getElementById('questionPreview');
        const msg = document.getElementById('importMessage');
        const fileUploadArea = document.getElementById('questionFileUploadArea');
        
        if (!fileInput.files || fileInput.files.length === 0) {
            previewDiv.style.display = 'none';
            if (fileUploadArea) fileUploadArea.style.display = 'block';
            return;
        }
        
        const file = fileInput.files[0];
        const fileName = file.name;
        
        // 检查文件类型
        if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
            msg.className = "message error";
            msg.innerText = "只支持Excel(.xlsx)和CSV(.csv)文件";
            previewDiv.style.display = 'none';
            if (fileUploadArea) fileUploadArea.style.display = 'block';
            return;
        }
        
        // 隐藏上传区域
        if (fileUploadArea) fileUploadArea.style.display = 'none';
        
        msg.className = "message info";
        msg.innerText = "正在预览文件内容，请稍候...";
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);
        formData.append('preview', 'true');
        formData.append('auto_category', false);
        
        // 发送预览请求
        fetch('/teacher/question/import/preview', {
            method: 'POST',
            credentials: 'include',
            body: formData
        }).then(res => res.json()).then(data => {
            // 打印后端返回的数据结构
            console.log('后端返回的数据:', data);
            
            if (data.code === 200) {
                msg.className = "message success";
                
                // 检查 questions 数组是否存在
                let questions = [];
                if (data.data && data.data.questions) {
                    questions = data.data.questions;
                } else if (data.questions) {
                    questions = data.questions;
                }
                
                console.log('处理后的 questions 数组:', questions);
                
                msg.innerText = `预览成功，共 ${questions.length} 个问题`;
                
                // 生成简化的预览内容，只显示问题标题和数量
                let previewHtml = `
                    <h5 style="margin-bottom: 15px; color: #343a40; font-size: 16px; font-weight: 600;">问题预览</h5>
                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px;">
                        <i class="fas fa-file-excel" style="font-size: 24px; color: #28a745;"></i>
                        <div>
                            <p style="margin: 0; font-weight: 600; color: #343a40;">${fileName}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #6c757d;">${(file.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                        <div style="max-height: 300px; overflow-y: auto;">
                            <div style="padding: 10px; background: #e3f2fd; border-radius: 6px; margin-bottom: 15px;">
                                <p style="margin: 0; font-weight: 600; color: #343a40;">预计导入问题数量: <span style="color: #007bff;">${questions.length}</span></p>
                            </div>
                            <ul style="list-style-type: none; padding: 0; margin: 0;">
                `;
                
                if (questions.length > 0) {
                    questions.forEach((question, index) => {
                        // 打印每个问题对象
                        console.log('问题对象:', question);
                        
                        // 检查问题对象的结构
                        let title = '无标题';
                        if (question.title) {
                            title = question.title;
                        } else if (question.题目) {
                            title = question.题目;
                        } else if (question.标题) {
                            title = question.标题;
                        }
                        
                        console.log('问题标题:', title);
                        
                        // 检查问题对象的类别
                        let category = '默认分类';
                        if (question.category) {
                            category = question.category;
                        } else if (question.类别) {
                            category = question.类别;
                        }
                        
                        previewHtml += `
                            <li style="padding: 10px; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #343a40; font-size: 14px;">${index + 1}. ${title.substring(0, 80)}${title.length > 80 ? '...' : ''}</span>
                                <span style="margin-left: 10px; color: #6c757d; font-size: 12px;">[${category}]</span>
                            </li>
                        `;
                    });
                } else {
                    previewHtml += `
                        <li style="padding: 10px; text-align: center; color: #6c757d;">
                            <span>文件中没有找到问题</span>
                        </li>
                    `;
                }
                
                previewHtml += `
                            </ul>
                        </div>
                    </div>
                `;
                
                console.log('生成的预览HTML:', previewHtml);
                
                // 确保 previewDiv 元素存在
                if (previewDiv) {
                    previewDiv.style.display = 'block';
                    previewDiv.innerHTML = previewHtml;
                    console.log('previewDiv 内容已设置');
                } else {
                    console.error('previewDiv 元素不存在');
                }
                
                // 再次确认隐藏上传区域
                if (fileUploadArea) {
                    fileUploadArea.style.display = 'none';
                    console.log('fileUploadArea 已隐藏');
                }
                
                // 强制重新渲染整个预览区域
                setTimeout(() => {
                    if (previewDiv) {
                        previewDiv.style.display = 'none';
                        previewDiv.offsetHeight; // 触发重排
                        previewDiv.style.display = 'block';
                        console.log('previewDiv 已强制重渲染');
                    }
                    // 再次确认隐藏上传区域
                    if (fileUploadArea) {
                        fileUploadArea.style.display = 'none';
                        console.log('fileUploadArea 已再次隐藏');
                    }
                }, 100);
            } else {
                msg.className = "message error";
                msg.innerText = "预览失败：" + data.msg;
                previewDiv.style.display = 'none';
                if (fileUploadArea) fileUploadArea.style.display = 'block';
            }
        }).catch(err => {
            console.error('网络错误:', err);
            msg.className = "message error";
            msg.innerText = "网络错误：" + err.message;
            previewDiv.style.display = 'none';
            if (fileUploadArea) fileUploadArea.style.display = 'block';
        });
    },
    
    // 加载分类列表
    loadCategories() {
        // 从本地存储获取分类
        let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
        // 如果没有分类，添加默认分类
        if (categories.length === 0) {
            categories = ['默认分类'];
            localStorage.setItem('questionCategories', JSON.stringify(categories));
        }
        this.renderCategoryDropdown(categories);
    },
    
    // 渲染分类下拉列表
    renderCategoryDropdown(categories) {
        const dropdownContent = document.getElementById('categoryDropdownContent');
        if (!dropdownContent) return;
        
        let html = '';
        categories.forEach(category => {
            html += `
                <div class="checkbox-item" onclick="selectCategory('${category}')">
                    <span>${category}</span>
                </div>
            `;
        });
        
        // 添加添加新分类的选项
        html += `
            <div style="border-top: 1px solid #e9ecef; margin-top: 10px; padding-top: 10px;">
                <div class="checkbox-item" onclick="addNewCategory()">
                    <i class="fas fa-plus" style="color: var(--primary-color); margin-right: 8px;"></i>
                    <span>添加自定义分类</span>
                </div>
            </div>
        `;
        
        dropdownContent.innerHTML = html;
    },
    
    // 切换分类下拉列表
    toggleCategoryDropdown(event) {
        event.stopPropagation();
        const dropdown = event.currentTarget;
        dropdown.classList.toggle('active');
    },
    
    // 选择分类
    selectCategory(category) {
        document.getElementById('categorySelectedText').textContent = category;
        document.getElementById('questionCategory').value = category;
        // 关闭下拉列表
        const dropdown = document.querySelector('.dropdown-checkbox');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    },
    
    // 添加新分类
    addNewCategory() {
        const newCategory = prompt('请输入新的分类名称：');
        if (newCategory && newCategory.trim()) {
            let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
            // 检查分类是否已存在
            if (!categories.includes(newCategory.trim())) {
                categories.push(newCategory.trim());
                localStorage.setItem('questionCategories', JSON.stringify(categories));
                // 重新渲染分类下拉列表
                questionsModule.renderCategoryDropdown(categories);
                // 选择新添加的分类
                questionsModule.selectCategory(newCategory.trim());
            } else {
                alert('该分类已存在');
            }
        }
    }
};

// 导出模块
if (typeof window !== 'undefined') {
    // 避免重复声明
    if (!window.questionsModule) {
        window.questionsModule = questionsModule;
    }
    // 为了兼容现有的函数调用，创建全局函数
    window.switchQuestionTab = questionsModule.switchQuestionTab.bind(questionsModule);
    window.getQuestionList = questionsModule.getQuestionList.bind(questionsModule);
    window.publishAllQuestions = questionsModule.publishAllQuestions.bind(questionsModule);
    window.deleteSelectedQuestions = questionsModule.deleteSelectedQuestions.bind(questionsModule);
    window.filterQuestions = questionsModule.filterQuestions.bind(questionsModule);
    window.toggleSelectAll = questionsModule.toggleSelectAll.bind(questionsModule);
    window.toggleQuestionOptions = questionsModule.toggleQuestionOptions.bind(questionsModule);
    window.addQuestion = questionsModule.addQuestion.bind(questionsModule);
    window.publishQuestion = questionsModule.publishQuestion.bind(questionsModule);
    window.unpublishQuestion = questionsModule.unpublishQuestion.bind(questionsModule);
    window.deleteQuestion = questionsModule.deleteQuestion.bind(questionsModule);
    window.viewQuestionAnswers = questionsModule.viewQuestionAnswers.bind(questionsModule);
    window.editQuestion = questionsModule.editQuestion.bind(questionsModule);
    window.closeEditModal = questionsModule.closeEditModal.bind(questionsModule);
    // 分类相关函数
    window.toggleCategoryDropdown = questionsModule.toggleCategoryDropdown.bind(questionsModule);
    window.selectCategory = questionsModule.selectCategory.bind(questionsModule);
    window.addNewCategory = questionsModule.addNewCategory.bind(questionsModule);
    // 编辑模态框分类相关函数
    window.toggleEditCategoryDropdown = questionsModule.toggleEditCategoryDropdown.bind(questionsModule);
    window.selectEditCategory = questionsModule.selectEditCategory.bind(questionsModule);
    window.addNewEditCategory = questionsModule.addNewEditCategory.bind(questionsModule);
    window.addEditOption = questionsModule.addEditOption.bind(questionsModule);
    // 导入问题相关函数
    window.importQuestions = questionsModule.importQuestions.bind(questionsModule);
    window.resetImportForm = questionsModule.resetImportForm.bind(questionsModule);
    window.previewQuestions = questionsModule.previewQuestions.bind(questionsModule);
}

// CommonJS 导出（仅在 Node.js 环境中使用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questionsModule;
}

// 更新问题
function updateQuestion(questionId) {
    const title = document.getElementById('editTitle').value;
    const questionType = document.getElementById('editType').value;
    let optionsText = '';
    const correctAnswer = document.getElementById('editCorrectAnswer').value;
    const timeLimit = document.getElementById('editTimeLimit').value;
    const category = document.getElementById('editCategory').value;

    if (questionType === 'choice') {
        const optionInputs = document.querySelectorAll('.edit-option-input');
        const options = [];
        optionInputs.forEach((input, index) => {
            const optionText = input.value.trim();
            if (optionText) {
                const optionChar = String.fromCharCode(65 + index); // A=65, B=66, etc.
                options.push(`${optionChar}. ${optionText}`);
            }
        });
        optionsText = options.join('\n');
    }

    fetch(`/teacher/question/update/${questionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: "include",
        body: JSON.stringify({
            title: title,
            question_type: questionType,
            options: optionsText,
            correct_answer: correctAnswer,
            time_limit: parseInt(timeLimit),
            category: category
        })
    }).then(res => res.json()).then(result => {
        if (result.code === 200) {
            alert('问题修改成功！');
            questionsModule.closeEditModal();
            questionsModule.getQuestionList(); // 刷新问题列表
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                console.log('编辑问题后刷新仪表盘数据...');
                loadDashboardData();
            }
        } else {
            alert('修改失败：' + result.msg);
        }
    }).catch(error => {
        console.error('更新问题失败:', error);
        alert('网络错误，请重试');
    });
}
