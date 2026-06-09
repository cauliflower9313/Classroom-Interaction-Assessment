/**
 * 教师端课堂管理模块
 */

// 全局变量存储当前选中的课程ID
let currentCourseId = null;

// 加载课程班级选项（下拉勾选框形式）
function loadCourseClassOptions() {
    console.log('开始加载班级列表...');
    fetch('/teacher/student/classes', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log('加载班级列表结果:', result);
        if (result.code === 200) {
            const classes = result.data;
            const container = document.getElementById('courseClassDropdownContent');
            console.log('容器元素:', container, '班级数据:', classes);
            if (container) {
                if (!classes || classes.length === 0) {
                    container.innerHTML = '<div style="padding: 10px; text-align: center; color: #6c757d;">暂无班级数据</div>';
                } else {
                    container.innerHTML = classes.map(className => `
                        <div class="checkbox-item" onclick="toggleCourseClassItem(this)" style="display: flex; align-items: center; padding: 8px 12px; cursor: pointer; transition: background-color 0.2s;">
                            <input type="checkbox" name="courseClassCheckbox" value="${className}" onclick="event.stopPropagation();" style="margin-right: 8px; cursor: pointer;">
                            <span style="font-size: 13px;">${className}</span>
                        </div>
                    `).join('');
                    console.log('已渲染班级数量:', classes.length);
                }
            } else {
                console.error('找不到容器元素 courseClassDropdownContent');
            }
        } else {
            console.error('加载班级列表失败:', result.msg);
        }
    })
    .catch(error => {
        console.error('加载班级列表失败:', error);
    });
}

// 切换下拉列表显示/隐藏
function toggleCourseClassDropdown() {
    const content = document.getElementById('courseClassDropdownContent');
    if (content) {
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
    }
}

// 切换班级勾选状态
function toggleCourseClassItem(element) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        element.style.backgroundColor = checkbox.checked ? '#e8f4fd' : 'transparent';
        // 更新显示文本
        updateCourseClassSelectedText();
    }
}

// 更新选中的班级文本显示
function updateCourseClassSelectedText() {
    const checkboxes = document.querySelectorAll('input[name="courseClassCheckbox"]:checked');
    const textSpan = document.getElementById('courseClassSelectedText');
    if (textSpan) {
        if (checkboxes.length === 0) {
            textSpan.textContent = '选择班级';
        } else if (checkboxes.length === 1) {
            textSpan.textContent = checkboxes[0].value;
        } else {
            textSpan.textContent = `已选择 ${checkboxes.length} 个班级`;
        }
    }
}

// 点击其他地方关闭下拉列表
document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('courseClassDropdownWrapper');
    const content = document.getElementById('courseClassDropdownContent');
    if (wrapper && content && !wrapper.contains(e.target)) {
        content.style.display = 'none';
    }
});

// 搜索并添加学生到课程
async function searchAndAddStudent(context = 'create') {
    const inputId = 'courseStudentSearch';
    const searchInput = document.getElementById(inputId);
    const searchText = searchInput ? searchInput.value.trim() : '';
    
    if (!searchText) {
        alert('请输入学号或姓名进行搜索');
        return;
    }
    
    try {
        const response = await fetch(`/teacher/student/filter?search=${encodeURIComponent(searchText)}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.code === 200) {
            const students = result.data;
            if (students.length === 0) {
                alert('未找到匹配的学生');
                return;
            }
            
            // 显示找到的学生，使用append模式添加到列表末尾
            displayCourseStudents(students, context, true);
            // 清空搜索框
            if (searchInput) searchInput.value = '';
        } else {
            alert('搜索失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 加载班级列表
function loadClassList() {
    console.log('classroom.js: 开始加载班级列表...');
    fetch('/teacher/student/classes', {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log('classroom.js: 班级列表加载结果:', result);
        if (result.code === 200) {
            const classes = result.data;
            console.log('classroom.js: 获取到班级列表:', classes);
            const dropdowns = document.querySelectorAll('#courseClassDropdown');
            console.log('classroom.js: 找到', dropdowns.length, '个下拉列表');
            
            dropdowns.forEach((dropdown, index) => {
                console.log('classroom.js: 更新第', index, '个下拉列表');
                if (classes.length > 0) {
                    dropdown.innerHTML = classes.map(className => `
                        <div class="checkbox-item" onclick="event.stopPropagation(); this.querySelector('input[type=checkbox]').click();">
                            <input type="checkbox" name="courseClass" value="${className}" onclick="event.stopPropagation();">
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
        console.error('classroom.js: 加载班级列表失败:', error);
        const dropdowns = document.querySelectorAll('#courseClassDropdown');
        dropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<div style="padding: 10px; text-align: center; color: #dc3545;">加载失败</div>';
        });
    });
}

