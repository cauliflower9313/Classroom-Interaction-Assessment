// 学生端课程列表模块
const coursesModule = {
    currentCourseId: null,
    currentQuestionId: null,
    answerTimer: null,
    answerTimeLeft: 60,
    currentQuestions: [],

    // 加载学生课程列表
    loadCourses() {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;

        coursesList.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">加载课程中...</p>
            </div>
        `;

        fetch('/student/courses', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderCoursesList(data.data);
            } else {
                this.renderError('获取课程列表失败');
            }
        })
        .catch(error => {
            console.error('获取课程列表失败:', error);
            this.renderError('网络错误，请稍后重试');
        });
    },

    // 渲染课程列表
    renderCoursesList(courses) {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;

        if (!courses || courses.length === 0) {
            coursesList.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    <i class="fas fa-book" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">暂无课程</p>
                    <p style="font-size: 14px; color: #6c757d;">请联系教师获取课程邀请</p>
                </div>
            `;
            return;
        }

        coursesList.innerHTML = courses.map(course => `
            <div class="course-card" onclick="coursesModule.viewCourseDetail(${course.id})" style="cursor: pointer; background: linear-gradient(135deg, white, #f8f9fa); border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <h4 style="margin: 0 0 8px 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">${course.name}</h4>
                        <p style="margin: 0 0 12px 0; color: var(--secondary-color); font-size: 14px;">${course.teacher_name} · ${course.created_at}</p>
                    </div>
                    <div style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                        进行中
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 20px;">
                        <div style="text-align: center;">
                            <div style="font-size: 16px; font-weight: 600; color: var(--dark-color);">${course.student_count}</div>
                            <div style="font-size: 12px; color: var(--secondary-color);">学生</div>
                        </div>
                    </div>
                    <button style="background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color); padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
                        进入课程
                    </button>
                </div>
            </div>
        `).join('');
    },

    // 渲染错误信息
    renderError(message) {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;

        coursesList.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">${message}</p>
                <button onclick="coursesModule.loadCourses()" style="margin-top: 20px; background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 25px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
                    重试
                </button>
            </div>
        `;
    },

    // 查看课程详情
    viewCourseDetail(courseId) {
        this.currentCourseId = courseId;
        switchTab('course-detail');

        const courseDetailTab = document.getElementById('course-detail-tab');
        if (courseDetailTab) {
            courseDetailTab.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                    <p style="font-size: 18px; margin-bottom: 10px;">加载课程详情中...</p>
                </div>
            `;
        }

        fetch(`/student/courses/${courseId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderCourseDetail(data.data);
                // 加载该课程的问题
                this.loadCourseQuestions();
                // 开始轮询检查课堂状态
                this.startSessionStatusPolling();
            } else {
                this.renderCourseDetailError('获取课程详情失败');
            }
        })
        .catch(error => {
            console.error('获取课程详情失败:', error);
            this.renderCourseDetailError('网络错误，请稍后重试');
        });
    },

    // 渲染课程详情（包含课堂检测和答题功能）
    renderCourseDetail(course) {
        const courseDetailTab = document.getElementById('course-detail-tab');
        if (!courseDetailTab) return;

        courseDetailTab.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; padding: 12px; border-radius: 12px; font-size: 20px; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);">
                    <i class="fas fa-book"></i>
                </div>
                <div>
                    <h3 style="margin: 0; color: var(--dark-color); font-size: 24px; font-weight: 600;">${course.name}</h3>
                    <p style="margin: 5px 0 0 0; color: var(--secondary-color); font-size: 14px;">${course.teacher_name} · ${course.created_at}</p>
                </div>
                <button class="btn btn-secondary" onclick="switchTab('courses')" style="margin-left: auto;">
                    <i class="fas fa-arrow-left"></i> 返回课程列表
                </button>
            </div>

            <!-- 视图切换按钮 -->
            <div style="margin-bottom: 20px;">
                <button id="showClassroomBtn" class="btn btn-primary btn-sm" onclick="coursesModule.showClassroomView()">
                    <i class="fas fa-chalkboard"></i> 当前课堂
                </button>
                <button id="showRecordsBtn" class="btn btn-secondary btn-sm" onclick="coursesModule.showRecordsView()" style="margin-left: 10px;">
                    <i class="fas fa-history"></i> 课程记录
                </button>
            </div>

            <!-- 当前课堂视图 -->
            <div id="classroomView">
                <!-- 课堂检测区域 -->
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 10px; border-radius: 10px; font-size: 18px;">
                            <i class="fas fa-clipboard-check"></i>
                        </div>
                        <h4 style="margin: 0; color: var(--dark-color); font-size: 20px; font-weight: 600;">课堂检测</h4>
                    </div>

                    <!-- 检测功能区 -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                        <!-- 视频抬头检测 -->
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e9ecef;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                                <h5 style="margin: 0; color: var(--dark-color); font-size: 14px; font-weight: 600;">
                                    <i class="fas fa-video" style="color: var(--primary-color); margin-right: 8px;"></i>视频抬头检测
                                </h5>
                                <span id="videoStatus" style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">未检测</span>
                            </div>
                            <!-- 视频检测区域：高度增加，按钮隐藏 -->
                            <div style="position: relative; width: 100%; height: 520px; background: #f8f9fa; border-radius: 8px; overflow: hidden; margin-bottom: 15px;">
                                <video id="videoElement" style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
                                <div id="videoPlaceholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%;">
                                    <i class="fas fa-camera" style="font-size: 48px; color: var(--primary-color); margin-bottom: 10px;"></i>
                                    <p style="margin: 0; color: var(--secondary-color); font-size: 14px;">等待教师开启课堂...</p>
                                </div>
                            </div>
                            <!-- 视频控制按钮已隐藏，由教师端控制 -->
                            <div style="display: none;">
                                <button id="startVideoBtn" onclick="coursesModule.startVideoDetection()" style="flex: 1; background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: pointer;">
                                    <i class="fas fa-play"></i> 开始
                                </button>
                                <button id="stopVideoBtn" onclick="coursesModule.stopVideoDetection()" disabled style="flex: 1; background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: not-allowed;">
                                    <i class="fas fa-stop"></i> 停止
                                </button>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                <div style="background: #f8f9fa; border-radius: 6px; padding: 10px; text-align: center;">
                                    <div style="font-size: 10px; color: var(--secondary-color);">抬头</div>
                                    <div id="headUpCount" style="font-size: 18px; font-weight: 600; color: var(--success-color);">0</div>
                                </div>
                                <div style="background: #f8f9fa; border-radius: 6px; padding: 10px; text-align: center;">
                                    <div style="font-size: 10px; color: var(--secondary-color);">低头</div>
                                    <div id="headDownCount" style="font-size: 18px; font-weight: 600; color: var(--danger-color);">0</div>
                                </div>
                                <div style="background: #f8f9fa; border-radius: 6px; padding: 10px; text-align: center;">
                                    <div style="font-size: 10px; color: var(--secondary-color);">抬头率</div>
                                    <div id="headUpRate" style="font-size: 18px; font-weight: 600; color: var(--primary-color);">0%</div>
                                </div>
                            </div>
                        </div>

                        <!-- 音频识别 -->
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05); border: 1px solid #e9ecef;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
                                <h5 style="margin: 0; color: var(--dark-color); font-size: 14px; font-weight: 600;">
                                    <i class="fas fa-microphone" style="color: #dc3545; margin-right: 8px;"></i>语音互动识别
                                </h5>
                                <span id="audioStatus" style="background: #28a745; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">未识别</span>
                            </div>
                            <!-- 音频识别区域：高度增加，按钮隐藏 -->
                            <div style="height: 520px; background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; overflow-y: auto;">
                                <p id="audioResult" style="margin: 0; color: var(--secondary-color); font-size: 15px; line-height: 1.8;">等待教师开启课堂...</p>
                            </div>
                            <!-- 音频控制按钮已隐藏，由教师端控制 -->
                            <div style="display: none;">
                                <button id="startAudioBtn" onclick="coursesModule.startAudioDetection()" style="flex: 1; background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: pointer;">
                                    <i class="fas fa-microphone-alt"></i> 开始识别
                                </button>
                                <button id="stopAudioBtn" onclick="coursesModule.stopAudioDetection()" disabled style="flex: 1; background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; cursor: not-allowed;">
                                    <i class="fas fa-stop"></i> 停止
                                </button>
                            </div>
                            <div style="margin-top: 10px; text-align: center;">
                                <span style="font-size: 12px; color: var(--secondary-color);">本节课累计提问次数：</span>
                                <span id="questionCount" style="background: #28a745; color: white; padding: 2px 10px; border-radius: 10px; font-size: 12px;">0</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 答题区域 -->
                <div style="background: linear-gradient(135deg, white, #f8f9fa); border-radius: 12px; padding: 25px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border: 1px solid #e9ecef; margin-bottom: 30px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: linear-gradient(135deg, #ffc107, #e0a800); color: white; padding: 10px; border-radius: 10px; font-size: 18px;">
                                <i class="fas fa-question-circle"></i>
                            </div>
                            <h4 style="margin: 0; color: var(--dark-color); font-size: 20px; font-weight: 600;">课堂答题</h4>
                        </div>
                        <button onclick="coursesModule.loadCourseQuestions()" style="background: var(--primary-color); color: white; border: none; padding: 8px 20px; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.3s ease;">
                            <i class="fas fa-sync-alt"></i> 刷新题目
                        </button>
                    </div>

                    <div id="courseQuestionsList">
                        <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                            <i class="fas fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 15px; color: var(--primary-color);"></i>
                            <p>正在加载题目...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 课程记录视图 -->
            <div id="courseRecordsView" style="display: none;">
                <div class="panel">
                    <div class="panel-body" id="courseRecordsList">
                        <div style="text-align: center; padding: 60px; color: var(--secondary-color);">
                            <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: var(--primary-color);"></i>
                            <p>点击上方"课程记录"按钮加载记录...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // 加载课程问题
    loadCourseQuestions() {
        const questionsList = document.getElementById('courseQuestionsList');
        if (!questionsList) return;

        questionsList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                <i class="fas fa-spinner fa-spin" style="font-size: 36px; margin-bottom: 15px; color: var(--primary-color);"></i>
                <p>正在加载题目...</p>
            </div>
        `;

        // 使用当前课程ID加载该课程的问题
        const courseId = this.currentCourseId;
        if (!courseId) {
            questionsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 36px; margin-bottom: 15px; color: #dc3545;"></i>
                    <p>未选择课程</p>
                </div>
            `;
            return;
        }

        // 添加时间戳避免缓存
        const timestamp = new Date().getTime();
        fetch(`/student/course/${courseId}/questions?_t=${timestamp}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.currentQuestions = data.data.items || [];
                this.renderCourseQuestions(this.currentQuestions);
            } else {
                questionsList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                        <i class="fas fa-exclamation-circle" style="font-size: 36px; margin-bottom: 15px; color: #dc3545;"></i>
                        <p>${data.msg || '加载题目失败'}</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('加载题目失败:', error);
            questionsList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="font-size: 36px; margin-bottom: 15px; color: #dc3545;"></i>
                    <p>网络错误，请稍后重试</p>
                </div>
            `;
        });
    },

    // 渲染课程问题列表
    renderCourseQuestions(questions) {
        const questionsList = document.getElementById('courseQuestionsList');
        if (!questionsList) return;

        if (!questions || questions.length === 0) {
            questionsList.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--secondary-color); background: #f8f9fa; border-radius: 12px; border: 2px dashed #e9ecef;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 15px; color: var(--secondary-color);"></i>
                    <p style="font-size: 16px; margin-bottom: 8px;">暂无已发布的问题</p>
                    <p style="font-size: 13px;">教师还没有发布问题，请稍后再来</p>
                </div>
            `;
            return;
        }

        questionsList.innerHTML = questions.map((q, index) => `
            <div class="question-item" style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e9ecef; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
                <!-- 问题头部 -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <span style="background: var(--primary-color); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 10px;">问题 ${index + 1}</span>
                        <span style="background: #e3f2fd; color: #0277bd; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">${this.getQuestionTypeName(q.question_type)}</span>
                        <span style="background: #fff3cd; color: #856404; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-left: 8px;">${q.score}分</span>
                    </div>
                    ${q.has_answered ?
                        `<div style="text-align: right;">
                            <span style="background: #d4edda; color: #155724; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;"><i class="fas fa-check"></i> 已回答</span>
                            ${q.is_correct !== null ? 
                                `<div style="margin-top: 4px;">
                                    ${q.is_correct ? 
                                        `<span style="color: #28a745; font-size: 12px;"><i class="fas fa-check-circle"></i> 正确 +${q.student_score}分</span>` : 
                                        `<span style="color: #dc3545; font-size: 12px;"><i class="fas fa-times-circle"></i> 错误 0分</span>`
                                    }
                                </div>` : ''
                            }
                        </div>` :
                        `<span style="background: #f8d7da; color: #721c24; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;"><i class="fas fa-clock"></i> 待回答</span>`
                    }
                </div>

                <!-- 问题内容 -->
                <h5 style="margin: 0 0 12px 0; color: var(--dark-color); font-size: 16px; font-weight: 600; line-height: 1.5;">${q.title}</h5>
                <p style="margin: 0 0 15px 0; color: var(--secondary-color); font-size: 14px; line-height: 1.6;">${q.content || ''}</p>

                <!-- 选项（如果是选择题） -->
                ${(q.question_type === 'choice' || q.question_type === 'single_choice' || q.question_type === 'multiple_choice') && q.options ? `
                    <div style="margin-bottom: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        ${this.parseOptions(q.options).map((opt, i) => `
                            <div style="padding: 8px 0; color: var(--dark-color); font-size: 14px;">
                                <strong style="color: var(--primary-color); margin-right: 8px;">${String.fromCharCode(65 + i)}.</strong>${opt.trim()}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- 答题按钮 -->
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    ${q.has_answered ?
                        `<button disabled style="flex: 1; background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: not-allowed;">
                            <i class="fas fa-check-circle"></i> 已完成答题
                        </button>` :
                        `<button onclick="coursesModule.openAnswerModal(${q.id})" style="flex: 1; background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.3s ease;">
                            <i class="fas fa-edit"></i> 立即答题
                        </button>`
                    }
                    <button onclick="coursesModule.toggleComments(${q.id})" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fas fa-comments"></i> 讨论区
                    </button>
                </div>

                <!-- 评论区（默认隐藏） -->
                <div id="comments-section-${q.id}" style="display: none; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px;">
                        <i class="fas fa-comments" style="color: var(--primary-color);"></i>
                        <h6 style="margin: 0; color: var(--dark-color); font-size: 15px; font-weight: 600;">题目讨论区</h6>
                    </div>

                    <!-- 评论输入框 -->
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; gap: 10px;">
                            <textarea id="comment-input-${q.id}" placeholder="发表你的看法或疑问..." style="flex: 1; padding: 12px; border: 1px solid #e9ecef; border-radius: 8px; font-size: 14px; resize: vertical; min-height: 60px;"></textarea>
                            <button onclick="coursesModule.submitComment(${q.id})" style="background: var(--primary-color); color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 14px; cursor: pointer; white-space: nowrap;">
                                <i class="fas fa-paper-plane"></i> 发表
                            </button>
                        </div>
                    </div>

                    <!-- 评论列表 -->
                    <div id="comments-list-${q.id}" style="max-height: 400px; overflow-y: auto;">
                        <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                            <i class="fas fa-spinner fa-spin"></i> 加载评论中...
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // 解析选项（支持多种格式）
    parseOptions(optionsStr) {
        if (!optionsStr) return [];
        
        // 处理 Windows 换行符 \r\n 和 Unix 换行符 \n
        const normalizedOptions = optionsStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // 尝试按换行分割
        if (normalizedOptions.includes('\n')) {
            return normalizedOptions.split('\n').map(opt => {
                // 移除选项前缀（如 A. B. C. D.）
                return opt.replace(/^[A-F][.、]\s*/i, '').trim();
            }).filter(opt => opt);
        }
        
        // 按逗号分割
        return normalizedOptions.split(/[,，]/).map(opt => opt.trim()).filter(opt => opt);
    },

    // 切换评论区显示/隐藏
    toggleComments(questionId) {
        const commentsSection = document.getElementById(`comments-section-${questionId}`);
        if (!commentsSection) return;

        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            this.loadComments(questionId);
        } else {
            commentsSection.style.display = 'none';
        }
    },

    // 加载评论
    loadComments(questionId) {
        const commentsList = document.getElementById(`comments-list-${questionId}`);
        if (!commentsList) return;

        commentsList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                <i class="fas fa-spinner fa-spin"></i> 加载评论中...
            </div>
        `;

        fetch(`/student/question/${questionId}/comments`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.renderComments(questionId, data.data.comments);
            } else {
                commentsList.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                        <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i>加载评论失败
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('加载评论失败:', error);
            commentsList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--secondary-color);">
                    <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i>网络错误，请稍后重试
                </div>
            `;
        });
    },

    // 渲染评论列表
    renderComments(questionId, comments) {
        const commentsList = document.getElementById(`comments-list-${questionId}`);
        if (!commentsList) return;

        if (!comments || comments.length === 0) {
            commentsList.innerHTML = `
                <div style="text-align: center; padding: 30px; color: var(--secondary-color); background: #f8f9fa; border-radius: 8px;">
                    <i class="fas fa-comment-slash" style="font-size: 24px; margin-bottom: 10px;"></i>
                    <p style="font-size: 14px; margin: 0;">暂无评论，快来发表第一条评论吧！</p>
                </div>
            `;
            return;
        }

        // 递归渲染评论和回复
        const renderCommentItem = (comment, depth = 0) => {
            const indentStyle = depth > 0 ? `margin-left: ${depth * 40}px; border-left: 3px solid var(--primary-color);` : '';
            const isReply = depth > 0;
            const authorBadge = comment.author_type === 'teacher' ?
                `<span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;"><i class="fas fa-chalkboard-teacher"></i> 教师</span>` :
                `<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 8px;"><i class="fas fa-user"></i> 学生</span>`;

            let html = `
                <div class="comment-item" style="background: ${isReply ? '#f8f9fa' : 'white'}; border-radius: 8px; padding: 15px; margin-bottom: 10px; ${indentStyle}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 36px; height: 36px; background: linear-gradient(135deg, var(--primary-color), #0056b3); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 10px;">
                                ${comment.author_name.charAt(0)}
                            </div>
                            <div>
                                <div style="display: flex; align-items: center;">
                                    <span style="font-weight: 600; color: var(--dark-color); font-size: 14px;">${comment.author_name}</span>
                                    ${authorBadge}
                                </div>
                                <span style="font-size: 12px; color: var(--secondary-color);">${comment.create_time}</span>
                            </div>
                        </div>
                        ${comment.is_author ? `
                            <button onclick="coursesModule.deleteComment(${questionId}, ${comment.id})" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <p style="margin: 0 0 10px 0; color: var(--dark-color); font-size: 14px; line-height: 1.6; padding-left: 46px;">${comment.content}</p>
                    <div style="padding-left: 46px;">
                        <button onclick="coursesModule.showReplyForm(${questionId}, ${comment.id})" style="background: none; border: none; color: var(--primary-color); cursor: pointer; font-size: 13px;">
                            <i class="fas fa-reply"></i> 回复
                        </button>
                    </div>

                    <!-- 回复输入框（默认隐藏） -->
                    <div id="reply-form-${comment.id}" style="display: none; margin-top: 10px; margin-left: 46px;">
                        <div style="display: flex; gap: 8px;">
                            <textarea id="reply-input-${comment.id}" placeholder="回复 ${comment.author_name}..." style="flex: 1; padding: 10px; border: 1px solid #e9ecef; border-radius: 6px; font-size: 13px; resize: vertical; min-height: 50px;"></textarea>
                            <div style="display: flex; flex-direction: column; gap: 5px;">
                                <button onclick="coursesModule.submitReply(${questionId}, ${comment.id})" style="background: var(--primary-color); color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                    发送
                                </button>
                                <button onclick="coursesModule.hideReplyForm(${comment.id})" style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 递归渲染子回复
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    html += renderCommentItem(reply, depth + 1);
                });
            }

            return html;
        };

        commentsList.innerHTML = comments.map(comment => renderCommentItem(comment)).join('');
    },

    // 显示回复表单
    showReplyForm(questionId, commentId) {
        // 隐藏所有其他回复表单
        document.querySelectorAll('[id^="reply-form-"]').forEach(el => {
            el.style.display = 'none';
        });

        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'block';
            const input = document.getElementById(`reply-input-${commentId}`);
            if (input) input.focus();
        }
    },

    // 隐藏回复表单
    hideReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.style.display = 'none';
        }
    },

    // 发表评论
    submitComment(questionId) {
        const input = document.getElementById(`comment-input-${questionId}`);
        if (!input) return;

        const content = input.value.trim();
        if (!content) {
            alert('请输入评论内容');
            return;
        }

        fetch(`/student/question/${questionId}/comment`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                input.value = '';
                this.loadComments(questionId);
            } else {
                alert(data.msg || '发表评论失败');
            }
        })
        .catch(error => {
            console.error('发表评论失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    // 提交回复
    submitReply(questionId, parentId) {
        const input = document.getElementById(`reply-input-${parentId}`);
        if (!input) return;

        const content = input.value.trim();
        if (!content) {
            alert('请输入回复内容');
            return;
        }

        fetch(`/student/question/${questionId}/comment`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: content, parent_id: parentId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.hideReplyForm(parentId);
                this.loadComments(questionId);
            } else {
                alert(data.msg || '回复失败');
            }
        })
        .catch(error => {
            console.error('回复失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    // 删除评论
    deleteComment(questionId, commentId) {
        if (!confirm('确定要删除这条评论吗？')) return;

        fetch(`/student/comment/${commentId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                this.loadComments(questionId);
            } else {
                alert(data.msg || '删除失败');
            }
        })
        .catch(error => {
            console.error('删除评论失败:', error);
            alert('网络错误，请稍后重试');
        });
    },

    // 打开答题模态框
    openAnswerModal(questionId) {
        const question = this.currentQuestions.find(q => q.id === questionId);
        if (!question) return;

        this.currentQuestionId = questionId;
        this.answerTimeLeft = question.time_limit || 60;

        // 创建答题模态框
        const modal = document.createElement('div');
        modal.id = 'course-answer-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;';

        let answerFormHtml = '';
        if (question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
            const options = this.parseOptions(question.options);
            answerFormHtml = options.map((opt, i) => `
                <label style="display: block; padding: 12px; margin-bottom: 8px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer; transition: all 0.3s ease;">
                    <input type="radio" name="answer" value="${String.fromCharCode(65 + i)}" style="margin-right: 10px;">
                    <strong style="color: var(--primary-color); margin-right: 8px;">${String.fromCharCode(65 + i)}.</strong>${opt.trim()}
                </label>
            `).join('');
        } else if (question.question_type === 'judgment') {
            answerFormHtml = `
                <label style="display: block; padding: 12px; margin-bottom: 8px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="answer" value="true" style="margin-right: 10px;"> 正确
                </label>
                <label style="display: block; padding: 12px; margin-bottom: 8px; border: 2px solid #e9ecef; border-radius: 8px; cursor: pointer;">
                    <input type="radio" name="answer" value="false" style="margin-right: 10px;"> 错误
                </label>
            `;
        } else {
            answerFormHtml = `
                <textarea id="answer-text" placeholder="请输入你的答案..." style="width: 100%; padding: 12px; border: 2px solid #e9ecef; border-radius: 8px; font-size: 14px; resize: vertical; min-height: 120px;"></textarea>
            `;
        }

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding: 20px 25px; border-bottom: 1px solid #e9ecef; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: var(--dark-color); font-size: 18px; font-weight: 600;">回答问题</h3>
                        <div style="display: flex; gap: 10px; margin-top: 8px;">
                            <span style="background: #e3f2fd; color: #0277bd; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${this.getQuestionTypeName(question.question_type)}</span>
                            <span style="background: #fff3cd; color: #856404; padding: 2px 10px; border-radius: 10px; font-size: 12px;">${question.score}分</span>
                        </div>
                    </div>
                    <button onclick="coursesModule.closeAnswerModal()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--secondary-color);">&times;</button>
                </div>

                <div style="padding: 25px;">
                    <div style="background: linear-gradient(135deg, #ffc107, #ff9800); color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: 600;">
                        <i class="fas fa-clock"></i> 剩余时间: <span id="answer-timer">${this.answerTimeLeft}</span> 秒
                    </div>

                    <h4 style="margin: 0 0 15px 0; color: var(--dark-color); font-size: 16px; line-height: 1.5;">${question.title}</h4>
                    ${question.content ? `<p style="margin: 0 0 20px 0; color: var(--secondary-color); font-size: 14px; line-height: 1.6;">${question.content}</p>` : ''}

                    <div id="answer-form-container">
                        ${answerFormHtml}
                    </div>
                </div>

                <div style="padding: 15px 25px; border-top: 1px solid #e9ecef; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="coursesModule.closeAnswerModal()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; cursor: pointer;">取消</button>
                    <button onclick="coursesModule.submitAnswer()" style="background: linear-gradient(135deg, var(--primary-color), #0056b3); color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 600;">提交答案</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 启动计时器
        this.answerTimer = setInterval(() => {
            this.answerTimeLeft--;
            const timerEl = document.getElementById('answer-timer');
            if (timerEl) {
                timerEl.textContent = this.answerTimeLeft;
                if (this.answerTimeLeft <= 10) {
                    timerEl.parentElement.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
                }
            }

            if (this.answerTimeLeft <= 0) {
                this.submitAnswer();
            }
        }, 1000);
    },

    // 关闭答题模态框
    closeAnswerModal() {
        if (this.answerTimer) {
            clearInterval(this.answerTimer);
            this.answerTimer = null;
        }

        const modal = document.getElementById('course-answer-modal');
        if (modal) {
            modal.remove();
        }
    },

    // 提交答案
    submitAnswer() {
        if (this.answerTimer) {
            clearInterval(this.answerTimer);
            this.answerTimer = null;
        }

        const question = this.currentQuestions.find(q => q.id === this.currentQuestionId);
        if (!question) return;

        let answer = '';
        if (question.question_type === 'choice' || question.question_type === 'single_choice' || question.question_type === 'multiple_choice' || question.question_type === 'judgment') {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (selected) {
                answer = selected.value;
            }
        } else {
            const textArea = document.getElementById('answer-text');
            if (textArea) {
                answer = textArea.value.trim();
            }
        }

        if (!answer) {
            alert('请输入答案');
            // 重新启动计时器
            this.answerTimer = setInterval(() => {
                this.answerTimeLeft--;
                const timerEl = document.getElementById('answer-timer');
                if (timerEl) timerEl.textContent = this.answerTimeLeft;
                if (this.answerTimeLeft <= 0) {
                    this.closeAnswerModal();
                }
            }, 1000);
            return;
        }

        const timeSpent = (question.time_limit || 60) - this.answerTimeLeft;

        console.log('提交答案:', {
            question_id: this.currentQuestionId,
            content: answer,
            time_spent: timeSpent
        });
        
        fetch('/student/submit_answer', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: this.currentQuestionId,
                content: answer,
                time_spent: timeSpent
            })
        })
        .then(response => {
            console.log('答题提交响应状态:', response.status);
            if (!response.ok) {
                throw new Error('网络响应错误: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            console.log('答题提交结果:', data);
            if (data.code === 200) {
                alert('答题成功！');
                this.closeAnswerModal();
                this.loadCourseQuestions(); // 刷新问题列表
            } else {
                alert(data.msg || '答题失败');
                this.closeAnswerModal();
            }
        })
        .catch(error => {
            console.error('答题失败:', error);
            alert('网络错误，请稍后重试');
            this.closeAnswerModal();
        });
    },

    // 获取题型名称
    getQuestionTypeName(type) {
        const typeMap = {
            'single_choice': '单选题',
            'multiple_choice': '多选题',
            'judgment': '判断题',
            'fill_blank': '填空题',
            'subjective': '主观题',
            // 兼容旧数据
            'choice': '单选题',
            'text': '主观题'
        };
        return typeMap[type] || type;
    },

    // 视频检测功能
    startVideoDetection() {
        if (typeof detectionModule !== 'undefined') {
            detectionModule.init();
            detectionModule.startVideoDetection();
        } else {
            console.error('detectionModule 未加载');
            alert('检测模块加载失败，请刷新页面重试');
        }
    },

    stopVideoDetection() {
        if (typeof detectionModule !== 'undefined') {
            detectionModule.stopVideoDetection();
        }
    },

    // 音频检测功能
    startAudioDetection() {
        if (typeof detectionModule !== 'undefined') {
            detectionModule.init();
            detectionModule.startAudioRecognition();
        } else {
            console.error('detectionModule 未加载');
            alert('检测模块加载失败，请刷新页面重试');
        }
    },

    stopAudioDetection() {
        if (typeof detectionModule !== 'undefined') {
            detectionModule.stopAudioRecognition();
        }
    },

    // 渲染课程详情错误
    renderCourseDetailError(message) {
        const courseDetailTab = document.getElementById('course-detail-tab');
        if (!courseDetailTab) return;

        courseDetailTab.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--secondary-color); background: linear-gradient(135deg, #f8f9fa, white); border-radius: 16px; border: 2px dashed #e9ecef; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px; color: #dc3545;"></i>
                <p style="font-size: 18px; margin-bottom: 10px;">${message}</p>
                <button onclick="switchTab('courses')" style="margin-top: 20px; background: var(--primary-color); color: white; border: none; padding: 10px 20px; border-radius: 25px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;">
                    返回课程列表
                </button>
            </div>
        `;
    },

    showClassroomView() {
        const classroomView = document.getElementById('classroomView');
        const recordsView = document.getElementById('courseRecordsView');
        const classroomBtn = document.getElementById('showClassroomBtn');
        const recordsBtn = document.getElementById('showRecordsBtn');
        
        if (classroomView) classroomView.style.display = 'block';
        if (recordsView) recordsView.style.display = 'none';
        if (classroomBtn) {
            classroomBtn.classList.remove('btn-secondary');
            classroomBtn.classList.add('btn-primary');
        }
        if (recordsBtn) {
            recordsBtn.classList.remove('btn-primary');
            recordsBtn.classList.add('btn-secondary');
        }
    },

    showRecordsView() {
        const classroomView = document.getElementById('classroomView');
        const recordsView = document.getElementById('courseRecordsView');
        const classroomBtn = document.getElementById('showClassroomBtn');
        const recordsBtn = document.getElementById('showRecordsBtn');
        
        if (classroomView) classroomView.style.display = 'none';
        if (recordsView) recordsView.style.display = 'block';
        if (classroomBtn) {
            classroomBtn.classList.remove('btn-primary');
            classroomBtn.classList.add('btn-secondary');
        }
        if (recordsBtn) {
            recordsBtn.classList.remove('btn-secondary');
            recordsBtn.classList.add('btn-primary');
        }
        
        if (this.currentCourseId && typeof courseRecordsModule !== 'undefined') {
            courseRecordsModule.loadCourseRecords(this.currentCourseId);
        }
    },

    sessionPollingInterval: null,
    isDetectionStarted: false,

    startAutoDetection() {
        if (this.isDetectionStarted) return;
        
        if (typeof detectionModule !== 'undefined') {
            detectionModule.startVideoDetection();
            detectionModule.startAudioRecognition();
            this.isDetectionStarted = true;
        }
    },

    stopAutoDetection() {
        if (!this.isDetectionStarted) return;
        
        if (typeof detectionModule !== 'undefined') {
            detectionModule.stopVideoDetection();
            detectionModule.stopAudioRecognition();
            this.isDetectionStarted = false;
        }
    },

    checkCourseSessionStatus() {
        if (!this.currentCourseId) return;
        
        fetch(`/student/course/${this.currentCourseId}/session_status`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200 && data.data.is_in_session) {
                // 课程正在进行中，检测会自动启动，不需要显示提示
                console.log('课程正在进行中，检测功能将自动启动');
            }
        })
        .catch(error => {
            console.error('检查课程状态失败:', error);
        });
    },

    startSessionStatusPolling() {
        this.stopSessionStatusPolling();
        
        this.checkCourseSessionStatus();
        
        this.sessionPollingInterval = setInterval(() => {
            this.checkCourseSessionStatus();
        }, 5000);
    },

    stopSessionStatusPolling() {
        if (this.sessionPollingInterval) {
            clearInterval(this.sessionPollingInterval);
            this.sessionPollingInterval = null;
        }
    },


};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = coursesModule;
} else {
    window.coursesModule = coursesModule;
}
