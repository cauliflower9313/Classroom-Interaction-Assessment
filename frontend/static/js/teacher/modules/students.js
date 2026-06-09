/**
 * 教师端学生管理模块
 */

// 加载学生数据统计
function loadStudentStatistics() {
    console.log('开始加载学生统计数据...');
    fetch('/teacher/student/statistics', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
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
    if (window.gradeDistributionChart && typeof window.gradeDistributionChart.destroy === 'function') {
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
    if (window.majorDistributionChart && typeof window.majorDistributionChart.destroy === 'function') {
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

// 切换学生管理子模块标签页
function switchStudentTab(tabName) {
    // 更新标签页按钮状态
    document.querySelectorAll('.student-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.student-tab-btn[onclick*="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 更新标签页内容显示
    document.querySelectorAll('.student-tab-content').forEach(content => content.classList.remove('active'));
    // 修复：HTML中的ID格式是 student-{tabName}-tab
    const tabContent = document.getElementById(`student-${tabName}-tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    // 如果切换到数据模块，加载学生数据统计
    if (tabName === 'data') {
        loadStudentStatistics();
    }
    // 如果切换到操作记录模块，加载操作记录
    if (tabName === 'operation') {
        loadStudentOperationRecords();
    }
    // 如果切换到信息管理模块，加载学生列表
    if (tabName === 'management') {
        window.getStudentList();
    }
}

// 获取学生列表
function getStudentList() {
    console.log('开始加载学生列表...');
    fetch('/teacher/student/list', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('响应状态:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('获取学生列表结果:', result);
        if (result.code === 200) {
            const students = result.data;
            console.log('学生列表数据:', students);
            const tbody = document.getElementById('studentTableBody');
            
            if (tbody) {
                if (students.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary-color); font-size: 16px;">
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                                    <i class="fas fa-users" style="font-size: 48px; color: var(--primary-color);"></i>
                                    <p>暂无学生数据</p>
                                </div>
                            </td>
                        </tr>
                    `;
                    // 更新筛选选项（清空）
                    updateFilterOptions([], [], []);
                } else {
                    tbody.innerHTML = students.map(student => `
                        <tr>
                            <td><input type="checkbox" class="student-checkbox" value="${student.id}"></td>
                            <td>${student.id}</td>
                            <td>${student.name}</td>
                            <td>${student.grade || '-'}</td>
                            <td>${student.major || '-'}</td>
                            <td>${student.class_name || '-'}</td>
                            <td>
                                <button class="btn btn-primary" onclick="editStudent('${student.id}', '${student.name}', '${student.grade || ''}', '${student.major || ''}', '${student.class_name || ''}')" style="padding: 4px 12px; font-size: 12px; margin-right: 5px;">
                                    <i class="fas fa-edit"></i> 修改
                                </button>
                                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 4px 12px; font-size: 12px;">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </td>
                        </tr>
                    `).join('');
                    
                    // 提取唯一的年级、专业和班级值
                    const grades = [...new Set(students.map(student => student.grade).filter(Boolean))];
                    const majors = [...new Set(students.map(student => student.major).filter(Boolean))];
                    // 从完整班级名称中提取班级数字，如从"23级智能1班"中提取出"1班"
                    const classNumbers = [...new Set(students.map(student => {
                        if (student.class_name) {
                            // 提取班级数字部分
                            const match = student.class_name.match(/(\d+班)/);
                            return match ? match[1] : student.class_name;
                        }
                        return null;
                    }).filter(Boolean))];
                    // 按班级数字排序
                    classNumbers.sort((a, b) => {
                        const numA = parseInt(a.match(/\d+/)[0]);
                        const numB = parseInt(b.match(/\d+/)[0]);
                        return numA - numB;
                    });
                    
                    console.log('提取的筛选选项:', { grades, majors, classNumbers });
                    
                    // 更新筛选选项
                    updateFilterOptions(grades, majors, classNumbers);
                }
            }
        } else {
            console.error('获取学生列表失败:', result.msg);
            alert('获取学生列表失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 更新筛选选项
function updateFilterOptions(grades, majors, classNumbers) {
    console.log('更新筛选选项:', { grades, majors, classNumbers });
    
    // 更新年级选项
    const gradeDropdown = document.querySelector('div.dropdown-checkbox input[name="grade"]').closest('.dropdown-content');
    if (gradeDropdown) {
        gradeDropdown.innerHTML = grades.map(grade => `
            <div class="checkbox-item">
                <input type="checkbox" name="grade" value="${grade}">
                <span>${grade}级</span>
            </div>
        `).join('');
    }
    
    // 更新专业选项
    const majorDropdown = document.querySelector('div.dropdown-checkbox input[name="major"]').closest('.dropdown-content');
    if (majorDropdown) {
        majorDropdown.innerHTML = majors.map(major => `
            <div class="checkbox-item">
                <input type="checkbox" name="major" value="${major}">
                <span>${major}</span>
            </div>
        `).join('');
    }
    
    // 更新班级选项
    const classDropdown = document.querySelector('div.dropdown-checkbox input[name="class"]').closest('.dropdown-content');
    if (classDropdown) {
        classDropdown.innerHTML = classNumbers.map(classNumber => `
            <div class="checkbox-item">
                <input type="checkbox" name="class" value="${classNumber}">
                <span>${classNumber}</span>
            </div>
        `).join('');
    }
}

// 加载学生管理模块的操作记录
function loadStudentOperationRecords() {
    console.log('开始加载学生管理操作记录...');
    
    const recordContainer = document.getElementById('operationRecordsContainer');
    if (!recordContainer) {
        console.error('找不到操作记录容器元素 operationRecordsContainer');
        return;
    }
    
    // 显示加载状态
    recordContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; margin-bottom: 15px;"></i>
            <p>正在加载操作记录...</p>
        </div>
    `;
    
    fetch('/teacher/operation/records', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => {
        console.log('响应状态:', response.status);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.json();
    })
    .then(result => {
        console.log('获取操作记录结果:', result);
        if (result.code === 200) {
            const records = result.data;
            console.log('操作记录数据:', records);
            
            if (records.length === 0) {
                recordContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--secondary-color); font-size: 16px;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                            <i class="fas fa-history" style="font-size: 48px; color: var(--primary-color);"></i>
                            <p>暂无操作记录</p>
                        </div>
                    </div>
                `;
            } else {
                recordContainer.innerHTML = records.map(record => {
                    const isWithdrawn = record.status === 'withdrawn';
                    let typeText = record.type;
                    switch (record.type) {
                        case 'add': typeText = '添加'; break;
                        case 'delete': typeText = '删除'; break;
                        case 'update': typeText = '修改'; break;
                        case 'import': typeText = '导入'; break;
                        case 'batch_delete': typeText = '批量删除'; break;
                    }
                    return `
                        <div class="record-item" style="padding: 15px; border-bottom: 1px solid #e9ecef;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <div>
                                    <h5 style="margin: 0 0 5px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">${typeText}</h5>
                                    <p style="margin: 0; color: var(--secondary-color); font-size: 14px;">${record.content}</p>
                                </div>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 5px;">
                                    <span style="color: var(--secondary-color); font-size: 12px;">${record.time}</span>
                                    <span style="padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; ${isWithdrawn ? 'background-color: #f8d7da; color: #721c24;' : 'background-color: #d4edda; color: #155724;'} ">${isWithdrawn ? '已撤回' : '操作成功'}</span>
                                    ${!isWithdrawn ? `
                                        <button class="btn btn-secondary" onclick="undoStudentOperation('${record.id}')" style="padding: 4px 12px; font-size: 12px; margin-top: 5px;">
                                            <i class="fas fa-undo"></i> 撤回
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } else {
            console.error('获取操作记录失败:', result.msg);
            recordContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 15px;"></i>
                    <p>加载失败: ${result.msg}</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        recordContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                <i class="fas fa-exclamation-circle" style="font-size: 32px; margin-bottom: 15px;"></i>
                <p>网络错误，请检查网络连接</p>
                <button class="btn btn-primary" onclick="loadStudentOperationRecords()" style="margin-top: 10px;">
                    <i class="fas fa-sync-alt"></i> 重试
                </button>
            </div>
        `;
    });
}

// 撤回学生管理模块的操作
function undoStudentOperation(operationId) {
    if (!confirm('确定要撤回这个操作吗？')) {
        return;
    }
    
    console.log('撤销操作:', operationId);
    
    fetch('/teacher/operation/withdraw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation_id: operationId }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        console.log('撤销操作结果:', result);
        if (result.code === 200) {
            alert('撤回成功');
            loadStudentOperationRecords(); // 重新加载操作记录
            getStudentList(); // 刷新学生列表
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('撤回失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    });
}

// 搜索学生
function searchStudents() {
    const searchTerm = document.getElementById('studentSearch').value.trim();
    console.log('搜索学生:', searchTerm);
    
    fetch(`/teacher/student/filter?search=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log('搜索结果:', result);
        if (result.code === 200) {
            const students = result.data;
            const tbody = document.getElementById('studentTableBody');
            
            if (tbody) {
                if (students.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary-color); font-size: 16px;">
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                                    <i class="fas fa-search" style="font-size: 48px; color: var(--primary-color);"></i>
                                    <p>未找到匹配的学生</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = students.map(student => `
                        <tr>
                            <td><input type="checkbox" class="student-checkbox" value="${student.id}"></td>
                            <td>${student.id}</td>
                            <td>${student.name}</td>
                            <td>${student.grade || '-'}</td>
                            <td>${student.major || '-'}</td>
                            <td>${student.class_name || '-'}</td>
                            <td>
                                <button class="btn btn-primary" onclick="editStudent('${student.id}', '${student.name}', '${student.grade || ''}', '${student.major || ''}', '${student.class_name || ''}')" style="padding: 4px 12px; font-size: 12px; margin-right: 5px;">
                                    <i class="fas fa-edit"></i> 修改
                                </button>
                                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 4px 12px; font-size: 12px;">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } else {
            console.error('搜索失败:', result.msg);
            alert('搜索失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 筛选学生
function filterStudents() {
    const selectedGrades = Array.from(document.querySelectorAll('input[name="grade"]:checked')).map(cb => cb.value);
    const selectedMajors = Array.from(document.querySelectorAll('input[name="major"]:checked')).map(cb => cb.value);
    const selectedClasses = Array.from(document.querySelectorAll('input[name="class"]:checked')).map(cb => cb.value);
    
    console.log('筛选条件:', { selectedGrades, selectedMajors, selectedClasses });
    
    let params = new URLSearchParams();
    selectedGrades.forEach(grade => params.append('grade', grade));
    selectedMajors.forEach(major => params.append('major', major));
    selectedClasses.forEach(className => params.append('class_name', className));
    
    fetch(`/teacher/student/filter?${params.toString()}`, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log('筛选结果:', result);
        if (result.code === 200) {
            const students = result.data;
            const tbody = document.getElementById('studentTableBody');
            
            if (tbody) {
                if (students.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: var(--secondary-color); font-size: 16px;">
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                                    <i class="fas fa-filter" style="font-size: 48px; color: var(--primary-color);"></i>
                                    <p>未找到匹配的学生</p>
                                </div>
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = students.map(student => `
                        <tr>
                            <td><input type="checkbox" class="student-checkbox" value="${student.id}"></td>
                            <td>${student.id}</td>
                            <td>${student.name}</td>
                            <td>${student.grade || '-'}</td>
                            <td>${student.major || '-'}</td>
                            <td>${student.class_name || '-'}</td>
                            <td>
                                <button class="btn btn-primary" onclick="editStudent('${student.id}', '${student.name}', '${student.grade || ''}', '${student.major || ''}', '${student.class_name || ''}')" style="padding: 4px 12px; font-size: 12px; margin-right: 5px;">
                                    <i class="fas fa-edit"></i> 修改
                                </button>
                                <button class="btn btn-danger" onclick="deleteStudent('${student.id}')" style="padding: 4px 12px; font-size: 12px;">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </td>
                        </tr>
                    `).join('');
                }
            }
        } else {
            console.error('筛选失败:', result.msg);
            alert('筛选失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 重置筛选条件
function resetFilters() {
    // 重置所有复选框
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.id !== 'selectAllStudents') {
            checkbox.checked = false;
        }
    });
    // 重置搜索框
    document.getElementById('studentSearch').value = '';
    // 重新加载学生列表
    getStudentList();
}

// 切换全选学生
function toggleSelectAllStudents() {
    const selectAllCheckbox = document.getElementById('selectAllStudents');
    const studentCheckboxes = document.querySelectorAll('.student-checkbox');
    
    studentCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// 批量删除学生
function batchDeleteStudents() {
    const selectedCheckboxes = document.querySelectorAll('.student-checkbox:checked');
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (selectedIds.length === 0) {
        alert('请选择要删除的学生');
        return;
    }
    
    if (!confirm(`确定要删除这 ${selectedIds.length} 个学生吗？`)) {
        return;
    }
    
    console.log('批量删除学生:', selectedIds);
    
    // 调用批量删除API
    fetch('/teacher/student/batch-delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ student_ids: selectedIds }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            alert(`成功删除 ${result.data.success_count} 名学生`);
            getStudentList(); // 刷新学生列表
            loadStudentOperationRecords(); // 刷新操作记录
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
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

// 删除单个学生
function deleteStudent(studentId) {
    if (!confirm('确定要删除这个学生吗？')) {
        return;
    }

    console.log('删除学生:', studentId);

    fetch('/teacher/student/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ student_id: studentId }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        console.log('删除结果:', result);
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
        alert('网络错误，请重试: ' + error.message);
    });
}

// 分析学号，提取年级、专业和班级信息
function analyzeStudentId(studentId) {
    let grade = '';
    let major = '';
    let class_name = '';
    
    if (studentId.length >= 10) {
        // 提取年级（前4位）
        grade = studentId.substring(0, 4);
        
        // 提取专业代码（第5-8位）
        const majorCode = studentId.substring(4, 8);
        // 根据专业代码映射专业名称
        const majorMap = {
            '3501': '计算机科学与技术',
            '3502': '软件工程',
            '3503': '数据科学与大数据技术',
            '3515': '人工智能'
        };
        major = majorMap[majorCode] || '未知专业';
        
        // 提取班级代码（第9-10位）
        const classCode = studentId.substring(8, 10);
        // 去除前导零
        const classNum = parseInt(classCode).toString();
        // 提取年份后两位（前4位的后两位）
        const yearSuffix = studentId.substring(2, 4);
        // 根据专业和班级代码生成班级名称
        if (major === '计算机科学与技术') {
            class_name = yearSuffix + '计科' + classNum + '班';
        } else if (major === '软件工程') {
            class_name = yearSuffix + '软工' + classNum + '班';
        } else if (major === '人工智能') {
            class_name = yearSuffix + '智能' + classNum + '班';
        } else if (major === '数据科学与大数据技术') {
            class_name = yearSuffix + '大数据' + classNum + '班';
        } else {
            class_name = '未知班级';
        }
    }
    
    return { grade, major, class_name };
}

// 添加学生
function addStudent() {
    const studentId = document.getElementById('addStudentIdInput').value.trim();
    const studentName = document.getElementById('addStudentNameInput').value.trim();
    
    if (!studentId || !studentName) {
        alert('学号和姓名不能为空');
        return;
    }
    
    // 获取用户填写的其他信息
    const gradeInput = document.getElementById('addStudentGradeInput');
    const majorInput = document.getElementById('addStudentMajorInput');
    const classInput = document.getElementById('addStudentClassInput');
    
    const grade = gradeInput ? gradeInput.value.trim() : '';
    const major = majorInput ? majorInput.value.trim() : '';
    const class_name = classInput ? classInput.value.trim() : '';
    
    // 构建请求数据
    const requestData = { 
        student_id: studentId, 
        name: studentName
    };
    
    // 如果用户填写了其他信息，则发送这些信息（后端不会自动分析）
    if (grade) requestData.grade = grade;
    if (major) requestData.major = major;
    if (class_name) requestData.class_name = class_name;
    
    console.log('添加学生:', requestData);
    
    fetch('/teacher/student/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        console.log('添加结果:', result);
        if (result.code === 200) {
            let message = '添加成功';
            if (result.data && result.data.auto_filled) {
                message += '\n' + result.data.msg;
            }
            alert(message);
            resetAddStudentForm(); // 重置表单

            // 重新加载操作记录，确保添加操作被记录
            setTimeout(() => {
                loadStudentOperationRecords();
            }, 500);

            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('添加失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 重置添加学生表单
function resetAddStudentForm() {
    document.getElementById('addStudentIdInput').value = '';
    document.getElementById('addStudentNameInput').value = '';
    const gradeInput = document.getElementById('addStudentGradeInput');
    const majorInput = document.getElementById('addStudentMajorInput');
    const classInput = document.getElementById('addStudentClassInput');
    if (gradeInput) gradeInput.value = '';
    if (majorInput) majorInput.value = '';
    if (classInput) classInput.value = '';
}

// 批量导入学生
function importStudents() {
    const fileInput = document.getElementById('importStudentFileMain');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('请选择要导入的文件');
        return;
    }
    
    console.log('导入学生文件:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/teacher/student/import', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        console.log('导入结果:', result);
        if (result.code === 200) {
            alert('导入成功');
            // 重置文件上传区域
            resetFileUpload();

            // 重新加载操作记录，确保导入操作被记录
            setTimeout(() => {
                loadStudentOperationRecords();
            }, 500);

            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('导入失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 重置文件上传区域
function resetFileUpload() {
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

// 编辑学生信息
function editStudent(studentId, name, grade, major, class_name) {
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
}

// 关闭编辑学生模态框
function closeEditStudentModal() {
    const modal = document.getElementById('editStudentModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 更新学生信息
function updateStudent() {
    const studentId = document.getElementById('editStudentId').value;
    const name = document.getElementById('editStudentName').value.trim();
    const grade = document.getElementById('editStudentGrade').value.trim();
    const major = document.getElementById('editStudentMajor').value.trim();
    const class_name = document.getElementById('editStudentClass').value.trim();
    
    if (!name) {
        alert('姓名不能为空');
        return;
    }
    
    console.log('更新学生信息:', { studentId, name, grade, major, class_name });
    
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
        console.log('更新结果:', result);
        if (result.code === 200) {
            alert('更新成功');
            // 关闭模态框
            closeEditStudentModal();
            getStudentList(); // 刷新学生列表
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('更新失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 下载学生模板
function downloadStudentTemplate() {
    console.log('下载学生模板');
    window.location.href = '/teacher/student/template';
}

// 撤销操作
function undoOperation(operationId) {
    if (!confirm('确定要撤回这个操作吗？')) {
        return;
    }
    
    console.log('撤销操作:', operationId);
    
    fetch('/teacher/operation/withdraw', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation_id: operationId }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        console.log('撤销操作结果:', result);
        if (result.code === 200) {
            alert('撤回成功');
            loadStudentOperationRecords(); // 重新加载操作记录
            getStudentList(); // 重新加载学生列表
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('撤回失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('网络错误:', error);
        alert('网络错误，请重试: ' + error.message);
    });
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        console.log('文件选择:', file.name);
        const fileUploadArea = document.getElementById('fileUploadArea');
        const filePreviewArea = document.getElementById('filePreviewArea');
        const previewContent = document.getElementById('previewContent');
        
        if (fileUploadArea) {
            fileUploadArea.style.display = 'none';
        }
        
        if (filePreviewArea && previewContent) {
            filePreviewArea.style.display = 'block';
            previewContent.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-file-excel" style="font-size: 24px; color: var(--success-color);"></i>
                    <div>
                        <p style="margin: 0; font-weight: 600; color: var(--dark-color);">${file.name}</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--secondary-color);">${(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                </div>
                <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e9ecef;">
                    <h6 style="margin-bottom: 10px; color: var(--dark-color); font-size: 14px; font-weight: 600;">文件内容预览</h6>
                    <div id="fileContentPreview" style="max-height: 200px; overflow-y: auto;">
                        <p style="color: var(--secondary-color); text-align: center;">正在解析文件...</p>
                    </div>
                    <div style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                        <p style="margin: 0; font-weight: 600; color: var(--dark-color);">预计导入学生数量: <span id="studentCount">0</span></p>
                    </div>
                </div>
            `;
        }
        
        // 解析文件内容以统计学生数量
        parseFile(file);
    }
}

// 解析文件内容
function parseFile(file) {
    const fileContentPreview = document.getElementById('fileContentPreview');
    const studentCountElement = document.getElementById('studentCount');
    
    if (file.name.endsWith('.csv')) {
        // 处理CSV文件
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            const lines = content.split('\n').filter(line => line.trim() !== '');
            const studentCount = lines.length - 1; // 减去表头
            
            if (fileContentPreview) {
                fileContentPreview.innerHTML = `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8f9fa;">
                                <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                                <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lines.slice(0, 5).map((line, index) => {
                                if (index === 0) return `<tr style="background: #f8f9fa;"><td style="padding: 8px; border: 1px solid #e9ecef;">${line.split(',')[0]}</td><td style="padding: 8px; border: 1px solid #e9ecef;">${line.split(',')[1]}</td></tr>`;
                                return `<tr><td style="padding: 8px; border: 1px solid #e9ecef;">${line.split(',')[0]}</td><td style="padding: 8px; border: 1px solid #e9ecef;">${line.split(',')[1]}</td></tr>`;
                            }).join('')}
                            ${lines.length > 5 ? `<tr><td colspan="2" style="padding: 8px; border: 1px solid #e9ecef; text-align: center; color: var(--secondary-color);">...</td></tr>` : ''}
                        </tbody>
                    </table>
                `;
            }
            
            if (studentCountElement) {
                studentCountElement.textContent = studentCount;
            }
        };
        reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx')) {
        // 处理Excel文件
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                const studentCount = jsonData.length;
                
                if (fileContentPreview) {
                    fileContentPreview.innerHTML = `
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8f9fa;">
                                    <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                                    <th style="padding: 8px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${jsonData.slice(0, 5).map((row, index) => {
                                    return `<tr><td style="padding: 8px; border: 1px solid #e9ecef;">${row['学号'] || row['学号 '] || ''}</td><td style="padding: 8px; border: 1px solid #e9ecef;">${row['姓名'] || row['姓名 '] || ''}</td></tr>`;
                                }).join('')}
                                ${jsonData.length > 5 ? `<tr><td colspan="2" style="padding: 8px; border: 1px solid #e9ecef; text-align: center; color: var(--secondary-color);">...</td></tr>` : ''}
                            </tbody>
                        </table>
                    `;
                }
                
                if (studentCountElement) {
                    studentCountElement.textContent = studentCount;
                }
            } catch (error) {
                console.error('Excel文件解析错误:', error);
                if (fileContentPreview) {
                    fileContentPreview.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <i class="fas fa-exclamation-circle" style="font-size: 32px; color: var(--danger-color); margin-bottom: 15px;"></i>
                            <p style="color: var(--danger-color); margin-bottom: 15px;">Excel文件解析失败</p>
                            <p style="color: var(--secondary-color); margin-bottom: 15px;">请确保文件格式正确，包含学号和姓名列</p>
                        </div>
                    `;
                }
                if (studentCountElement) {
                    studentCountElement.textContent = '解析失败';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    }
}

// 将函数绑定到全局作用域
if (typeof window !== 'undefined') {
    window.loadStudentStatistics = loadStudentStatistics;
    window.switchStudentTab = switchStudentTab;
    window.drawGradeDistributionChart = drawGradeDistributionChart;
    window.drawMajorDistributionChart = drawMajorDistributionChart;
    window.getStudentList = getStudentList;
    window.updateFilterOptions = updateFilterOptions;
    window.loadStudentOperationRecords = loadStudentOperationRecords;
    window.undoStudentOperation = undoStudentOperation;
    window.searchStudents = searchStudents;
    window.filterStudents = filterStudents;
    window.resetFilters = resetFilters;
    window.toggleSelectAllStudents = toggleSelectAllStudents;
    window.batchDeleteStudents = batchDeleteStudents;
    window.deleteStudent = deleteStudent;
    window.addStudent = addStudent;
    window.resetAddStudentForm = resetAddStudentForm;
    window.importStudents = importStudents;
    window.resetFileUpload = resetFileUpload;
    window.downloadStudentTemplate = downloadStudentTemplate;
    window.undoOperation = undoOperation;
    window.handleFileSelect = handleFileSelect;
    window.parseFile = parseFile;
    window.editStudent = editStudent;
    window.updateStudent = updateStudent;
    window.exportStudents = exportStudents;
    window.loadExportClassList = loadExportClassList;
    // 预览导入相关函数
    window.previewImportFile = previewImportFile;
    window.resetStudentImportForm = resetStudentImportForm;
    window.toggleSelectAllPreview = toggleSelectAllPreview;
    window.confirmImportStudents = confirmImportStudents;
}

// 预览导入文件数据
let previewStudentsData = [];

function previewImportFile() {
    const fileInput = document.getElementById('studentImportFile');
    const file = fileInput.files[0];
    
    if (!file) {
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/teacher/student/preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const data = result.data;
            previewStudentsData = data.students;
            
            // 更新统计信息
            document.getElementById('previewTotalCount').textContent = `共 ${data.total} 名学生`;
            document.getElementById('previewNewCount').textContent = `新增 ${data.new_count} 人`;
            document.getElementById('previewDuplicateCount').textContent = `已存在 ${data.duplicate_count} 人`;
            
            // 渲染预览表格
            const tbody = document.getElementById('previewTableBody');
            tbody.innerHTML = previewStudentsData.map((student, index) => `
                <tr style="${student.is_duplicate ? 'background-color: #fff3cd;' : ''}">
                    <td>
                        <input type="checkbox" class="preview-checkbox" value="${index}" 
                               ${student.is_duplicate ? '' : 'checked'}
                               onchange="updatePreviewSelection()">
                    </td>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    <td>${student.grade || '-'}</td>
                    <td>${student.major || '-'}</td>
                    <td>${student.class_name || '-'}</td>
                    <td>
                        ${student.is_duplicate 
                            ? '<span class="badge badge-warning">已存在</span>' 
                            : '<span class="badge badge-success">新增</span>'}
                    </td>
                </tr>
            `).join('');
            
            // 显示预览区域，隐藏上传区域
            document.getElementById('importUploadSection').style.display = 'none';
            document.getElementById('importPreviewSection').style.display = 'block';
        } else {
            alert('预览失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('预览错误:', error);
        alert('网络错误，请重试');
    });
}

function resetStudentImportForm() {
    const fileInput = document.getElementById('studentImportFile');
    const uploadSection = document.getElementById('importUploadSection');
    const previewSection = document.getElementById('importPreviewSection');
    
    if (fileInput) fileInput.value = '';
    if (uploadSection) uploadSection.style.display = 'block';
    if (previewSection) previewSection.style.display = 'none';
    previewStudentsData = [];
}

function toggleSelectAllPreview() {
    const selectAll = document.getElementById('selectAllPreview');
    const checkboxes = document.querySelectorAll('.preview-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAll.checked;
    });
}

function updatePreviewSelection() {
    const checkboxes = document.querySelectorAll('.preview-checkbox');
    const checkedBoxes = document.querySelectorAll('.preview-checkbox:checked');
    const selectAll = document.getElementById('selectAllPreview');
    
    selectAll.checked = checkboxes.length === checkedBoxes.length;
}

function confirmImportStudents() {
    const selectedIndexes = Array.from(document.querySelectorAll('.preview-checkbox:checked'))
        .map(cb => parseInt(cb.value));
    
    if (selectedIndexes.length === 0) {
        alert('请至少选择一名学生进行导入');
        return;
    }
    
    const selectedStudents = selectedIndexes.map(index => previewStudentsData[index])
        .filter(s => !s.is_duplicate);
    
    if (selectedStudents.length === 0) {
        alert('所选学生均已存在，无需导入');
        return;
    }
    
    // 使用JSON格式发送数据
    fetch('/teacher/student/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ students_data: selectedStudents }),
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            alert(`成功导入 ${result.data.success_count} 名学生`);
            resetStudentImportForm();
            getStudentList();
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('导入失败: ' + result.msg);
        }
    })
    .catch(error => {
        console.error('导入错误:', error);
        alert('网络错误，请重试');
    });
}

// 加载导出班级列表
function loadExportClassList() {
    fetch('/teacher/student/classes', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.code === 200) {
            const classes = result.data;
            const select = document.getElementById('exportClassSelect');
            if (select) {
                select.innerHTML = '<option value="">全部班级</option>';
                classes.forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    select.appendChild(option);
                });
            }
        }
    })
    .catch(error => {
        console.error('加载班级列表失败:', error);
    });
}

// 导出学生数据
function exportStudents() {
    const classSelect = document.getElementById('exportClassSelect');
    const className = classSelect ? classSelect.value : '';
    
    let url = '/teacher/student/export';
    if (className) {
        url += '?class_name=' + encodeURIComponent(className);
    }
    
    window.location.href = url;
}