// 选择所有学生到课程
async function selectAllStudentsForCourse(context = 'create') {
    try {
        const response = await fetch('/teacher/student/list', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.code === 200) {
            const students = result.data;
            displayCourseStudents(students, context);
        } else {
            alert('获取学生列表失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 按班级选择学生
function selectClassStudentsForCourse(context = 'create') {
    // 获取勾选的班级
    const checkboxes = document.querySelectorAll('input[name="courseClassCheckbox"]:checked');
    console.log('查找checkbox:', document.querySelectorAll('input[name="courseClassCheckbox"]'));
    console.log('选中的checkbox:', checkboxes);
    const selectedClasses = Array.from(checkboxes).map(cb => cb.value);
    console.log('选中的班级:', selectedClasses);
    
    if (selectedClasses.length === 0) {
        alert('请勾选至少一个班级');
        return;
    }
    
    try {
        // 构建查询参数
        let params = new URLSearchParams();
        selectedClasses.forEach(className => params.append('class_name', className));
        
        fetch(`/teacher/student/filter?${params.toString()}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.code === 200) {
                const students = result.data;
                // 使用append模式，添加到列表末尾
                displayCourseStudents(students, context, true);
            } else {
                alert('获取班级学生失败: ' + result.msg);
            }
        });
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 根据学号添加学生
async function addStudentBy学号(context = 'create') {
    const inputId = context === 'create' ? 'addStudentIdToCourse' : 'addStudentIdToCourseManage';
    const studentId = document.getElementById(inputId).value.trim();
    
    if (!studentId) {
        alert('请输入学生学号');
        return;
    }
    
    try {
        const response = await fetch(`/teacher/student/filter?search=${encodeURIComponent(studentId)}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.code === 200) {
            const students = result.data;
            if (students.length === 0) {
                alert('未找到该学号的学生');
                return;
            }
            
            // 显示找到的学生，使用append模式
            displayCourseStudents(students, context, true);
            // 清空输入框
            document.getElementById(inputId).value = '';
        } else {
            alert('获取学生信息失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 批量导入学生到课程
function importStudentsForCourse() {
    // 这里可以复用现有的导入功能，或者实现一个专门的导入界面
    alert('批量导入功能待实现');
}

// 添加选中的学生到课程
async function addSelectedStudentsToCourse() {
    const courseId = currentCourseId;
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
            loadCourseData(courseId);
            // 清空选择的学生列表
            document.getElementById('courseStudentList').innerHTML = '<p style="color: var(--secondary-color); text-align: center;">请点击按钮选择学生</p>';
        } else {
            alert('添加失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 显示课程学生列表
function displayCourseStudents(students, context = 'create', append = false) {
    const containerId = context === 'create' ? 'createCourseStudentList' : 'courseStudentList';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // 获取现有学生数据
    let existingStudents = [];
    if (append) {
        const existingRows = container.querySelectorAll('tbody tr');
        existingRows.forEach(row => {
            if (row.cells && row.cells.length >= 5) {
                existingStudents.push({
                    id: row.cells[0].textContent,
                    name: row.cells[1].textContent,
                    grade: row.cells[2].textContent,
                    major: row.cells[3].textContent,
                    class_name: row.cells[4].textContent
                });
            }
        });
        
        // 合并学生数据，去重
        const studentMap = new Map();
        existingStudents.forEach(student => studentMap.set(student.id, student));
        students.forEach(student => studentMap.set(student.id, student));
        students = Array.from(studentMap.values());
    }
    
    if (students.length === 0) {
        if (context === 'manage') {
            container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">课程中暂无学生，请添加学生</p>';
        } else {
            container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">没有找到学生</p>';
        }
        return;
    }
    
    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white; border: 1px solid #e9ecef;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">年级</th>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">专业</th>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">班级</th>
                        <th style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => `
                        <tr data-student-id="${student.id}" style="transition: background-color 0.2s ease;">
                            <td style="padding: 10px; border: 1px solid #e9ecef;">${student.id}</td>
                            <td style="padding: 10px; border: 1px solid #e9ecef;">${student.name}</td>
                            <td style="padding: 10px; border: 1px solid #e9ecef;">${student.grade || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #e9ecef;">${student.major || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #e9ecef;">${student.class_name || '-'}</td>
                            <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">
                                ${context === 'manage' ? `
                                    <button class="btn btn-danger" onclick="removeStudentFromCourse(${currentCourseId}, '${student.id}')" style="padding: 4px 12px; font-size: 12px;">
                                        <i class="fas fa-trash"></i> 移除
                                    </button>
                                ` : `
                                    <button class="btn btn-danger" onclick="removeStudentFromList('${student.id}', '${context}')" style="padding: 4px 12px; font-size: 12px;">
                                        <i class="fas fa-trash"></i> 删除
                                    </button>
                                `}
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

// 从列表中删除学生
function removeStudentFromList(studentId, context = 'create') {
    const containerId = context === 'create' ? 'createCourseStudentList' : 'courseStudentList';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const row = container.querySelector(`tr[data-student-id="${studentId}"]`);
    if (row) {
        row.remove();
        
        // 更新学生数量
        const rows = container.querySelectorAll('tbody tr');
        const count = rows.length;
        const countElement = container.querySelector('div[style*="text-align: right"]');
        if (countElement) {
            countElement.textContent = `共 ${count} 名学生`;
        }
        
        // 如果没有学生了，显示提示
        if (count === 0) {
            container.innerHTML = '<p style="color: var(--secondary-color); text-align: center;">请选择班级或输入学号添加学生</p>';
        }
    }
}

// 重置创建课程表单
function resetCreateCourseForm() {
    document.getElementById('courseName').value = '';
    document.getElementById('courseDescription').value = '';
    document.getElementById('createCourseStudentList').innerHTML = '<p style="color: var(--secondary-color); text-align: center;">请点击按钮选择学生</p>';
}

// 创建课程
async function createCourse() {
    const courseName = document.getElementById('courseName').value.trim();
    const courseDescription = document.getElementById('courseDescription').value.trim();
    
    if (!courseName) {
        alert('课程名称不能为空');
        return;
    }
    
    // 从表格中提取学生ID
    const studentRows = document.querySelectorAll('#createCourseStudentList tbody tr');
    const studentIds = [];
    studentRows.forEach(row => {
        const studentId = row.cells[0].textContent;
        studentIds.push(studentId);
    });
    
    if (studentIds.length === 0) {
        alert('请至少选择一名学生');
        return;
    }
    
    try {
        const response = await fetch('/teacher/course/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_name: courseName,
                description: courseDescription,
                student_ids: studentIds
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('课程创建成功');
            resetCreateCourseForm();
            // 切换到课程管理标签页
            window.switchClassroomTab('manage');
        } else {
            alert('创建失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 加载课程列表
async function loadCourseList() {
    try {
        const response = await fetch('/teacher/course/list', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const result = await response.json();
        
        if (result.code === 200) {
            const courses = result.data;
            const courseCardContainer = document.getElementById('courseListContainer');
            if (courseCardContainer) {
                if (courses.length > 0) {
                    courseCardContainer.innerHTML = courses.map(course => `
                        <div class="course-card" onclick="showCourseDetail(${course.id}, '${course.course_name.replace(/'/g, "\\'")}')" style="background: linear-gradient(135deg, white, #f8f9fa); border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border: 1px solid #e9ecef; padding: 20px; transition: all 0.3s ease; cursor: pointer; display: flex; flex-direction: column; gap: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h5 style="margin: 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">${course.course_name}</h5>
                                <span style="background: var(--primary-color); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">${course.student_count}名学生</span>
                            </div>
                            <div>
                                <p style="margin: 0; color: var(--secondary-color); font-size: 14px; line-height: 1.5;">${course.description || '暂无描述'}</p>
                            </div>
                            <div>
                                <p style="margin: 0; color: var(--dark-color); font-size: 14px; font-weight: 500;">上课班级:</p>
                                <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 13px;">${course.classes || '暂无班级信息'}</p>
                            </div>
                            <div style="margin-top: auto; display: flex; justify-content: flex-end; gap: 10px;">
                                <button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); confirmDeleteCourse(${course.id}, '${course.course_name.replace(/'/g, "\\'")}')" style="padding: 6px 16px; font-size: 13px; background: #dc3545; border-color: #dc3545;">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showCourseDetail(${course.id}, '${course.course_name.replace(/'/g, "\\'")}')" style="padding: 6px 16px; font-size: 13px;">
                                    查看详情
                                </button>
                            </div>
                        </div>
                    `).join('');
                } else {
                    courseCardContainer.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--secondary-color); font-size: 16px;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                                <i class="fas fa-book" style="font-size: 48px; color: var(--primary-color);"></i>
                                <p>暂无课程，请先创建课程</p>
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            alert('获取课程列表失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 确认删除课程
function confirmDeleteCourse(courseId, courseName) {
    if (confirm(`确定要删除课程"${courseName}"吗？删除后将无法恢复。`)) {
        deleteCourseById(courseId);
    }
}

// 根据ID删除课程
async function deleteCourseById(courseId) {
    try {
        const response = await fetch(`/teacher/course/delete/${courseId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('课程删除成功');
            loadCourseList();
            // 刷新仪表盘数据
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            alert('删除失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 显示课程详情
function showCourseDetail(courseId, courseName) {
    // 更新全局课程ID
    currentCourseId = courseId;
    // 设置课程名称
    document.getElementById('selectedCourseName').textContent = courseName;
    // 显示课程详情区域
    document.getElementById('courseDetailSection').style.display = 'block';
    // 隐藏课程列表区域
    document.getElementById('courseListSection').style.display = 'none';
    
    // 确保只有一个标签页内容显示
    document.querySelectorAll('.course-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 显示第一个标签页内容（课程学生）
    const firstTab = document.getElementById('course-students-tab');
    if (firstTab) {
        firstTab.style.display = 'block';
    }
    
    // 重置标签按钮状态
    document.querySelectorAll('.course-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    
    // 激活第一个标签按钮
    const firstTabBtn = document.querySelector('.course-tab-btn');
    if (firstTabBtn) {
        firstTabBtn.classList.add('active');
        firstTabBtn.style.background = '#007bff';
        firstTabBtn.style.color = 'white';
    }
    
    // 检查会话状态
    checkSessionStatus();
    
    // 加载课程数据
    loadCourseData(courseId);
}

// 隐藏课程详情，返回课程列表
function hideCourseDetail() {
    // 清空选中的课程ID
    currentCourseId = null;
    // 隐藏课程详情区域
    document.getElementById('courseDetailSection').style.display = 'none';
    // 显示课程列表区域
    document.getElementById('courseListSection').style.display = 'block';
    // 刷新课程列表
    loadCourseList();
}

// 加载课程数据
async function loadCourseData(courseId) {
    if (!courseId) {
        courseId = currentCourseId;
        if (!courseId) {
            alert('无法获取课程ID，请重新选择课程');
            return;
        }
    }
    
    try {
        const response = await fetch(`/teacher/course/detail/${courseId}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // 检查响应状态
        if (!response.ok) {
            // 检查是否是未登录状态（重定向到登录页面）
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                // 重定向到登录页面
                window.location.href = '/teacher/login';
                return;
            }
            
            // 尝试解析错误响应
            try {
                const errorResult = await response.json();
                alert('获取课程详情失败: ' + errorResult.msg);
            } catch (e) {
                alert('获取课程详情失败: 服务器错误');
            }
            return;
        }
        
        // 解析响应数据
        const result = await response.json();
        
        if (result.code === 200) {
            // 课程数据加载成功，更新学生列表
            console.log('课程数据加载成功:', result.data);
            const students = result.data.students;
            
            // 保存学生数据到全局变量，供问题详情使用
            window.currentCourseStudents = students;
            
            displayCourseStudents(students, 'manage');
            
            // 更新课程数据记录
            displayCourseDataRecords(students);
            
            // 填充课程设置表单
            if (result.data.course) {
                const course = result.data.course;
                if (document.getElementById('courseNameEdit')) {
                    document.getElementById('courseNameEdit').value = course.course_name || '';
                }
                if (document.getElementById('courseDescriptionEdit')) {
                    document.getElementById('courseDescriptionEdit').value = course.description || '';
                }
            }
        } else {
            alert('获取课程详情失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 显示课程数据记录
function displayCourseDataRecords(students) {
    const container = document.getElementById('courseDataRecords');
    if (!container) return;
    
    if (students.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>课程中暂无学生</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="display: flex; flex-direction: column; gap: 20px;">
            ${students.map(student => `
                <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); border: 1px solid #e9ecef; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; padding: 15px; font-weight: 600; font-size: 16px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span>${student.name}</span>
                            <span style="margin-left: 15px; font-size: 14px; opacity: 0.9;">${student.id}</span>
                        </div>
                        <span style="font-size: 14px; opacity: 0.9;">${student.class_name || '未分配班级'}</span>
                    </div>
                    <div style="padding: 20px;">
                        <!-- 视频记录 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="margin-bottom: 10px; color: var(--dark-color); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-video" style="color: var(--primary-color);"></i> 视频记录
                                <span style="font-size: 12px; color: var(--secondary-color); font-weight: normal;">(${student.video_records.length}条)</span>
                            </h6>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto;">
                                ${student.video_records.length > 0 ? `
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <thead style="background: #e9ecef; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">抬头率</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">抬头次数</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">低头次数</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">时间</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${student.video_records.map(record => `
                                                <tr>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${(record.head_up_rate * 100).toFixed(2)}%</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${record.head_up_count || 0}</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${record.head_down_count || 0}</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${record.create_time}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <p style="color: var(--secondary-color); text-align: center; margin: 0;">暂无视频记录</p>
                                `}
                            </div>
                        </div>
                        
                        <!-- 语音记录 -->
                        <div style="margin-bottom: 20px;">
                            <h6 style="margin-bottom: 10px; color: var(--dark-color); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-microphone" style="color: var(--primary-color);"></i> 语音记录
                                <span style="font-size: 12px; color: var(--secondary-color); font-weight: normal;">(${student.audio_records.length}条)</span>
                            </h6>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto;">
                                ${student.audio_records.length > 0 ? `
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <thead style="background: #e9ecef; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">内容</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">类型</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">时间</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${student.audio_records.map(record => `
                                                <tr>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${record.content || '无内容'}</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${record.is_question ? '问题' : '语音'}</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${record.create_time}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <p style="color: var(--secondary-color); text-align: center; margin: 0;">暂无语音记录</p>
                                `}
                            </div>
                        </div>
                        
                        <!-- 答题记录 -->
                        <div style="margin-bottom: 10px;">
                            <h6 style="margin-bottom: 10px; color: var(--dark-color); font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-question-circle" style="color: var(--primary-color);"></i> 答题记录
                                <span style="font-size: 12px; color: var(--secondary-color); font-weight: normal;">(${student.answers.length}条)</span>
                            </h6>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; max-height: 150px; overflow-y: auto;">
                                ${student.answers.length > 0 ? `
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <thead style="background: #e9ecef; position: sticky; top: 0;">
                                            <tr>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">得分</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">状态</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">用时</th>
                                                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #dee2e6;">时间</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${student.answers.map(answer => `
                                                <tr>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${answer.score || 0}</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">
                                                        <span style="padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; ${answer.is_correct ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'} ">
                                                            ${answer.is_correct ? '正确' : '错误'}
                                                        </span>
                                                    </td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${answer.time_spent || 0}秒</td>
                                                    <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${answer.submit_time}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : `
                                    <p style="color: var(--secondary-color); text-align: center; margin: 0;">暂无答题记录</p>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// 从课程中移除学生
async function removeStudentFromCourse(courseId, studentId) {
    if (confirm('确定要从课程中移除这名学生吗？')) {
        try {
            const response = await fetch('/teacher/course/remove_student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    course_id: courseId,
                    student_id: studentId
                }),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('移除成功');
                loadCourseData(courseId); // 刷新课程数据
            } else {
                alert('移除失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    }
}

// 显示添加学生区域
function showAddStudentSection() {
    const section = document.getElementById('addStudentToCourseSection');
    if (section) {
        section.style.display = 'block';
        document.getElementById('searchStudentForCourse').focus();
    }
}

// 隐藏添加学生区域
function hideAddStudentSection() {
    const section = document.getElementById('addStudentToCourseSection');
    if (section) {
        section.style.display = 'none';
        document.getElementById('searchStudentForCourse').value = '';
        document.getElementById('searchStudentResultForCourse').style.display = 'none';
        document.getElementById('searchStudentResultList').innerHTML = '';
    }
}

// 搜索学生用于添加到课程
async function searchStudentForCourseAdd() {
    const keyword = document.getElementById('searchStudentForCourse').value.trim();
    if (!keyword) {
        alert('请输入学号或姓名进行搜索');
        return;
    }
    
    try {
        const response = await fetch(`/teacher/student/search?keyword=${encodeURIComponent(keyword)}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            const students = result.data;
            const resultDiv = document.getElementById('searchStudentResultList');
            const resultContainer = document.getElementById('searchStudentResultForCourse');
            
            if (students.length === 0) {
                resultDiv.innerHTML = '<p style="color: var(--secondary-color); text-align: center; padding: 10px;">未找到匹配的学生</p>';
            } else {
                resultDiv.innerHTML = `
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 4px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: left;">学号</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: left;">姓名</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: left;">班级</th>
                                    <th style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => `
                                    <tr style="cursor: pointer;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                                        <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${student.id}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${student.name}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e9ecef;">${student.class_name || '-'}</td>
                                        <td style="padding: 8px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                            <button class="btn btn-primary btn-sm" onclick="addSingleStudentToCourse('${student.id}', '${student.name.replace(/'/g, "\\'")}')" style="padding: 4px 12px; font-size: 12px;">
                                                <i class="fas fa-plus"></i> 添加
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: var(--secondary-color);">找到 ${students.length} 名学生</p>
                `;
            }
            resultContainer.style.display = 'block';
        } else {
            alert('搜索失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 添加单个学生到课程
async function addSingleStudentToCourse(studentId, studentName) {
    if (!currentCourseId) {
        alert('请先选择课程');
        return;
    }
    
    if (!confirm(`确定要将学生"${studentName}"添加到当前课程吗？`)) {
        return;
    }
    
    try {
        const response = await fetch('/teacher/course/add_students', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_id: currentCourseId,
                student_ids: [studentId]
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('学生添加成功');
            // 刷新课程学生列表
            loadCourseData(currentCourseId);
            // 清空搜索
            document.getElementById('searchStudentForCourse').value = '';
            document.getElementById('searchStudentResultForCourse').style.display = 'none';
            document.getElementById('searchStudentResultList').innerHTML = '';
        } else {
            alert('添加失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 删除课程
async function deleteCourse() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请选择要删除的课程');
        return;
    }
    
    if (confirm('确定要删除这门课程吗？删除后将无法恢复。')) {
        try {
            const response = await fetch(`/teacher/course/delete/${courseId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                alert('课程删除成功');
                // 隐藏课程详情，返回课程列表
                hideCourseDetail();
                // 刷新仪表盘数据
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
            } else {
                alert('删除失败: ' + result.msg);
            }
        } catch (error) {
            console.error('网络错误:', error);
            alert('网络错误，请重试');
        }
    }
}

// 切换课程管理子模块标签页
function switchClassroomTab(tabName) {
    console.log('切换课堂管理标签页:', tabName);
    
    // 更新标签页内容显示
    document.querySelectorAll('.classroom-tab-content').forEach(content => content.classList.remove('active'));
    const targetContent = document.getElementById(`${tabName}-classroom-tab`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('switchClassroomTab')) {
            btn.classList.remove('active');
        }
    });
    const activeBtn = document.querySelector(`.tab-btn[onclick*="switchClassroomTab('${tabName}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 如果切换到课程管理模块，加载课程列表
    if (tabName === 'manage') {
        loadCourseList();
    }
    // 如果切换到创建课程模块，加载班级列表
    if (tabName === 'create') {
        loadCourseClassOptions();
    }
}

// 切换课程详情标签页
function switchCourseTab(tabName, event) {
    console.log('切换到标签页:', tabName);
    
    // 隐藏所有标签内容
    document.querySelectorAll('.course-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // 显示选中的标签内容
    // 根据tabName查找对应的标签页
    const tabIdMap = {
        'students': 'course-students-tab',
        'questions': 'course-questions-tab',
        'sessions': 'course-sessions-tab',
        'settings': 'course-settings-tab',
        'records': 'courseRecordsTab'
    };
    
    let tabContent = document.getElementById(tabIdMap[tabName]);
    if (!tabContent) {
        tabContent = document.getElementById(`course-${tabName}-tab`);
    }
    if (!tabContent) {
        tabContent = document.getElementById(`${tabName}-tab`);
    }
    
    if (tabContent) {
        tabContent.style.display = 'block';
        console.log('显示标签内容:', tabContent.id);
    } else {
        console.error('未找到标签内容:', tabName);
    }
    
    // 更新标签按钮状态 - 使用正确的选择器 .course-tab-btn
    document.querySelectorAll('.course-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    
    // 激活当前标签按钮
    if (event && event.target) {
        event.target.classList.add('active');
        event.target.style.background = '#007bff';
        event.target.style.color = 'white';
    }
    
    // 切换到问题管理标签页时加载问题列表
    if (tabName === 'questions') {
        loadCourseQuestions();
    }
    
    // 切换到课堂记录标签页时加载课堂记录
    if (tabName === 'sessions') {
        loadCourseSessions();
    }
    
    // 切换到课程记录标签页时加载记录
    if (tabName === 'records') {
        loadCourseRecordsTab();
    }
}

// 加载课程记录标签页内容
function loadCourseRecordsTab() {
    const courseId = currentCourseId;
    if (!courseId) {
        console.error('未选择课程');
        return;
    }
    
    const container = document.getElementById('courseRecordsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
            <i class="fas fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 15px;"></i>
            <p>加载课程记录中...</p>
        </div>
    `;
    
    fetch(`/teacher/course/${courseId}/records`, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.code !== 200) {
            container.innerHTML = `<p style="color: red; text-align: center;">${data.msg}</p>`;
            return;
        }
        
        const records = data.data;
        
        container.innerHTML = `
            <div style="margin-bottom: 25px;">
                <h5 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; font-weight: 600;">
                    <i class="fas fa-chart-bar" style="color: var(--primary-color); margin-right: 8px;"></i>
                    ${records.course_name} - 课程记录
                </h5>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 28px; font-weight: 700;">${records.student_count}</div>
                        <div style="font-size: 12px; opacity: 0.9;">学生人数</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #28a745, #218838); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 28px; font-weight: 700;">${records.question_count}</div>
                        <div style="font-size: 12px; opacity: 0.9;">问题数量</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 28px; font-weight: 700;">${records.student_records.reduce((sum, s) => sum + s.total_answers, 0)}</div>
                        <div style="font-size: 12px; opacity: 0.9;">总答题数</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 28px; font-weight: 700;">${records.student_records.reduce((sum, s) => sum + s.correct_answers, 0)}</div>
                        <div style="font-size: 12px; opacity: 0.9;">正确总数</div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="course-records-tab active" onclick="switchCourseRecordsTab('students', ${courseId})" style="flex: 1; padding: 12px 20px; border: none; background: #007bff; color: white; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                    <i class="fas fa-users"></i> 学生记录
                </button>
                <button class="course-records-tab" onclick="switchCourseRecordsTab('questions', ${courseId})" style="flex: 1; padding: 12px 20px; border: none; background: #f8f9fa; color: var(--dark-color); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                    <i class="fas fa-question-circle"></i> 问题统计
                </button>
            </div>
            
            <div id="courseStudentsRecordsTab" class="course-records-content">
                ${renderStudentRecords(records.student_records, courseId)}
            </div>
            
            <div id="courseQuestionsRecordsTab" class="course-records-content" style="display: none;">
                ${renderQuestionRecords(records.question_records)}
            </div>
        `;
    })
    .catch(err => {
        console.error('获取课程记录失败:', err);
        container.innerHTML = `<p style="color: red; text-align: center;">网络错误，请重试</p>`;
    });
}

// 渲染学生记录表格
function renderStudentRecords(students, courseId) {
    if (!students || students.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color); background: #f8f9fa; border-radius: 12px;">
                <i class="fas fa-users-slash" style="font-size: 36px; margin-bottom: 10px;"></i>
                <p>暂无学生记录</p>
            </div>
        `;
    }
    
    return `
        <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e9ecef;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: left;">学号</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: left;">姓名</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: left;">班级</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">抬头率</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">答题数</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">正确数</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">正确率</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">总得分</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(s => `
                        <tr style="transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${s.student_id}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${s.student_name}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${s.class_name || '-'}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                <span style="background: ${s.avg_head_up_rate >= 70 ? '#d4edda' : s.avg_head_up_rate >= 50 ? '#fff3cd' : '#f8d7da'}; color: ${s.avg_head_up_rate >= 70 ? '#155724' : s.avg_head_up_rate >= 50 ? '#856404' : '#721c24'}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                                    ${s.avg_head_up_rate}%
                                </span>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${s.total_answers}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${s.correct_answers}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                <span style="background: ${s.accuracy_rate >= 70 ? '#d4edda' : s.accuracy_rate >= 50 ? '#fff3cd' : '#f8d7da'}; color: ${s.accuracy_rate >= 70 ? '#155724' : s.accuracy_rate >= 50 ? '#856404' : '#721c24'}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                                    ${s.accuracy_rate}%
                                </span>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center; font-weight: 700; color: #007bff;">${s.total_score}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                <button onclick="viewStudentCourseRecords(${courseId}, '${s.student_id}')" style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                    <i class="fas fa-eye"></i> 详情
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 渲染问题记录表格
function renderQuestionRecords(questions) {
    if (!questions || questions.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color); background: #f8f9fa; border-radius: 12px;">
                <i class="fas fa-question-circle" style="font-size: 36px; margin-bottom: 10px;"></i>
                <p>暂无问题记录</p>
            </div>
        `;
    }
    
    const typeMap = {
        'single_choice': '单选题',
        'multiple_choice': '多选题',
        'judgment': '判断题',
        'subjective': '主观题',
        // 兼容旧数据
        'text': '主观题',
        'choice': '单选题',
        'fill_blank': '主观题'
    };
    
    return `
        <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e9ecef;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead style="background: #f8f9fa;">
                    <tr>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: left;">问题</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">类型</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">分值</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">状态</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">答题数</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">正确数</th>
                        <th style="padding: 15px; border-bottom: 2px solid #e9ecef; text-align: center;">正确率</th>
                    </tr>
                </thead>
                <tbody>
                    ${questions.map(q => `
                        <tr style="transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef;">${q.title}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${typeMap[q.question_type] || q.question_type}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${q.score}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                <span style="background: ${q.is_active ? '#d4edda' : '#f8f9fa'}; color: ${q.is_active ? '#155724' : '#6c757d'}; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                                    ${q.is_active ? '已发布' : '未发布'}
                                </span>
                            </td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${q.total_answers}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">${q.correct_count}</td>
                            <td style="padding: 12px 15px; border-bottom: 1px solid #e9ecef; text-align: center;">
                                <span style="background: ${q.accuracy_rate >= 70 ? '#d4edda' : q.accuracy_rate >= 50 ? '#fff3cd' : '#f8d7da'}; color: ${q.accuracy_rate >= 70 ? '#155724' : q.accuracy_rate >= 50 ? '#856404' : '#721c24'}; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                                    ${q.accuracy_rate}%
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// 切换课程记录标签页
function switchCourseRecordsTab(tabName, courseId) {
    document.querySelectorAll('.course-records-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    event.target.closest('.course-records-tab').classList.add('active');
    event.target.closest('.course-records-tab').style.background = '#007bff';
    event.target.closest('.course-records-tab').style.color = 'white';
    
    document.querySelectorAll('.course-records-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(`course${tabName.charAt(0).toUpperCase() + tabName.slice(1)}RecordsTab`).style.display = 'block';
}

// 查看学生课程详细记录
function viewStudentCourseRecords(courseId, studentId) {
    const modal = document.createElement('div');
    modal.id = 'studentCourseRecordsModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 30px; border-radius: 16px; 
            max-width: 900px; width: 95%; max-height: 90%; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                <h4 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600;">
                    <i class="fas fa-user-graduate" style="color: #007bff; margin-right: 10px;"></i>
                    学生课程记录详情
                </h4>
                <button onclick="document.getElementById('studentCourseRecordsModal').remove()" 
                    style="background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6c757d;">&times;</button>
            </div>
            
            <div id="studentCourseRecordsContent" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 36px; color: #007bff;"></i>
                <p style="margin-top: 15px; color: var(--secondary-color);">加载中...</p>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
    
    fetch(`/teacher/course/${courseId}/student/${studentId}/records`, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.code !== 200) {
            document.getElementById('studentCourseRecordsContent').innerHTML = `<p style="color: red;">${data.msg}</p>`;
            return;
        }
        
        const records = data.data;
        
        document.getElementById('studentCourseRecordsContent').innerHTML = `
            <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                <div style="display: flex; gap: 20px;">
                    <div><strong>学号：</strong>${records.student_id}</div>
                    <div><strong>姓名：</strong>${records.student_name}</div>
                    <div><strong>班级：</strong>${records.class_name || '-'}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="student-detail-tab active" onclick="switchStudentDetailTab('video')" style="flex: 1; padding: 10px 15px; border: none; background: #007bff; color: white; border-radius: 8px; font-size: 13px; cursor: pointer;">
                    <i class="fas fa-video"></i> 视频记录 (${records.video_records.length})
                </button>
                <button class="student-detail-tab" onclick="switchStudentDetailTab('audio')" style="flex: 1; padding: 10px 15px; border: none; background: #f8f9fa; color: var(--dark-color); border-radius: 8px; font-size: 13px; cursor: pointer;">
                    <i class="fas fa-microphone"></i> 语音记录 (${records.audio_records.length})
                </button>
                <button class="student-detail-tab" onclick="switchStudentDetailTab('answers')" style="flex: 1; padding: 10px 15px; border: none; background: #f8f9fa; color: var(--dark-color); border-radius: 8px; font-size: 13px; cursor: pointer;">
                    <i class="fas fa-check-circle"></i> 答题记录 (${records.answers.length})
                </button>
            </div>
            
            <div id="studentVideoTab" class="student-detail-content">
                <div style="max-height: 300px; overflow-y: auto;">
                    ${records.video_records.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">抬头次数</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">低头次数</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">抬头率</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">记录时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.video_records.map(v => `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${v.head_up_count}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${v.head_down_count}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${v.head_up_rate}%</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${v.record_time}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<div style="text-align: center; padding: 30px; color: var(--secondary-color);">暂无视频记录</div>`}
                </div>
            </div>
            
            <div id="studentAudioTab" class="student-detail-content" style="display: none;">
                <div style="max-height: 300px; overflow-y: auto;">
                    ${records.audio_records.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">内容</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">类型</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.audio_records.map(a => `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #e9ecef;">${a.content || '-'}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">
                                            <span style="background: ${a.is_question ? '#fff3cd' : '#d4edda'}; color: ${a.is_question ? '#856404' : '#155724'}; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                                ${a.is_question ? '提问' : '语音'}
                                            </span>
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${a.record_time}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<div style="text-align: center; padding: 30px; color: var(--secondary-color);">暂无语音记录</div>`}
                </div>
            </div>
            
            <div id="studentAnswersTab" class="student-detail-content" style="display: none;">
                <div style="max-height: 300px; overflow-y: auto;">
                    ${records.answers.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">问题</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">答案</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">结果</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">得分</th>
                                    <th style="padding: 10px; border: 1px solid #e9ecef;">提交时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.answers.map(a => `
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #e9ecef;">${a.question_title}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef;">${a.content || '-'}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">
                                            <span style="background: ${a.is_correct ? '#d4edda' : '#f8d7da'}; color: ${a.is_correct ? '#155724' : '#721c24'}; padding: 2px 8px; border-radius: 10px; font-size: 11px;">
                                                ${a.is_correct ? '正确' : '错误'}
                                            </span>
                                        </td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center; font-weight: 600; color: #007bff;">${a.score}</td>
                                        <td style="padding: 8px; border: 1px solid #e9ecef; text-align: center;">${a.submit_time}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<div style="text-align: center; padding: 30px; color: var(--secondary-color);">暂无答题记录</div>`}
                </div>
            </div>
        `;
    })
    .catch(err => {
        console.error('获取学生记录失败:', err);
        document.getElementById('studentCourseRecordsContent').innerHTML = `<p style="color: red; text-align: center;">网络错误，请重试</p>`;
    });
}

// 切换学生详情标签页
function switchStudentDetailTab(tabName) {
    document.querySelectorAll('.student-detail-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    event.target.closest('.student-detail-tab').classList.add('active');
    event.target.closest('.student-detail-tab').style.background = '#007bff';
    event.target.closest('.student-detail-tab').style.color = 'white';
    
    document.querySelectorAll('.student-detail-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(`student${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).style.display = 'block';
}
async function saveCourseSettings() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请先选择课程');
        return;
    }
    
    const courseName = document.getElementById('courseNameEdit').value.trim();
    const courseDescription = document.getElementById('courseDescriptionEdit').value.trim();
    
    if (!courseName) {
        alert('课程名称不能为空');
        return;
    }
    
    try {
        const response = await fetch('/teacher/course/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                course_id: courseId,
                course_name: courseName,
                description: courseDescription
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('课程设置保存成功');
            // 更新课程名称显示
            document.getElementById('selectedCourseName').textContent = courseName;
        } else {
            alert('保存失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 将函数绑定到全局作用域
if (typeof window !== 'undefined') {
    window.loadClassList = loadClassList;
    window.loadCourseClassOptions = loadCourseClassOptions;
    window.toggleCourseClassDropdown = toggleCourseClassDropdown;
    window.toggleCourseClassItem = toggleCourseClassItem;
    window.updateCourseClassSelectedText = updateCourseClassSelectedText;
    window.searchAndAddStudent = searchAndAddStudent;
    window.selectAllStudentsForCourse = selectAllStudentsForCourse;
    window.selectClassStudentsForCourse = selectClassStudentsForCourse;
    window.addStudentBy学号 = addStudentBy学号;
    window.importStudentsForCourse = importStudentsForCourse;
    window.addSelectedStudentsToCourse = addSelectedStudentsToCourse;
    window.displayCourseStudents = displayCourseStudents;
    window.removeStudentFromList = removeStudentFromList;
    window.resetCreateCourseForm = resetCreateCourseForm;
    window.createCourse = createCourse;
    window.loadCourseList = loadCourseList;
    window.showCourseDetail = showCourseDetail;
    window.hideCourseDetail = hideCourseDetail;
    window.loadCourseData = loadCourseData;
    window.displayCourseDataRecords = displayCourseDataRecords;
    window.removeStudentFromCourse = removeStudentFromCourse;
    window.deleteCourse = deleteCourse;
    window.confirmDeleteCourse = confirmDeleteCourse;
    window.deleteCourseById = deleteCourseById;
    window.showAddStudentSection = showAddStudentSection;
    window.hideAddStudentSection = hideAddStudentSection;
    window.searchStudentForCourseAdd = searchStudentForCourseAdd;
    window.addSingleStudentToCourse = addSingleStudentToCourse;
    window.switchClassroomTab = switchClassroomTab;
    window.switchCourseTab = switchCourseTab;
    window.saveCourseSettings = saveCourseSettings;
    
    // 课程问题管理函数
    window.loadCourseQuestions = loadCourseQuestions;
    window.showAddCourseQuestionModal = showAddCourseQuestionModal;
    window.showImportCourseQuestionModal = showImportCourseQuestionModal;
    window.addCourseQuestion = addCourseQuestion;
    window.publishCourseQuestion = publishCourseQuestion;
    window.unpublishCourseQuestion = unpublishCourseQuestion;
    window.deleteCourseQuestion = deleteCourseQuestion;
    window.toggleSelectAllCourseQuestions = toggleSelectAllCourseQuestions;
    window.publishSelectedCourseQuestions = publishSelectedCourseQuestions;
    window.deleteSelectedCourseQuestions = deleteSelectedCourseQuestions;
    window.viewCourseQuestionAnswers = viewCourseQuestionAnswers;
    window.editCourseQuestion = editCourseQuestion;
    window.toggleCourseQuestionOptions = toggleCourseQuestionOptions;
    window.handleCourseFileSelect = handleCourseFileSelect;
    window.handleCourseFileDrop = handleCourseFileDrop;
    window.showCourseSelectedFile = showCourseSelectedFile;
    window.clearCourseSelectedFile = clearCourseSelectedFile;
    window.previewCourseQuestionImport = previewCourseQuestionImport;
    window.importCourseQuestions = importCourseQuestions;
    // 新增课程问题管理函数
    window.switchCourseQuestionTab = switchCourseQuestionTab;
    window.updateCourseQuestionOptions = updateCourseQuestionOptions;
    window.createCourseQuestion = createCourseQuestion;
    // 问题详情相关函数
    window.viewQuestionDetail = viewQuestionDetail;
    window.switchQuestionDetailTab = switchQuestionDetailTab;
    window.submitQuestionComment = submitQuestionComment;
    window.showCommentReplyForm = showCommentReplyForm;
    window.hideCommentReplyForm = hideCommentReplyForm;
    window.submitCommentReply = submitCommentReply;
    window.deleteQuestionComment = deleteQuestionComment;
    window.showCourseCreateQuestionModal = showCourseCreateQuestionModal;
    window.filterCourseQuestions = filterCourseQuestions;
    window.downloadCourseQuestionTemplate = downloadCourseQuestionTemplate;
    window.previewCourseQuestionImport = previewCourseQuestionImport;
    window.importCourseQuestions = importCourseQuestions;
    window.resetCourseQuestionImport = resetCourseQuestionImport;
    window.toggleCourseCategoryDropdownMenu = toggleCourseCategoryDropdownMenu;
    window.selectCourseCategoryForCreate = selectCourseCategoryForCreate;
    window.showAddCategoryModalForCreate = showAddCategoryModalForCreate;
    window.addCourseCategoryOptionForCreate = addCourseCategoryOptionForCreate;
    // 分类相关函数
    window.toggleCourseCategoryDropdown = toggleCourseCategoryDropdown;
    window.selectCourseCategory = selectCourseCategory;
    window.addNewCourseCategory = addNewCourseCategory;
    // 编辑相关函数
    window.editCourseQuestion = editCourseQuestion;
    window.toggleEditCourseQuestionOptions = toggleEditCourseQuestionOptions;
    window.addEditCourseOption = addEditCourseOption;
    window.toggleEditCourseCategoryDropdown = toggleEditCourseCategoryDropdown;
    window.selectEditCourseCategory = selectEditCourseCategory;
    window.addNewEditCourseCategory = addNewEditCourseCategory;
    window.saveCourseQuestionEdit = saveCourseQuestionEdit;
    // 课程记录相关函数
    window.loadCourseRecordsTab = loadCourseRecordsTab;
    window.switchCourseRecordsTab = switchCourseRecordsTab;
    window.viewStudentCourseRecords = viewStudentCourseRecords;
    window.switchStudentDetailTab = switchStudentDetailTab;
}

// ========== 课程问题管理功能 ==========

// 切换课程问题子标签
function switchCourseQuestionTab(tabName, event) {
    document.querySelectorAll('.course-question-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const targetTab = document.getElementById(`course-question-${tabName}-tab`);
    if (targetTab) {
        targetTab.style.display = 'block';
    }
    
    document.querySelectorAll('.course-question-tab-btn').forEach(btn => {
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    
    if (event && event.target) {
        event.target.style.background = '#007bff';
        event.target.style.color = 'white';
    }
}

// 更新课程问题选项显示
function updateCourseQuestionOptions() {
    const type = document.getElementById('courseQuestionType').value;
    const optionsGroup = document.getElementById('courseQuestionOptionsGroup');
    const optionsLabel = document.getElementById('courseQuestionOptionsLabel');
    const normalOptions = document.getElementById('courseQuestionOptions');
    const judgmentOptions = document.getElementById('courseJudgmentOptions');

    if (type === 'subjective') {
        // 主观题：隐藏选项区域
        optionsGroup.style.display = 'none';
    } else if (type === 'judgment') {
        // 判断题：显示下拉列表
        optionsGroup.style.display = 'block';
        if (optionsLabel) optionsLabel.textContent = '正确答案';
        if (normalOptions) normalOptions.style.display = 'none';
        if (judgmentOptions) judgmentOptions.style.display = 'block';
    } else {
        // 单选题/多选题：显示普通选项
        optionsGroup.style.display = 'block';
        if (optionsLabel) optionsLabel.textContent = '选项';
        if (normalOptions) normalOptions.style.display = 'block';
        if (judgmentOptions) judgmentOptions.style.display = 'none';
    }
}

// 创建课程问题
async function createCourseQuestion() {
    if (!currentCourseId) {
        alert('请先选择课程');
        return;
    }
    
    const title = document.getElementById('courseQuestionTitle').value.trim();
    const type = document.getElementById('courseQuestionType').value;
    const category = document.getElementById('courseQuestionCategory').value.trim();
    const answer = document.getElementById('courseQuestionAnswer').value.trim();
    
    if (!title) {
        alert('请输入题目内容');
        return;
    }
    
    let options = [];
    let correctAnswer = answer;
    
    if (type === 'single_choice' || type === 'multiple_choice') {
        // 单选题/多选题：获取选项
        const optionInputs = document.querySelectorAll('#courseQuestionOptions input[data-option]');
        optionInputs.forEach(input => {
            if (input.value.trim()) {
                options.push({
                    label: input.dataset.option,
                    content: input.value.trim()
                });
            }
        });
    } else if (type === 'judgment') {
        // 判断题：获取下拉列表的值
        const judgmentSelect = document.getElementById('courseJudgmentAnswer');
        if (judgmentSelect) {
            correctAnswer = judgmentSelect.value;
        }
        // 判断题固定选项
        options = [
            { label: 'A', content: '正确' },
            { label: 'B', content: '错误' }
        ];
    }
    
    try {
        const response = await fetch(`/teacher/course/${currentCourseId}/question/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                question_type: type,
                options: options.length > 0 ? JSON.stringify(options) : '',
                correct_answer: correctAnswer,
                category: category
            }),
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            alert('问题创建成功');
            // 清空表单
            document.getElementById('courseQuestionTitle').value = '';
            document.getElementById('courseQuestionCategory').value = '';
            document.getElementById('courseQuestionAnswer').value = '';
            document.getElementById('courseCategorySelectedText').textContent = '请选择分类';
            document.getElementById('courseQuestionType').value = 'single';
            updateCourseQuestionOptions();
            // 清空选项
            const optionInputs = document.querySelectorAll('#courseQuestionOptions input[data-option]');
            optionInputs.forEach(input => { input.value = ''; });
            const radioBtns = document.querySelectorAll('#courseQuestionOptions input[type="radio"]');
            radioBtns.forEach(btn => { btn.checked = false; });
            // 重置判断题下拉列表
            const judgmentSelect = document.getElementById('courseJudgmentAnswer');
            if (judgmentSelect) judgmentSelect.value = '正确';
            // 刷新列表
            loadCourseQuestions();
            switchCourseQuestionTab('list', { target: document.querySelector('.course-question-tab-btn') });
        } else {
            alert('创建失败: ' + result.msg);
        }
    } catch (error) {
        console.error('网络错误:', error);
        alert('网络错误，请重试');
    }
}

// 显示课程创建问题模态框
function showCourseCreateQuestionModal() {
    switchCourseQuestionTab('create', { target: document.querySelectorAll('.course-question-tab-btn')[1] });
}

// 更新分类筛选下拉列表
function updateCategoryFilter(categories) {
    const select = document.getElementById('courseQuestionCategoryFilter');
    if (!select) return;
    
    // 保存当前选中的值
    const currentValue = select.value;
    
    // 清空选项
    select.innerHTML = '<option value="">全部分类</option>';
    
    // 添加分类选项
    const sortedCategories = Array.from(categories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
    
    // 恢复选中的值
    if (currentValue && sortedCategories.includes(currentValue)) {
        select.value = currentValue;
    }
}

// 筛选课程问题
function filterCourseQuestions() {
    const typeFilter = document.getElementById('courseQuestionTypeFilter').value;
    const categoryFilter = document.getElementById('courseQuestionCategoryFilter').value;
    const rows = document.querySelectorAll('#courseQuestionTableBody tr');
    
    rows.forEach(row => {
        if (row.cells.length < 2) return;
        
        const rowType = row.dataset.type || '';
        const rowCategory = row.dataset.category || '';
        
        let typeMatch = true;
        let categoryMatch = true;
        
        // 类型筛选
        if (typeFilter) {
            typeMatch = rowType === typeFilter;
        }
        
        // 分类筛选
        if (categoryFilter) {
            categoryMatch = rowCategory === categoryFilter;
        }
        
        // 同时满足类型和分类条件才显示
        if (typeMatch && categoryMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// 下载课程问题模板
function downloadCourseQuestionTemplate() {
    const template = '题目内容\t问题类型\t选项A\t选项B\t选项C\t选项D\t正确答案\t分值\t分类\n示例题目\t单选题\t选项A内容\t选项B内容\t选项C内容\t选项D内容\tA\t5\t第一章';
    const blob = new Blob([template], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '问题导入模板.txt';
    a.click();
    URL.revokeObjectURL(url);
}

// 预览课程问题导入
function previewCourseQuestionImport(event) {
    const fileInput = document.getElementById('courseQuestionImportFile');
    const previewDiv = document.getElementById('courseQuestionPreview');
    const msg = document.getElementById('courseQuestionImportMessage');
    const fileUploadArea = document.getElementById('courseQuestionFileUploadArea');
    
    // 检查元素是否存在
    if (!fileInput || !previewDiv || !msg) {
        console.error('找不到必要的DOM元素');
        return;
    }
    
    // 优先使用 event.target 获取文件
    const files = event && event.target && event.target.files ? event.target.files : fileInput.files;
    
    if (!files || files.length === 0) {
        previewDiv.style.display = 'none';
        if (fileUploadArea) fileUploadArea.style.display = 'block';
        return;
    }
    
    const file = files[0];
    const fileName = file.name;
    
    // 检查文件类型
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        msg.className = "message error";
        msg.innerText = "只支持Excel(.xlsx, .xls)和CSV(.csv)文件";
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
    
    // 发送预览请求
    fetch(`/teacher/course/${currentCourseId}/question/import/preview`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    }).then(res => res.json()).then(data => {
        if (data.code === 200) {
            msg.className = "message success";
            
            let questions = [];
            if (data.data && data.data.questions) {
                questions = data.data.questions;
            } else if (data.questions) {
                questions = data.questions;
            }
            
            msg.innerText = `预览成功，共 ${questions.length} 个问题`;
            
            // 生成预览内容
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
                    let title = question.title || question.题目 || question.标题 || '无标题';
                    let category = question.category || question.类别 || '默认分类';
                    
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
            
            previewDiv.style.display = 'block';
            previewDiv.innerHTML = previewHtml;
            if (fileUploadArea) fileUploadArea.style.display = 'none';
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
}

// 导入课程问题
function importCourseQuestions() {
    if (!currentCourseId) {
        alert('请先选择课程');
        return;
    }
    
    const fileInput = document.getElementById('courseQuestionImportFile');
    const msg = document.getElementById('courseQuestionImportMessage');
    
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        msg.className = "message error";
        msg.innerText = "请选择要导入的文件";
        return;
    }
    
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    msg.className = "message info";
    msg.innerText = "正在导入问题，请稍候...";
    
    fetch(`/teacher/course/${currentCourseId}/question/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData
    }).then(res => res.json()).then(data => {
        if (data.code === 200) {
            msg.className = "message success";
            msg.innerText = `导入成功，共导入 ${data.data.count} 个问题`;
            
            // 重置导入表单
            setTimeout(() => {
                resetCourseQuestionImport();
            }, 1500);
            
            // 刷新问题列表
            loadCourseQuestions();
            switchCourseQuestionTab('list', { target: document.querySelector('.course-question-tab-btn') });
        } else {
            msg.className = "message error";
            msg.innerText = "导入失败：" + data.msg;
        }
    }).catch(err => {
        msg.className = "message error";
        msg.innerText = "网络错误：" + err.message;
    });
}

// 重置课程问题导入
function resetCourseQuestionImport() {
    document.getElementById('courseQuestionImportFile').value = '';
    document.getElementById('courseQuestionImportMessage').innerText = '';
    document.getElementById('courseQuestionImportMessage').className = "message";
    document.getElementById('courseQuestionPreview').style.display = 'none';
    const fileUploadArea = document.getElementById('courseQuestionFileUploadArea');
    if (fileUploadArea) fileUploadArea.style.display = 'block';
}

// 切换知识点分类下拉菜单（创建问题页面）
function toggleCourseCategoryDropdownMenu() {
    const menu = document.getElementById('courseCategoryDropdownMenu');
    if (menu.style.display === 'none') {
        menu.style.display = 'block';
    } else {
        menu.style.display = 'none';
    }
}

// 选择知识点分类（创建问题页面）
function selectCourseCategoryForCreate(category, event) {
    event.stopPropagation();
    document.getElementById('courseCategorySelectedText').textContent = category;
    document.getElementById('courseQuestionCategory').value = category;
    document.getElementById('courseCategoryDropdownMenu').style.display = 'none';
}

// 显示添加分类模态框（创建问题页面）
function showAddCategoryModalForCreate(event) {
    event.stopPropagation();
    const newCategory = prompt('请输入新类别名称：');
    if (newCategory && newCategory.trim()) {
        addCourseCategoryOptionForCreate(newCategory.trim());
        selectCourseCategoryForCreate(newCategory.trim(), event);
    }
}

// 添加新分类选项到下拉列表（创建问题页面）
function addCourseCategoryOptionForCreate(categoryName) {
    const menu = document.getElementById('courseCategoryDropdownMenu');
    const customOption = menu.querySelector('.category-option:last-child');
    
    const newOption = document.createElement('div');
    newOption.className = 'category-option';
    newOption.style.cssText = 'padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f0f0f0;';
    newOption.textContent = categoryName;
    newOption.onclick = function(e) {
        selectCourseCategoryForCreate(categoryName, e);
    };
    
    menu.insertBefore(newOption, customOption);
}

// 点击其他地方关闭下拉菜单
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('courseCategoryDropdown');
    const menu = document.getElementById('courseCategoryDropdownMenu');
    if (dropdown && menu && !dropdown.contains(e.target)) {
        menu.style.display = 'none';
    }
});

// 加载课程问题列表
function loadCourseQuestions() {
    const courseId = currentCourseId;
    if (!courseId) {
        console.error('未选择课程');
        return;
    }
    
    fetch(`/teacher/course/${courseId}/questions`, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById('courseQuestionTableBody');
        const tableContainer = tbody.closest('.table-container');
        
        // 设置表格容器的样式，添加垂直滚动
        if (tableContainer) {
            tableContainer.style.maxHeight = '500px';
            tableContainer.style.overflowY = 'auto';
        }
        
        tbody.innerHTML = '';
        
        if (data.code !== 200) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">${data.msg}</td></tr>`;
            return;
        }
        
        const questions = data.data.items || [];
        if (questions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--secondary-color);">暂无问题，请添加问题</td></tr>`;
            return;
        }
        
        // 收集所有分类
        const categories = new Set();
        
        const typeMap = {
            'choice': '选择题',
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'fill_blank': '填空题',
            'judgment': '判断题',
            'text': '主观题',
            'subjective': '主观题'
        };
        
        questions.forEach(question => {
            // 收集分类
            if (question.category) {
                categories.add(question.category);
            }
            
            const tr = document.createElement('tr');
            const isPublished = question.is_active;
            tr.dataset.type = question.question_type;
            tr.dataset.category = question.category || '';
            
            let actionButtons = '';
            if (isPublished) {
                actionButtons = `
                    <button class="btn btn-sm btn-info" onclick="viewQuestionDetail(${question.id})" style="margin-right: 5px;"><i class="fas fa-eye"></i> 详情</button>
                    <button class="btn btn-sm btn-warning" onclick="unpublishCourseQuestion(${question.id})"><i class="fas fa-undo"></i> 撤回</button>
                `;
            } else {
                actionButtons = `
                    <button class="btn btn-sm btn-success" onclick="publishCourseQuestion(${question.id})" style="margin-right: 5px;"><i class="fas fa-paper-plane"></i> 发布</button>
                    <button class="btn btn-sm btn-primary" onclick="editCourseQuestion(${question.id})" style="margin-right: 5px;"><i class="fas fa-edit"></i> 编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCourseQuestion(${question.id})"><i class="fas fa-trash"></i></button>
                `;
            }
            
            tr.innerHTML = `
                <td>${question.title}</td>
                <td>${typeMap[question.question_type] || question.question_type}</td>
                <td>${question.category || '-'}</td>
                <td>${isPublished ? '<span style="color: #28a745;"><i class="fas fa-check-circle"></i> 已发布</span>' : '<span style="color: #6c757d;"><i class="fas fa-minus-circle"></i> 未发布</span>'}</td>
                <td>${question.create_time || '-'}</td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // 更新分类下拉列表
        updateCategoryFilter(categories);
    })
    .catch(err => {
        console.error('获取课程问题列表失败:', err);
        const tbody = document.getElementById('courseQuestionTableBody');
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">网络错误，请重试</td></tr>`;
    });
}

// 发布问题
function publishCourseQuestion(questionId) {
    if (!confirm('确定要发布此问题吗？发布后学生将可以看到并回答此问题。')) return;
    
    fetch('/teacher/question/publish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question_id: questionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题发布成功！');
            loadCourseQuestions();
        } else {
            alert('发布失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('发布失败:', err);
        alert('网络错误，请重试');
    });
}

// 撤回问题
function unpublishCourseQuestion(questionId) {
    if (!confirm('确定要撤回此问题吗？撤回后学生将无法继续回答。')) return;
    
    fetch('/teacher/question/unpublish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question_id: questionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题已撤回！');
            loadCourseQuestions();
        } else {
            alert('撤回失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('撤回失败:', err);
        alert('网络错误，请重试');
    });
}

// 查看问题详情（答题统计+讨论区）
function viewQuestionDetail(questionId) {
    // 移除已存在的模态框，避免重复创建
    const existingModal = document.getElementById('questionDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'questionDetailModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 30px; border-radius: 16px; 
            max-width: 1000px; width: 95%; max-height: 90%; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                <h4 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600;">
                    <i class="fas fa-question-circle" style="color: #007bff; margin-right: 10px;"></i>
                    问题详情
                </h4>
                <button onclick="document.getElementById('questionDetailModal').remove()" 
                    style="background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6c757d;">&times;</button>
            </div>
            
            <div id="questionDetailContent" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 36px; color: #007bff;"></i>
                <p style="margin-top: 15px; color: var(--secondary-color);">加载中...</p>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
    
    // 加载问题详情和答题统计
    Promise.all([
        fetch(`/teacher/question/detail/${questionId}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/teacher/question/answers/${questionId}`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/teacher/question/${questionId}/comments`, { credentials: 'include' }).then(r => r.json())
    ])
    .then(([questionData, answersData, commentsData]) => {
        if (questionData.code !== 200) {
            document.getElementById('questionDetailContent').innerHTML = `<p style="color: red;">${questionData.msg}</p>`;
            return;
        }
        
        const question = questionData.data;
        const answers = answersData.code === 200 ? answersData.data : { answers: [], total_count: 0, correct_count: 0 };
        const comments = commentsData.code === 200 ? commentsData.data.comments : [];
        
        const typeMap = {
            'text': '主观题',
            'subjective': '主观题',
            'choice': '选择题',
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'judgment': '判断题',
            'fill_blank': '填空题'
        };
        
        // 获取课程学生总数（从当前课程数据）
        const courseStudentsCount = window.currentCourseStudents ? window.currentCourseStudents.length : 0;
        const unansweredCount = courseStudentsCount > answers.total_count ? courseStudentsCount - answers.total_count : 0;
        const correctRate = answers.total_count > 0 ? Math.round(answers.correct_count / answers.total_count * 100) : 0;
        
        document.getElementById('questionDetailContent').innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${answers.total_count}</div>
                    <div style="font-size: 13px; opacity: 0.9;">答题人数</div>
                </div>
                <div style="background: linear-gradient(135deg, #28a745, #218838); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${answers.correct_count}</div>
                    <div style="font-size: 13px; opacity: 0.9;">正确人数</div>
                </div>
                <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${answers.total_count - answers.correct_count}</div>
                    <div style="font-size: 13px; opacity: 0.9;">错误人数</div>
                </div>
                <div style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${correctRate}%</div>
                    <div style="font-size: 13px; opacity: 0.9;">正确率</div>
                </div>
                <div style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${unansweredCount}</div>
                    <div style="font-size: 13px; opacity: 0.9;">未答人数</div>
                </div>
                <div style="background: linear-gradient(135deg, #17a2b8, #138496); color: white; padding: 15px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 700;">${courseStudentsCount}</div>
                    <div style="font-size: 13px; opacity: 0.9;">课程总人数</div>
                </div>
            </div>
            
            <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid #e9ecef;">
                <h5 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 15px; font-weight: 600;">
                    <i class="fas fa-info-circle" style="color: #007bff; margin-right: 8px;"></i>问题信息
                </h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div><strong>标题：</strong>${question.title}</div>
                    <div><strong>题型：</strong>${typeMap[question.question_type] || question.question_type}</div>
                    <div><strong>分值：</strong>${question.score}分</div>
                    <div><strong>正确答案：</strong>${question.correct_answer || '-'}</div>
                </div>
                ${(question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && question.options ? `
                    <div style="padding: 15px; background: #f8f9fa; border-radius: 8px; margin-top: 10px;">
                        <strong style="color: var(--dark-color); font-size: 14px;">选项：</strong>
                        <div style="margin-top: 8px; font-size: 14px; line-height: 1.8;">
                            ${question.options.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(opt => opt.trim()).map(opt => `<div style="padding: 4px 0;">${opt}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="question-detail-tab active" onclick="switchQuestionDetailTab('answers', ${questionId})" style="flex: 1; padding: 12px 20px; border: none; background: #007bff; color: white; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                    <i class="fas fa-list-check"></i> 答题记录
                </button>
                <button class="question-detail-tab" onclick="switchQuestionDetailTab('discussion', ${questionId})" style="flex: 1; padding: 12px 20px; border: none; background: #f8f9fa; color: var(--dark-color); border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                    <i class="fas fa-comments"></i> 讨论区 (${comments.length})
                </button>
            </div>
            
            <div id="questionAnswersTab" class="question-detail-content">
                <div style="max-height: 300px; overflow-y: auto;">
                    ${answers.answers.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: left;">答案</th>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: center;">结果</th>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: center;">得分</th>
                                    <th style="padding: 12px; border: 1px solid #e9ecef; text-align: left;">提交时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${answers.answers.map(a => {
                                    const isCorrect = a.is_correct === true || a.is_correct === 'true' || a.is_correct === 1;
                                    console.log('答案显示调试:', a.student_name, '答案:', a.content, 'is_correct原始值:', a.is_correct, '处理后:', isCorrect);
                                    return `
                                    <tr>
                                        <td style="padding: 10px; border: 1px solid #e9ecef;">${a.student_id}</td>
                                        <td style="padding: 10px; border: 1px solid #e9ecef;">${a.student_name}</td>
                                        <td style="padding: 10px; border: 1px solid #e9ecef;">${a.content || '-'}</td>
                                        <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">
                                            <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; ${isCorrect ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">
                                                ${isCorrect ? '正确' : '错误'}
                                            </span>
                                        </td>
                                        <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center; font-weight: 600; color: #007bff;">${a.score}</td>
                                        <td style="padding: 10px; border: 1px solid #e9ecef;">${a.submit_time}</td>
                                    </tr>
                                `}).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div style="text-align: center; padding: 40px; color: var(--secondary-color); background: #f8f9fa; border-radius: 12px;">
                            <i class="fas fa-inbox" style="font-size: 36px; margin-bottom: 10px;"></i>
                            <p>暂无答题记录</p>
                        </div>
                    `}
                </div>
            </div>
            
            <div id="questionDiscussionTab" class="question-detail-content" style="display: none;">
                <div style="margin-bottom: 20px;">
                    <textarea id="newQuestionComment" placeholder="输入评论内容..." style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; height: 80px; resize: vertical;"></textarea>
                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                        <button onclick="submitQuestionComment(${questionId})" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500;">
                            <i class="fas fa-paper-plane"></i> 发表评论
                        </button>
                    </div>
                </div>
                <div id="questionCommentsList" style="max-height: 300px; overflow-y: auto;">
                    ${renderQuestionComments(comments, questionId)}
                </div>
            </div>
        `;
    })
    .catch(err => {
        console.error('加载问题详情失败:', err);
        document.getElementById('questionDetailContent').innerHTML = `<p style="color: red; text-align: center;">网络错误，请重试</p>`;
    });
}

// 渲染评论列表
function renderQuestionComments(comments, questionId, depth = 0) {
    if (!comments || comments.length === 0) {
        return depth === 0 ? `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color); background: #f8f9fa; border-radius: 12px;">
                <i class="fas fa-comments" style="font-size: 36px; margin-bottom: 10px;"></i>
                <p>暂无评论，来发表第一条评论吧</p>
            </div>
        ` : '';
    }
    
    return comments.map(comment => `
        <div style="background: white; border-radius: 10px; padding: 15px; margin-bottom: 10px; border: 1px solid #e9ecef; margin-left: ${depth * 20}px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, ${comment.author_type === 'teacher' ? '#dc3545' : '#28a745'}, ${comment.author_type === 'teacher' ? '#c82333' : '#218838'}); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 14px;">
                        ${comment.author_name.charAt(0)}
                    </div>
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-weight: 600; color: var(--dark-color); font-size: 14px;">${comment.author_name}</span>
                            <span style="background: ${comment.author_type === 'teacher' ? '#dc3545' : '#28a745'}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px;">
                                ${comment.author_type === 'teacher' ? '教师' : '学生'}
                            </span>
                        </div>
                        <span style="font-size: 12px; color: var(--secondary-color);">${comment.create_time}</span>
                    </div>
                </div>
            </div>
            <p style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 14px; line-height: 1.6; padding-left: 46px;">${comment.content}</p>
            <div style="padding-left: 46px; display: flex; gap: 15px;">
                <button onclick="showCommentReplyForm(${questionId}, ${comment.id})" style="background: none; border: none; color: #007bff; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-reply"></i> 回复
                </button>
                <button onclick="deleteQuestionComment(${questionId}, ${comment.id})" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 13px;">
                    <i class="fas fa-trash"></i> 删除
                </button>
            </div>
            <div id="reply-form-${comment.id}" style="display: none; margin-top: 10px; padding-left: 46px;">
                <div style="display: flex; gap: 10px;">
                    <textarea id="reply-input-${comment.id}" placeholder="回复..." style="flex: 1; padding: 10px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 13px; resize: vertical; min-height: 60px;"></textarea>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button onclick="submitCommentReply(${questionId}, ${comment.id})" style="background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            发送
                        </button>
                        <button onclick="hideCommentReplyForm(${comment.id})" style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                            取消
                        </button>
                    </div>
                </div>
            </div>
            ${comment.replies && comment.replies.length > 0 ? `
                <div style="margin-top: 10px; padding-left: 20px; border-left: 3px solid #e9ecef;">
                    ${renderQuestionComments(comment.replies, questionId, depth + 1)}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 切换问题详情标签页
function switchQuestionDetailTab(tabName, questionId) {
    document.querySelectorAll('.question-detail-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '#f8f9fa';
        btn.style.color = 'var(--dark-color)';
    });
    event.target.closest('.question-detail-tab').classList.add('active');
    event.target.closest('.question-detail-tab').style.background = '#007bff';
    event.target.closest('.question-detail-tab').style.color = 'white';
    
    document.querySelectorAll('.question-detail-content').forEach(content => {
        content.style.display = 'none';
    });
    
    document.getElementById(`question${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).style.display = 'block';
}

// 发表评论
function submitQuestionComment(questionId) {
    const content = document.getElementById('newQuestionComment').value.trim();
    if (!content) {
        alert('请输入评论内容');
        return;
    }
    
    fetch(`/teacher/question/${questionId}/comment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ content: content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            document.getElementById('newQuestionComment').value = '';
            viewQuestionDetail(questionId);
        } else {
            alert('评论失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('评论失败:', err);
        alert('网络错误，请重试');
    });
}

// 显示回复表单
function showCommentReplyForm(questionId, commentId) {
    document.querySelectorAll('[id^="reply-form-"]').forEach(el => {
        el.style.display = 'none';
    });
    
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = 'block';
        const input = document.getElementById(`reply-input-${commentId}`);
        if (input) input.focus();
    }
}

// 隐藏回复表单
function hideCommentReplyForm(commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = 'none';
    }
}

// 提交回复
function submitCommentReply(questionId, parentId) {
    const input = document.getElementById(`reply-input-${parentId}`);
    if (!input) return;
    
    const content = input.value.trim();
    if (!content) {
        alert('请输入回复内容');
        return;
    }
    
    fetch(`/teacher/question/${questionId}/comment`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ content: content, parent_id: parentId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            viewQuestionDetail(questionId);
        } else {
            alert('回复失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('回复失败:', err);
        alert('网络错误，请重试');
    });
}

// 删除评论
function deleteQuestionComment(questionId, commentId) {
    if (!confirm('确定要删除这条评论吗？')) {
        return;
    }
    
    fetch(`/teacher/comment/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            viewQuestionDetail(questionId);
        } else {
            alert('删除失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('删除失败:', err);
        alert('网络错误，请重试');
    });
}

// 显示添加问题模态框
function showAddCourseQuestionModal() {
    const modal = document.createElement('div');
    modal.id = 'addCourseQuestionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 30px; border-radius: 16px; 
            max-width: 700px; width: 95%; max-height: 85%; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                <h4 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #007bff, #0056b3); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-plus" style="color: white; font-size: 18px;"></i>
                    </div>
                    添加课程问题
                </h4>
                <button onclick="document.getElementById('addCourseQuestionModal').remove()" 
                    style="background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6c757d; transition: all 0.3s;">&times;</button>
            </div>
            <form id="addCourseQuestionForm" style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">问题标题 <span style="color: #dc3545;">*</span></label>
                        <input type="text" id="courseQuestionTitle" required placeholder="请输入问题标题" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; transition: all 0.3s;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">分值</label>
                        <input type="number" id="courseQuestionScore" value="5" min="1" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;">
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">题型</label>
                        <select id="courseQuestionType" onchange="toggleCourseQuestionOptions()" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; background: white;">
                            <option value="text">主观题</option>
                            <option value="choice">选择题</option>
                            <option value="judgment">判断题</option>
                            <option value="fill_blank">填空题</option>
                        </select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">答题时限（秒）</label>
                        <input type="number" id="courseQuestionTimeLimit" value="60" min="30" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">问题分类</label>
                        <div class="dropdown-checkbox" onclick="toggleCourseCategoryDropdown(event)" style="position: relative;">
                            <div class="dropdown-header" style="padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; background: white; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                                <span class="selected-text" id="courseCategorySelectedText">请选择分类</span>
                                <i class="fas fa-chevron-down" style="color: #6c757d; font-size: 12px;"></i>
                            </div>
                            <div class="dropdown-content" id="courseCategoryDropdownContent" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #e9ecef; border-radius: 10px; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                            </div>
                        </div>
                        <input type="hidden" id="courseQuestionCategory" value="">
                    </div>
                </div>
                <div id="courseQuestionOptionsDiv" style="display: none; padding: 15px; background: #f8f9fa; border-radius: 10px; border: 2px dashed #e9ecef;">
                </div>
                <div id="courseQuestionAnswerDiv" style="padding: 15px; background: linear-gradient(135deg, #fff3cd, #ffeeba); border-radius: 10px; border: 2px solid #ffc107;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                        <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="text" id="courseQuestionAnswer" placeholder="请输入正确答案" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
                    <small id="courseQuestionAnswerHint" style="color: #856404; font-size: 12px; margin-top: 5px; display: block;">
                        <i class="fas fa-info-circle"></i> 主观题答案由教师手动评分
                    </small>
                </div>
                <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                    <button type="button" onclick="document.getElementById('addCourseQuestionModal').remove()" style="padding: 12px 28px; border: 2px solid #e9ecef; background: white; border-radius: 10px; font-size: 14px; cursor: pointer; color: #6c757d; font-weight: 500; transition: all 0.3s;">
                        <i class="fas fa-times"></i> 取消
                    </button>
                    <button type="button" onclick="addCourseQuestion()" style="padding: 12px 28px; border: none; background: linear-gradient(135deg, #007bff, #0056b3); border-radius: 10px; font-size: 14px; cursor: pointer; color: white; font-weight: 500; transition: all 0.3s;">
                        <i class="fas fa-plus"></i> 添加问题
                    </button>
                </div>
            </form>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// 切换选项显示
function toggleCourseQuestionOptions() {
    const type = document.getElementById('courseQuestionType').value;
    const optionsDiv = document.getElementById('courseQuestionOptionsDiv');
    const answerDiv = document.getElementById('courseQuestionAnswerDiv');
    
    if (type === 'choice') {
        optionsDiv.style.display = 'block';
        optionsDiv.innerHTML = '';
        
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'courseOptionsContainer';
        optionsContainer.style.marginBottom = '10px';
        
        for (let i = 0; i < 3; i++) {
            const optionChar = String.fromCharCode(65 + i);
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
            optionDiv.innerHTML = `
                <label style="margin-right: 10px; font-weight: 600; color: #343a40; width: 25px;">${optionChar}.</label>
                <input type="text" class="course-option-input" style="flex: 1; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px;" placeholder="选项${i+1}">
            `;
            optionsContainer.appendChild(optionDiv);
        }
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-info';
        addButton.style.cssText = 'padding: 8px 16px; font-size: 13px; margin-top: 5px;';
        addButton.innerHTML = '<i class="fas fa-plus"></i> 添加选项';
        addButton.onclick = function(e) {
            e.preventDefault();
            const container = document.getElementById('courseOptionsContainer');
            const currentOptions = container.querySelectorAll('.course-option-input');
            if (currentOptions.length >= 6) {
                alert('最多支持6个选项');
                return;
            }
            const nextOption = String.fromCharCode(65 + currentOptions.length);
            const optionDiv = document.createElement('div');
            optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
            optionDiv.innerHTML = `
                <label style="margin-right: 10px; font-weight: 600; color: #343a40; width: 25px;">${nextOption}.</label>
                <input type="text" class="course-option-input" style="flex: 1; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px;" placeholder="选项${currentOptions.length+1}">
            `;
            container.appendChild(optionDiv);
        };
        
        optionsDiv.appendChild(optionsContainer);
        optionsDiv.appendChild(addButton);
        
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <input type="text" id="courseQuestionAnswer" placeholder="如：A 或 A,B（多选）" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
            <small style="color: #856404; font-size: 12px; margin-top: 5px; display: block;">
                <i class="fas fa-info-circle"></i> 选择题填选项字母，多选用逗号分隔
            </small>
        `;
    } else if (type === 'judgment') {
        optionsDiv.style.display = 'none';
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <select id="courseQuestionAnswer" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
                <option value="正确">正确</option>
                <option value="错误">错误</option>
            </select>
        `;
    } else {
        optionsDiv.style.display = 'none';
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <input type="text" id="courseQuestionAnswer" placeholder="请输入正确答案" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
            <small id="courseQuestionAnswerHint" style="color: #856404; font-size: 12px; margin-top: 5px; display: block;">
                <i class="fas fa-info-circle"></i> 填空题填正确答案
            </small>
        `;
    }
}

// 切换分类下拉列表
function toggleCourseCategoryDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('courseCategoryDropdownContent');
    if (dropdown.style.display === 'none') {
        dropdown.style.display = 'block';
        loadCourseCategoryList();
    } else {
        dropdown.style.display = 'none';
    }
}

// 加载分类列表
function loadCourseCategoryList() {
    let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
    if (categories.length === 0) {
        categories = ['默认分类', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
    }
    renderCourseCategoryDropdown(categories);
}

// 渲染分类下拉列表
function renderCourseCategoryDropdown(categories) {
    const dropdownContent = document.getElementById('courseCategoryDropdownContent');
    dropdownContent.innerHTML = '';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'checkbox-item';
        item.style.cssText = 'padding: 10px 15px; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid #f0f0f0;';
        item.onmouseover = function() { this.style.background = '#f8f9fa'; };
        item.onmouseout = function() { this.style.background = 'white'; };
        item.innerHTML = `<span>${category}</span>`;
        item.onclick = function() { selectCourseCategory(category); };
        dropdownContent.appendChild(item);
    });
    
    const addNewDiv = document.createElement('div');
    addNewDiv.className = 'checkbox-item';
    addNewDiv.style.cssText = 'padding: 10px 15px; cursor: pointer; color: #007bff; font-weight: 500; border-top: 2px solid #e9ecef;';
    addNewDiv.innerHTML = '<i class="fas fa-plus" style="margin-right: 8px;"></i>添加自定义分类';
    addNewDiv.onclick = addNewCourseCategory;
    dropdownContent.appendChild(addNewDiv);
}

// 选择分类
function selectCourseCategory(category) {
    document.getElementById('courseCategorySelectedText').textContent = category;
    document.getElementById('courseQuestionCategory').value = category;
    document.getElementById('courseCategoryDropdownContent').style.display = 'none';
}

// 添加新分类
function addNewCourseCategory() {
    const newCategory = prompt('请输入新的分类名称：');
    if (newCategory && newCategory.trim()) {
        const categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
        if (!categories.includes(newCategory.trim())) {
            categories.push(newCategory.trim());
            localStorage.setItem('questionCategories', JSON.stringify(categories));
            renderCourseCategoryDropdown(categories);
        }
        selectCourseCategory(newCategory.trim());
    }
}

// 添加课程问题
function addCourseQuestion() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请先选择课程');
        return;
    }
    
    const title = document.getElementById('courseQuestionTitle').value.trim();
    const questionType = document.getElementById('courseQuestionType').value;
    const correctAnswer = document.getElementById('courseQuestionAnswer').value.trim();
    const score = parseInt(document.getElementById('courseQuestionScore').value) || 5;
    const timeLimit = parseInt(document.getElementById('courseQuestionTimeLimit').value) || 60;
    const category = document.getElementById('courseQuestionCategory').value.trim();
    
    if (!title) {
        alert('问题标题不能为空');
        return;
    }
    
    let optionsText = '';
    if (questionType === 'single_choice' || questionType === 'multiple_choice') {
        const optionInputs = document.querySelectorAll('.course-option-input');
        const options = [];
        optionInputs.forEach((input, index) => {
            const optionText = input.value.trim();
            if (optionText) {
                const optionChar = String.fromCharCode(65 + index);
                options.push(`${optionChar}. ${optionText}`);
            }
        });
        if (options.length === 0) {
            alert('选择题必须填写至少一个选项');
            return;
        }
        optionsText = options.join('\n');
    }

    if (!correctAnswer && questionType !== 'subjective') {
        alert('正确答案不能为空');
        return;
    }
    
    fetch(`/teacher/course/${courseId}/question/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            title: title,
            content: '',
            question_type: questionType,
            options: optionsText,
            correct_answer: correctAnswer,
            score: score,
            time_limit: timeLimit,
            category: category
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题添加成功');
            document.getElementById('addCourseQuestionModal').remove();
            loadCourseQuestions();
        } else {
            alert('添加失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

let currentSessionStudents = [];
let currentFilterType = 'all';

async function startClassSession() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请先选择课程');
        return;
    }
    
    if (!confirm('确定要开始上课吗？开始后学生端将自动开启视频和语音检测。')) return;
    
    try {
        const response = await fetch(`/teacher/course/${courseId}/start_session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ session_name: '' })
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            alert('开始上课成功！\n学生端将自动开启检测。');
            updateSessionButtons(true);
        } else {
            alert('开始上课失败: ' + data.msg);
        }
    } catch (err) {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    }
}

async function endClassSession() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请先选择课程');
        return;
    }
    
    if (!confirm('确定要结束上课吗？结束后将保存所有学生的课堂记录。')) return;
    
    try {
        const response = await fetch(`/teacher/course/${courseId}/end_session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            alert('结束上课成功！\n课堂记录已保存。');
            updateSessionButtons(false);
            loadCourseSessions();
        } else {
            alert('结束上课失败: ' + data.msg);
        }
    } catch (err) {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    }
}

function updateSessionButtons(isInSession) {
    const startBtn = document.getElementById('startClassBtn');
    const endBtn = document.getElementById('endClassBtn');
    
    if (isInSession) {
        startBtn.style.display = 'none';
        endBtn.style.display = 'inline-flex';
    } else {
        startBtn.style.display = 'inline-flex';
        endBtn.style.display = 'none';
    }
}

async function checkSessionStatus() {
    const courseId = currentCourseId;
    if (!courseId) return;
    
    try {
        const response = await fetch(`/teacher/course/${courseId}/session_status`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            updateSessionButtons(data.data.is_in_session);
        }
    } catch (err) {
        console.error('检查会话状态失败:', err);
    }
}

async function loadCourseSessions() {
    const courseId = currentCourseId;
    if (!courseId) return;
    
    try {
        const response = await fetch(`/teacher/course/${courseId}/sessions`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.code === 200) {
            displayCourseSessions(data.data);
        } else {
            console.error('获取课堂记录失败:', data.msg);
        }
    } catch (err) {
        console.error('网络错误:', err);
    }
}

function displayCourseSessions(sessions) {
    const tbody = document.getElementById('courseSessionsTableBody');
    
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #6c757d;">暂无课堂记录</td></tr>';
        return;
    }
    
    tbody.innerHTML = sessions.map(session => `
        <tr>
            <td>${session.session_name || '未命名课堂'}</td>
            <td>${session.start_time}</td>
            <td>${session.end_time || '进行中'}</td>
            <td>${session.total_students}</td>
            <td>${session.total_questions}</td>
            <td>
                ${session.warning_count > 0 
                    ? `<span style="color: #dc3545; font-weight: bold;">${session.warning_count} 人</span>` 
                    : '<span style="color: #28a745;">0 人</span>'}
            </td>
            <td>
                <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; 
                    ${session.status === 'active' 
                        ? 'background: #d4edda; color: #155724;' 
                        : 'background: #e9ecef; color: #6c757d;'}">
                    ${session.status === 'active' ? '进行中' : '已结束'}
                </span>
            </td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="viewSessionDetail(${session.id}).catch(err => { console.error('查看详情失败:', err); alert('加载详情失败，请重试'); })">
                    <i class="fas fa-eye"></i> 查看详情
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewSessionDetail(sessionId) {
    console.log('正在加载课堂详情，sessionId:', sessionId);
    try {
        const response = await fetch(`/teacher/session/${sessionId}/detail`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API响应状态:', response.status);
        const data = await response.json();
        console.log('API响应数据:', data);
        
        if (data.code === 200) {
            showSessionDetailModal(data.data);
        } else {
            alert('获取课堂详情失败: ' + data.msg);
        }
    } catch (err) {
        console.error('查看课堂详情出错:', err);
        alert('网络错误，请重试');
    }
}

function showSessionDetailModal(data) {
    console.log('显示课堂详情弹窗，数据:', data);

    if (!data || !data.session) {
        console.error('课堂详情数据无效:', data);
        alert('课堂详情数据无效');
        return;
    }

    const session = data.session;
    currentSessionStudents = data.student_records || [];
    currentFilterType = 'all';

    // 计算异常学生数（抬头率低于30%或has_warning为true）
    const warningCount = currentSessionStudents.filter(s =>
        (s.avg_head_up_rate || 0) < 30 || s.has_warning
    ).length;

    // 检查DOM元素是否存在
    const titleEl = document.getElementById('sessionDetailTitle');
    const startTimeEl = document.getElementById('sessionDetailStartTime');
    const endTimeEl = document.getElementById('sessionDetailEndTime');
    const studentCountEl = document.getElementById('sessionDetailStudentCount');
    const questionCountEl = document.getElementById('sessionDetailQuestionCount');
    const warningCountEl = document.getElementById('sessionDetailWarningCount');
    const modalEl = document.getElementById('sessionDetailModal');

    console.log('DOM元素检查:', { titleEl, startTimeEl, endTimeEl, studentCountEl, questionCountEl, warningCountEl, modalEl });

    if (titleEl) titleEl.textContent = session.session_name || '课堂详情';
    if (startTimeEl) startTimeEl.textContent = session.start_time || '-';
    if (endTimeEl) endTimeEl.textContent = session.end_time || '进行中';
    if (studentCountEl) studentCountEl.textContent = session.total_students || 0;
    if (questionCountEl) questionCountEl.textContent = session.total_questions || 0;
    if (warningCountEl) warningCountEl.textContent = warningCount;

    updateFilterButtons('all');
    displaySessionStudents(currentSessionStudents);

    if (modalEl) {
        modalEl.style.display = 'flex';
        console.log('弹窗已显示');
    } else {
        console.error('找不到sessionDetailModal元素');
    }
}

function displaySessionStudents(students) {
    const tbody = document.getElementById('sessionStudentsTableBody');

    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #6c757d;">暂无学生数据</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => {
        // 判断抬头率是否低于30%，低于则标红并标记为异常
        const headUpRate = student.avg_head_up_rate || 0;
        const isLowHeadUpRate = headUpRate < 30;
        const headUpRateStyle = isLowHeadUpRate ? 'color: #dc3545; font-weight: bold;' : '';
        const headUpRateDisplay = isLowHeadUpRate
            ? `<span style="${headUpRateStyle}">${headUpRate.toFixed(1)}% <i class="fas fa-exclamation-triangle" title="抬头率过低"></i></span>`
            : `${headUpRate.toFixed(1)}%`;

        // 状态：抬头率低于30%或has_warning为true时显示异常
        const isAbnormal = isLowHeadUpRate || student.has_warning;

        return `
        <tr style="${isAbnormal ? 'background: #fff3cd;' : ''}">
            <td>${student.student_id}</td>
            <td>${student.student_name}</td>
            <td style="${headUpRateStyle}">${headUpRateDisplay}</td>
            <td>${student.audio_count}</td>
            <td>${student.answered_count}/${student.question_count}</td>
            <td>${student.correct_count}</td>
            <td>
                ${isAbnormal
                    ? '<span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #f8d7da; color: #721c24;">异常</span>'
                    : '<span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #d4edda; color: #155724;">正常</span>'}
            </td>
            <td>
                <button class="btn btn-info btn-sm" onclick="viewStudentSessionDetail('${student.student_id}', '${student.student_name}')">
                    <i class="fas fa-user"></i> 详情
                </button>
            </td>
        </tr>
    `}).join('');
}

function filterSessionStudents(filterType) {
    currentFilterType = filterType;
    updateFilterButtons(filterType);

    let filteredStudents = currentSessionStudents;

    // 判断学生是否异常的函数（抬头率低于30%或has_warning为true）
    const isStudentAbnormal = (s) => (s.avg_head_up_rate || 0) < 30 || s.has_warning;

    if (filterType === 'warning') {
        // 异常：抬头率低于30%或has_warning为true
        filteredStudents = currentSessionStudents.filter(isStudentAbnormal);
    } else if (filterType === 'normal') {
        // 正常：抬头率>=30%且has_warning为false
        filteredStudents = currentSessionStudents.filter(s => !isStudentAbnormal(s));
    }

    displaySessionStudents(filteredStudents);
}

function updateFilterButtons(activeType) {
    const allBtn = document.getElementById('filterAllBtn');
    const warningBtn = document.getElementById('filterWarningBtn');
    const normalBtn = document.getElementById('filterNormalBtn');

    const buttons = [allBtn, warningBtn, normalBtn];

    buttons.forEach(btn => {
        if (btn) {
            btn.style.background = '#f8f9fa';
            btn.style.color = '#333';
        }
    });

    if (activeType === 'all') {
        allBtn.style.background = '#007bff';
        allBtn.style.color = 'white';
    } else if (activeType === 'warning') {
        warningBtn.style.background = '#dc3545';
        warningBtn.style.color = 'white';
    } else if (activeType === 'normal') {
        normalBtn.style.background = '#28a745';
        normalBtn.style.color = 'white';
    }
}

function viewStudentSessionDetail(studentId, studentName) {
    const student = currentSessionStudents.find(s => s.student_id === studentId);
    if (!student) return;
    
    document.getElementById('studentSessionDetailTitle').textContent = `${studentName} 的课堂详情`;
    
    const warningBox = document.getElementById('studentSessionWarningBox');
    const warningContent = document.getElementById('studentSessionWarningContent');
    
    if (student.has_warning && student.warning_reasons && student.warning_reasons.length > 0) {
        warningBox.style.display = 'block';
        warningContent.innerHTML = student.warning_reasons.map(reason => 
            `<div style="margin-bottom: 5px;"><i class="fas fa-exclamation-circle" style="color: #856404; margin-right: 5px;"></i>${reason}</div>`
        ).join('');
    } else {
        warningBox.style.display = 'none';
    }
    
    const videoContent = document.getElementById('studentVideoRecordsContent');
    if (student.video_records && student.video_records.length > 0) {
        videoContent.innerHTML = `
            <table class="table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>抬头次数</th>
                        <th>低头次数</th>
                        <th>抬头率</th>
                    </tr>
                </thead>
                <tbody>
                    ${student.video_records.map(v => `
                        <tr>
                            <td>${v.record_time}</td>
                            <td>${v.head_up_count}</td>
                            <td>${v.head_down_count}</td>
                            <td>${v.head_up_rate ? v.head_up_rate.toFixed(1) : 0}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        videoContent.innerHTML = '<p style="color: #6c757d; text-align: center;">暂无视频记录</p>';
    }
    
    const audioContent = document.getElementById('studentAudioRecordsContent');
    if (student.audio_records && student.audio_records.length > 0) {
        audioContent.innerHTML = `
            <table class="table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>时间</th>
                        <th>内容</th>
                        <th>是否问题</th>
                    </tr>
                </thead>
                <tbody>
                    ${student.audio_records.map(a => `
                        <tr>
                            <td>${a.record_time}</td>
                            <td>${a.content || '-'}</td>
                            <td>${a.is_question ? '<span style="color: #dc3545;">是</span>' : '否'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        audioContent.innerHTML = '<p style="color: #6c757d; text-align: center;">暂无音频记录</p>';
    }
    
    const answerContent = document.getElementById('studentAnswerRecordsContent');
    if (student.answer_records && student.answer_records.length > 0) {
        answerContent.innerHTML = `
            <table class="table" style="font-size: 13px;">
                <thead>
                    <tr>
                        <th>问题ID</th>
                        <th>答案</th>
                        <th>状态</th>
                        <th>得分</th>
                        <th>提交时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${student.answer_records.map(a => `
                        <tr>
                            <td>${a.question_id}</td>
                            <td>${a.content || '-'}</td>
                            <td>${a.is_correct 
                                ? '<span style="color: #28a745;">正确</span>' 
                                : '<span style="color: #dc3545;">错误</span>'}</td>
                            <td>${a.score}</td>
                            <td>${a.submit_time}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        answerContent.innerHTML = '<p style="color: #6c757d; text-align: center;">暂无答题记录</p>';
    }
    
    document.getElementById('studentSessionDetailModal').style.display = 'flex';
}

function closeSessionDetailModal() {
    document.getElementById('sessionDetailModal').style.display = 'none';
}

function closeStudentSessionDetailModal() {
    document.getElementById('studentSessionDetailModal').style.display = 'none';
}

// 显示导入问题模态框
function showImportCourseQuestionModal() {
    const courseId = currentCourseId;
    if (!courseId) {
        alert('请先选择课程');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'importCourseQuestionModal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
        justify-content: center; align-items: center;
    `;
    
    modal.innerHTML = `
        <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 30px; border-radius: 16px; 
            max-width: 650px; width: 95%; max-height: 85%; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                <h4 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #17a2b8, #138496); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-file-import" style="color: white; font-size: 18px;"></i>
                    </div>
                    导入课程问题
                </h4>
                <button onclick="document.getElementById('importCourseQuestionModal').remove()" 
                    style="background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6c757d; transition: all 0.3s;">&times;</button>
            </div>
            
            <!-- 文件格式说明 -->
            <div style="margin-bottom: 20px; padding: 18px; background: linear-gradient(135deg, #e3f2fd, #bbdefb); border-radius: 12px; border: 2px solid #2196f3;">
                <h5 style="margin: 0 0 12px 0; color: #1565c0; font-size: 14px; font-weight: 600;">
                    <i class="fas fa-info-circle" style="margin-right: 8px;"></i>文件格式要求
                </h5>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #1976d2; line-height: 1.8;">
                    <li>支持 <strong>Excel(.xlsx)</strong> 和 <strong>CSV(.csv)</strong> 格式</li>
                    <li>必须包含列：<strong>标题、题型、答案、分数</strong></li>
                    <li>题型可选：单选、多选、判断、填空、问答</li>
                    <li>选择题需包含：选项1、选项2、选项3、选项4 列</li>
                </ul>
            </div>
            
            <!-- 文件上传区域 -->
            <div id="courseFileUploadArea" style="margin-bottom: 20px; padding: 30px; background: #f8f9fa; border-radius: 12px; border: 2px dashed #ced4da; text-align: center; transition: all 0.3s; cursor: pointer;" 
                onclick="document.getElementById('importCourseQuestionFile').click()"
                ondragover="this.style.borderColor='#007bff'; this.style.background='#e3f2fd';"
                ondragleave="this.style.borderColor='#ced4da'; this.style.background='#f8f9fa';"
                ondrop="handleCourseFileDrop(event)">
                <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #6c757d; margin-bottom: 15px;"></i>
                <p style="margin: 0 0 8px 0; font-size: 16px; color: #343a40; font-weight: 500;">点击或拖拽文件到此处上传</p>
                <p style="margin: 0; font-size: 13px; color: #6c757d;">支持 .xlsx, .csv 格式</p>
                <input type="file" id="importCourseQuestionFile" accept=".xlsx,.csv" style="display: none;" onchange="handleCourseFileSelect(event)">
            </div>
            
            <!-- 已选文件显示 -->
            <div id="courseSelectedFile" style="display: none; margin-bottom: 20px; padding: 15px; background: #d4edda; border-radius: 10px; border: 2px solid #28a745;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i class="fas fa-file-excel" style="font-size: 32px; color: #28a745;"></i>
                    <div style="flex: 1;">
                        <p id="courseFileName" style="margin: 0; font-weight: 600; color: #155724;"></p>
                        <p id="courseFileSize" style="margin: 4px 0 0 0; font-size: 12px; color: #155724;"></p>
                    </div>
                    <button onclick="clearCourseSelectedFile()" style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        <i class="fas fa-times"></i> 移除
                    </button>
                </div>
            </div>
            
            <!-- 预览区域 -->
            <div id="importCourseQuestionPreview" style="display: none; margin-bottom: 20px; padding: 20px; background: white; border-radius: 12px; border: 2px solid #e9ecef;">
            </div>
            
            <!-- 消息提示 -->
            <div id="importCourseQuestionMsg" style="margin-bottom: 20px;"></div>
            
            <!-- 操作按钮 -->
            <div style="display: flex; gap: 12px; justify-content: flex-end; padding-top: 15px; border-top: 1px solid #e9ecef;">
                <button type="button" onclick="document.getElementById('importCourseQuestionModal').remove()" style="padding: 12px 28px; border: 2px solid #e9ecef; background: white; border-radius: 10px; font-size: 14px; cursor: pointer; color: #6c757d; font-weight: 500;">
                    <i class="fas fa-times"></i> 取消
                </button>
                <button type="button" onclick="previewCourseQuestionImport()" style="padding: 12px 28px; border: none; background: linear-gradient(135deg, #17a2b8, #138496); border-radius: 10px; font-size: 14px; cursor: pointer; color: white; font-weight: 500;">
                    <i class="fas fa-eye"></i> 预览
                </button>
                <button type="button" onclick="importCourseQuestions()" style="padding: 12px 28px; border: none; background: linear-gradient(135deg, #28a745, #1e7e34); border-radius: 10px; font-size: 14px; cursor: pointer; color: white; font-weight: 500;">
                    <i class="fas fa-file-import"></i> 导入
                </button>
            </div>
        </div>
    `;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    document.body.appendChild(modal);
}

// 处理文件选择
function handleCourseFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        showCourseSelectedFile(file);
    }
}

// 处理文件拖放
function handleCourseFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.csv'))) {
        showCourseSelectedFile(file);
        // 更新input元素
        const fileInput = document.getElementById('importCourseQuestionFile');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
    } else {
        alert('请选择 .xlsx 或 .csv 格式的文件');
    }
}

// 显示已选文件
function showCourseSelectedFile(file) {
    document.getElementById('courseFileUploadArea').style.display = 'none';
    document.getElementById('courseSelectedFile').style.display = 'block';
    document.getElementById('courseFileName').textContent = file.name;
    document.getElementById('courseFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
}

// 清除已选文件
function clearCourseSelectedFile() {
    document.getElementById('courseFileUploadArea').style.display = 'block';
    document.getElementById('courseSelectedFile').style.display = 'none';
    document.getElementById('importCourseQuestionFile').value = '';
    document.getElementById('importCourseQuestionPreview').style.display = 'none';
    document.getElementById('importCourseQuestionMsg').innerHTML = '';
}

// 发布问题
function publishCourseQuestion(questionId) {
    fetch('/teacher/question/publish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question_id: questionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题发布成功');
            loadCourseQuestions();
        } else {
            alert('发布失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

// 撤回问题
function unpublishCourseQuestion(questionId) {
    fetch('/teacher/question/unpublish', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question_id: questionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题已撤回');
            loadCourseQuestions();
        } else {
            alert('撤回失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

// 删除问题
function deleteCourseQuestion(questionId) {
    if (!confirm('确定要删除这个问题吗？')) return;
    
    fetch('/teacher/question/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ question_id: questionId })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题删除成功');
            loadCourseQuestions();
        } else {
            alert('删除失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

// 全选/取消全选
function toggleSelectAllCourseQuestions() {
    const selectAll = document.getElementById('selectAllCourseQuestions').checked;
    document.querySelectorAll('.course-question-checkbox').forEach(cb => {
        cb.checked = selectAll;
    });
}

// 批量发布
function publishSelectedCourseQuestions() {
    const selectedIds = Array.from(document.querySelectorAll('.course-question-checkbox:checked')).map(cb => parseInt(cb.value));
    
    if (selectedIds.length === 0) {
        alert('请选择要发布的问题');
        return;
    }
    
    if (!confirm(`确定要发布选中的 ${selectedIds.length} 个问题吗？`)) return;
    
    let successCount = 0;
    let completed = 0;
    
    selectedIds.forEach(id => {
        fetch('/teacher/question/publish', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ question_id: id })
        })
        .then(res => res.json())
        .then(data => {
            completed++;
            if (data.code === 200) successCount++;
            if (completed === selectedIds.length) {
                alert(`发布完成，成功 ${successCount} 个`);
                loadCourseQuestions();
            }
        });
    });
}

// 批量删除
function deleteSelectedCourseQuestions() {
    const selectedIds = Array.from(document.querySelectorAll('.course-question-checkbox:checked')).map(cb => parseInt(cb.value));
    
    if (selectedIds.length === 0) {
        alert('请选择要删除的问题');
        return;
    }
    
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 个问题吗？`)) return;
    
    let successCount = 0;
    let completed = 0;
    
    selectedIds.forEach(id => {
        fetch('/teacher/question/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ question_id: id })
        })
        .then(res => res.json())
        .then(data => {
            completed++;
            if (data.code === 200) successCount++;
            if (completed === selectedIds.length) {
                alert(`删除完成，成功 ${successCount} 个`);
                loadCourseQuestions();
            }
        });
    });
}

// 查看问题答题情况
function viewCourseQuestionAnswers(questionId) {
    fetch(`/teacher/question/answers/${questionId}`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.code !== 200) {
            alert('获取答题情况失败: ' + data.msg);
            return;
        }
        
        const question = data.data.question;
        const answers = data.data.answers;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
            justify-content: center; align-items: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 25px; border-radius: 12px; 
                max-width: 800px; width: 90%; max-height: 80%; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin: 0; color: var(--dark-color);">
                        <i class="fas fa-chart-bar" style="color: var(--primary-color); margin-right: 10px;"></i>
                        答题情况 - ${question.title}
                    </h4>
                    <button onclick="this.closest('div').parentElement.remove()" 
                        style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <p style="margin: 0;"><strong>正确答案：</strong>${question.correct_answer}</p>
                    <p style="margin: 10px 0 0 0;"><strong>统计：</strong>共 ${data.data.total_count} 人答题，${data.data.correct_count} 人正确</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">学号</th>
                            <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">姓名</th>
                            <th style="padding: 10px; border: 1px solid #e9ecef; text-align: left;">答案</th>
                            <th style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">状态</th>
                            <th style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">得分</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${answers.map(a => `
                            <tr>
                                <td style="padding: 10px; border: 1px solid #e9ecef;">${a.student_id}</td>
                                <td style="padding: 10px; border: 1px solid #e9ecef;">${a.student_name}</td>
                                <td style="padding: 10px; border: 1px solid #e9ecef;">${a.content}</td>
                                <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">
                                    <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; ${a.is_correct ? 'background: #d4edda; color: #155724;' : 'background: #f8d7da; color: #721c24;'}">
                                        ${a.is_correct ? '正确' : '错误'}
                                    </span>
                                </td>
                                <td style="padding: 10px; border: 1px solid #e9ecef; text-align: center;">${a.score}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

// 编辑问题
function editCourseQuestion(questionId) {
    fetch(`/teacher/question/detail/${questionId}`, {
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data.code !== 200) {
            alert('获取问题详情失败: ' + data.msg);
            return;
        }
        
        const q = data.data;
        
        // 解析选项
        let optionsList = [];
        console.log('原始选项数据:', q.options);
        console.log('题型:', q.question_type);
        if (q.options) {
            // 处理 Windows 换行符 \r\n 和 Unix 换行符 \n
            const normalizedOptions = q.options.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const lines = normalizedOptions.split('\n');
            console.log('分割后的行:', lines);
            lines.forEach(line => {
                const trimmedLine = line.trim();
                const match = trimmedLine.match(/^([A-F])\.\s*(.+)$/);
                if (match) {
                    optionsList.push({ letter: match[1], text: match[2] });
                    console.log('匹配到选项:', match[1], match[2]);
                } else {
                    console.log('未匹配到选项:', trimmedLine);
                }
            });
        }
        console.log('解析后的选项列表:', optionsList);
        
        // 获取分类列表
        let categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
        if (categories.length === 0) {
            categories = ['默认分类', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
        }
        
        const modal = document.createElement('div');
        modal.id = 'editCourseQuestionModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background-color: rgba(0,0,0,0.5); z-index: 2000; display: flex; 
            justify-content: center; align-items: center;
        `;
        
        // 根据题型生成选项HTML
        let optionsHtml = '';
        if (q.question_type === 'choice' || q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
            let optionInputsHtml = '';
            for (let i = 0; i < Math.max(optionsList.length, 3); i++) {
                const opt = optionsList[i] || { letter: String.fromCharCode(65 + i), text: '' };
                optionInputsHtml += `
                    <div style="margin-bottom: 8px; display: flex; align-items: center;">
                        <label style="margin-right: 10px; font-weight: 600; color: #343a40; width: 25px;">${opt.letter}.</label>
                        <input type="text" class="edit-course-option-input" data-letter="${opt.letter}" value="${opt.text}" style="flex: 1; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px;" placeholder="选项${i+1}">
                    </div>
                `;
            }
            optionsHtml = `
                <div id="editCourseQuestionOptionsDiv" style="padding: 15px; background: #f8f9fa; border-radius: 10px; border: 2px dashed #e9ecef;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">
                        <i class="fas fa-list-ul" style="color: #007bff; margin-right: 5px;"></i> 选择题选项
                    </label>
                    <div id="editCourseOptionsContainer">
                        ${optionInputsHtml}
                    </div>
                    <button type="button" class="btn btn-info" onclick="addEditCourseOption()" style="padding: 8px 16px; font-size: 13px; margin-top: 5px;">
                        <i class="fas fa-plus"></i> 添加选项
                    </button>
                </div>
            `;
        } else {
            optionsHtml = `<div id="editCourseQuestionOptionsDiv" style="display: none;"></div>`;
        }
        
        // 根据题型生成答案HTML
        let answerHtml = '';
        if (q.question_type === 'judgment') {
            answerHtml = `
                <div id="editCourseQuestionAnswerDiv" style="padding: 15px; background: linear-gradient(135deg, #fff3cd, #ffeeba); border-radius: 10px; border: 2px solid #ffc107;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                        <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
                    </label>
                    <select id="editCourseQuestionAnswer" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
                        <option value="正确" ${q.correct_answer === '正确' || q.correct_answer === 'true' ? 'selected' : ''}>正确</option>
                        <option value="错误" ${q.correct_answer === '错误' || q.correct_answer === 'false' ? 'selected' : ''}>错误</option>
                    </select>
                </div>
            `;
        } else {
            answerHtml = `
                <div id="editCourseQuestionAnswerDiv" style="padding: 15px; background: linear-gradient(135deg, #fff3cd, #ffeeba); border-radius: 10px; border: 2px solid #ffc107;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                        <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
                    </label>
                    <input type="text" id="editCourseQuestionAnswer" value="${q.correct_answer || ''}" placeholder="请输入正确答案" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
                </div>
            `;
        }
        
        // 生成分类下拉列表HTML
        let categoryOptionsHtml = categories.map(cat => 
            `<div class="checkbox-item" onclick="selectEditCourseCategory('${cat}')" style="padding: 10px 15px; cursor: pointer; transition: all 0.2s; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                <span>${cat}</span>
            </div>`
        ).join('');
        
        modal.innerHTML = `
            <div style="background: linear-gradient(135deg, #ffffff, #f8f9fa); padding: 30px; border-radius: 16px; 
                max-width: 700px; width: 95%; max-height: 85%; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #e9ecef;">
                    <h4 style="margin: 0; color: #2c3e50; font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #ffc107, #ff9800); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-edit" style="color: white; font-size: 18px;"></i>
                        </div>
                        编辑问题
                    </h4>
                    <button onclick="document.getElementById('editCourseQuestionModal').remove()" 
                        style="background: #f8f9fa; border: none; font-size: 20px; cursor: pointer; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6c757d; transition: all 0.3s;">&times;</button>
                </div>
                <form id="editCourseQuestionForm" style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">问题标题 <span style="color: #dc3545;">*</span></label>
                            <input type="text" id="editCourseQuestionTitle" value="${q.title}" required placeholder="请输入问题标题" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">分值</label>
                            <input type="number" id="editCourseQuestionScore" value="${q.score}" min="1" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">题型</label>
                            <select id="editCourseQuestionType" onchange="toggleEditCourseQuestionOptions()" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px; background: white;">
                                <option value="single_choice" ${q.question_type === 'single_choice' || q.question_type === 'choice' ? 'selected' : ''}>单选题</option>
                                <option value="multiple_choice" ${q.question_type === 'multiple_choice' ? 'selected' : ''}>多选题</option>
                                <option value="judgment" ${q.question_type === 'judgment' ? 'selected' : ''}>判断题</option>
                                <option value="subjective" ${q.question_type === 'subjective' || q.question_type === 'text' || q.question_type === 'fill_blank' ? 'selected' : ''}>主观题</option>
                            </select>
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">答题时限（秒）</label>
                            <input type="number" id="editCourseQuestionTimeLimit" value="${q.time_limit}" min="30" style="width: 100%; padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; font-size: 14px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">问题分类</label>
                            <div class="dropdown-checkbox" onclick="toggleEditCourseCategoryDropdown(event)" style="position: relative;">
                                <div class="dropdown-header" style="padding: 12px 15px; border: 2px solid #e9ecef; border-radius: 10px; background: white; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                                    <span class="selected-text" id="editCourseCategorySelectedText">${q.category || '请选择分类'}</span>
                                    <i class="fas fa-chevron-down" style="color: #6c757d; font-size: 12px;"></i>
                                </div>
                                <div class="dropdown-content" id="editCourseCategoryDropdownContent" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: white; border: 2px solid #e9ecef; border-radius: 10px; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                    ${categoryOptionsHtml}
                                    <div class="checkbox-item" onclick="addNewEditCourseCategory()" style="padding: 10px 15px; cursor: pointer; color: #007bff; font-weight: 500; border-top: 2px solid #e9ecef;">
                                        <i class="fas fa-plus" style="margin-right: 8px;"></i>添加自定义分类
                                    </div>
                                </div>
                            </div>
                            <input type="hidden" id="editCourseQuestionCategory" value="${q.category || ''}">
                        </div>
                    </div>
                    ${optionsHtml}
                    ${answerHtml}
                    <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                        <button type="button" onclick="document.getElementById('editCourseQuestionModal').remove()" style="padding: 12px 28px; border: 2px solid #e9ecef; background: white; border-radius: 10px; font-size: 14px; cursor: pointer; color: #6c757d; font-weight: 500;">
                            <i class="fas fa-times"></i> 取消
                        </button>
                        <button type="button" onclick="saveCourseQuestionEdit(${questionId})" style="padding: 12px 28px; border: none; background: linear-gradient(135deg, #ffc107, #ff9800); border-radius: 10px; font-size: 14px; cursor: pointer; color: white; font-weight: 500;">
                            <i class="fas fa-save"></i> 保存
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        document.body.appendChild(modal);
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}

// 切换编辑问题选项显示
function toggleEditCourseQuestionOptions() {
    const type = document.getElementById('editCourseQuestionType').value;
    const optionsDiv = document.getElementById('editCourseQuestionOptionsDiv');
    const answerDiv = document.getElementById('editCourseQuestionAnswerDiv');

    if (type === 'single_choice' || type === 'multiple_choice') {
        optionsDiv.style.display = 'block';
        optionsDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #343a40; font-size: 14px;">
                <i class="fas fa-list-ul" style="color: #007bff; margin-right: 5px;"></i> 选择题选项
            </label>
            <div id="editCourseOptionsContainer">
                ${[0, 1, 2].map(i => `
                    <div style="margin-bottom: 8px; display: flex; align-items: center;">
                        <label style="margin-right: 10px; font-weight: 600; color: #343a40; width: 25px;">${String.fromCharCode(65 + i)}.</label>
                        <input type="text" class="edit-course-option-input" data-letter="${String.fromCharCode(65 + i)}" style="flex: 1; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px;" placeholder="选项${i+1}">
                    </div>
                `).join('')}
            </div>
            <button type="button" class="btn btn-info" onclick="addEditCourseOption()" style="padding: 8px 16px; font-size: 13px; margin-top: 5px;">
                <i class="fas fa-plus"></i> 添加选项
            </button>
        `;
        
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <input type="text" id="editCourseQuestionAnswer" placeholder="如：A 或 A,B（多选）" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
        `;
    } else if (type === 'judgment') {
        optionsDiv.style.display = 'none';
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <select id="editCourseQuestionAnswer" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
                <option value="正确">正确</option>
                <option value="错误">错误</option>
            </select>
        `;
    } else {
        optionsDiv.style.display = 'none';
        answerDiv.innerHTML = `
            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #856404; font-size: 14px;">
                <i class="fas fa-check-circle" style="margin-right: 5px;"></i> 正确答案 <span style="color: #dc3545;">*</span>
            </label>
            <input type="text" id="editCourseQuestionAnswer" placeholder="请输入正确答案" style="width: 100%; padding: 12px 15px; border: 2px solid #ffc107; border-radius: 10px; font-size: 14px; background: white;">
        `;
    }
}

// 添加编辑选项
function addEditCourseOption() {
    const container = document.getElementById('editCourseOptionsContainer');
    const currentOptions = container.querySelectorAll('.edit-course-option-input');
    if (currentOptions.length >= 6) {
        alert('最多支持6个选项');
        return;
    }
    const nextOption = String.fromCharCode(65 + currentOptions.length);
    const optionDiv = document.createElement('div');
    optionDiv.style.cssText = 'margin-bottom: 8px; display: flex; align-items: center;';
    optionDiv.innerHTML = `
        <label style="margin-right: 10px; font-weight: 600; color: #343a40; width: 25px;">${nextOption}.</label>
        <input type="text" class="edit-course-option-input" data-letter="${nextOption}" style="flex: 1; padding: 10px 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px;" placeholder="选项${currentOptions.length+1}">
    `;
    container.appendChild(optionDiv);
}

// 切换编辑分类下拉列表
function toggleEditCourseCategoryDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('editCourseCategoryDropdownContent');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// 选择编辑分类
function selectEditCourseCategory(category) {
    document.getElementById('editCourseCategorySelectedText').textContent = category;
    document.getElementById('editCourseQuestionCategory').value = category;
    document.getElementById('editCourseCategoryDropdownContent').style.display = 'none';
}

// 添加新编辑分类
function addNewEditCourseCategory() {
    const newCategory = prompt('请输入新的分类名称：');
    if (newCategory && newCategory.trim()) {
        const categories = JSON.parse(localStorage.getItem('questionCategories') || '[]');
        if (!categories.includes(newCategory.trim())) {
            categories.push(newCategory.trim());
            localStorage.setItem('questionCategories', JSON.stringify(categories));
        }
        selectEditCourseCategory(newCategory.trim());
    }
}

// 保存问题编辑
function saveCourseQuestionEdit(questionId) {
    const title = document.getElementById('editCourseQuestionTitle').value.trim();
    const questionType = document.getElementById('editCourseQuestionType').value;
    const correctAnswer = document.getElementById('editCourseQuestionAnswer').value.trim();
    const score = parseInt(document.getElementById('editCourseQuestionScore').value) || 5;
    const timeLimit = parseInt(document.getElementById('editCourseQuestionTimeLimit').value) || 60;
    const category = document.getElementById('editCourseQuestionCategory').value.trim();
    
    if (!title) {
        alert('问题标题不能为空');
        return;
    }
    
    let optionsText = '';
    if (questionType === 'single_choice' || questionType === 'multiple_choice') {
        const optionInputs = document.querySelectorAll('.edit-course-option-input');
        const options = [];
        optionInputs.forEach((input) => {
            const optionText = input.value.trim();
            const letter = input.getAttribute('data-letter');
            if (optionText) {
                options.push(`${letter}. ${optionText}`);
            }
        });
        if (options.length === 0) {
            alert('选择题必须填写至少一个选项');
            return;
        }
        optionsText = options.join('\n');
    }

    if (!correctAnswer && questionType !== 'subjective') {
        alert('正确答案不能为空');
        return;
    }
    
    fetch(`/teacher/question/update/${questionId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
            title: title,
            content: '',
            question_type: questionType,
            options: optionsText,
            correct_answer: correctAnswer,
            score: score,
            time_limit: timeLimit,
            category: category
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.code === 200) {
            alert('问题修改成功');
            document.getElementById('editCourseQuestionModal').remove();
            loadCourseQuestions();
        } else {
            alert('修改失败: ' + data.msg);
        }
    })
    .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误，请重试');
    });
}