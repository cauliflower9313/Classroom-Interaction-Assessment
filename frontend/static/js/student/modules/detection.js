// 学生端检测功能模块
const detectionModule = {
    // 视频检测相关变量
    videoElement: null,
    videoPlaceholder: null,
    startVideoBtn: null,
    stopVideoBtn: null,
    videoStatus: null,
    headUpCount: 0,
    headDownCount: 0,
    headUpRate: 0,
    videoStream: null,
    detectionInterval: null,
    
    // 音频识别相关变量
    startAudioBtn: null,
    stopAudioBtn: null,
    audioStatus: null,
    audioResult: null,
    mediaRecorder: null,
    audioChunks: [],
    audioStream: null,
    isRecording: false,
    recordCount: 0,
    recordingTimer: null,
    RECORD_DURATION: 30000,
    questionCount: 0,
    pendingRequests: 0,
    stopRequested: false,
    
    // 强制检测模式相关变量
    forcedDetectionMode: false,
    currentCourseId: null,
    currentSessionId: null,  // 当前会话ID
    sessionCheckInterval: null,
    courseStatusCheckInterval: null,  // 定期检查课程状态（检测开始上课）
    
    // 初始化检测功能
    init() {
        // 尝试获取多种可能的元素ID
        this.videoElement = document.getElementById('videoElement');
        this.videoPlaceholder = document.getElementById('videoPlaceholder');
        this.startVideoBtn = document.getElementById('startVideoBtn');
        this.stopVideoBtn = document.getElementById('stopVideoBtn');
        this.videoStatus = document.getElementById('videoStatus');
        
        this.startAudioBtn = document.getElementById('startAudioBtn');
        this.stopAudioBtn = document.getElementById('stopAudioBtn');
        this.audioStatus = document.getElementById('audioStatus');
        this.audioResult = document.getElementById('audioResult');
        
        this.bindEvents();
        this.checkAllCoursesSessionStatus();
        // 开始定期检查课程状态（检测教师是否开始上课）
        this.startCourseStatusCheck();
    },
    
    // 检查所有课程的上课状态
    async checkAllCoursesSessionStatus() {
        try {
            const response = await fetch('/student/courses', {
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.code === 200 && data.data) {
                console.log(`检测到 ${data.data.length} 门课程:`, data.data.map(c => ({id: c.id, name: c.name, is_in_session: c.is_in_session})));
                
                for (const course of data.data) {
                    if (course.is_in_session) {
                        console.log(`课程 ${course.name} (ID: ${course.id}) 正在上课`);
                        // 如果检测到课程正在进行且当前不在强制检测模式
                        if (!this.forcedDetectionMode) {
                            this.currentCourseId = course.id;
                            this.enableForcedDetection(course.id);
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error('检查课程状态失败:', error);
        }
    },
    
    // 开始定期检查课程状态（用于检测教师开始上课）
    startCourseStatusCheck() {
        // 如果已经有定时器在运行，先清除
        if (this.courseStatusCheckInterval) {
            clearInterval(this.courseStatusCheckInterval);
        }
        
        // 立即检查一次
        this.checkAllCoursesSessionStatus();
        
        // 每3秒检查一次课程状态
        this.courseStatusCheckInterval = setInterval(() => {
            // 只有在当前不在强制检测模式下才检查
            if (!this.forcedDetectionMode) {
                this.checkAllCoursesSessionStatus();
            }
        }, 3000);
        
        console.log('开始定期检查课程状态（每3秒）');
    },
    
    // 停止定期检查课程状态
    stopCourseStatusCheck() {
        if (this.courseStatusCheckInterval) {
            clearInterval(this.courseStatusCheckInterval);
            this.courseStatusCheckInterval = null;
            console.log('停止定期检查课程状态');
        }
    },
    
    // 启用强制检测模式
    async enableForcedDetection(courseId) {
        this.forcedDetectionMode = true;
        this.currentCourseId = courseId;

        // 显示课程开始提示
        this.showSessionStartedNotice();

        // 停止课程状态检查（避免重复检测）
        this.stopCourseStatusCheck();

        // 立即获取会话ID（在启动检测之前）
        await this.fetchSessionId(courseId);

        // 自动切换到课程详情页
        if (courseId && typeof switchTab === 'function') {
            console.log('自动切换到课程详情页');
            // 使用 coursesModule.viewCourseDetail 加载课程详情
            if (typeof coursesModule !== 'undefined' && coursesModule.viewCourseDetail) {
                coursesModule.viewCourseDetail(courseId);
            } else {
                // 如果 coursesModule 不可用，直接切换标签
                switchTab('course-detail');
            }
        }

        // 自动开启视频和音频检测（添加延迟确保DOM已准备好）
        setTimeout(() => {
            console.log('自动启动视频检测...');
            this.startVideoDetection();
        }, 800);

        // 确保在获取到 session_id 后再启动音频检测
        setTimeout(() => {
            if (this.currentSessionId) {
                console.log('自动启动音频检测，会话ID:', this.currentSessionId);
                this.startAudioRecognition();
            } else {
                console.warn('未获取到会话ID，延迟启动音频检测...');
                // 延迟重试
                const checkAndStart = () => {
                    if (this.currentSessionId) {
                        console.log('获取到会话ID，启动音频检测:', this.currentSessionId);
                        this.startAudioRecognition();
                    } else {
                        console.warn('仍未获取到会话ID，继续等待...');
                        setTimeout(checkAndStart, 500);
                    }
                };
                setTimeout(checkAndStart, 1000);
            }
        }, 1500);

        // 加载问题列表
        this.loadQuestions();

        // 开始定期检查会话状态（检测课程结束）
        this.startSessionCheck();

        console.log('课程已开始，强制检测模式已启用');
    },

    // 获取会话ID（带重试机制）
    async fetchSessionId(courseId, maxRetries = 5) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                console.log(`尝试获取会话ID (${i + 1}/${maxRetries})...`);
                const response = await fetch(`/student/course/${courseId}/session_status`, {
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.code === 200 && data.data.session_id) {
                    this.currentSessionId = data.data.session_id;
                    console.log('获取到会话ID:', this.currentSessionId);
                    return true;
                } else {
                    console.warn(`未获取到会话ID，响应:`, data);
                }
            } catch (error) {
                console.error('获取会话ID失败:', error);
            }
            
            // 等待1秒后重试
            if (i < maxRetries - 1) {
                console.log('等待1秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.error(`获取会话ID失败，已重试${maxRetries}次`);
        return false;
    },

    // 加载问题列表
    loadQuestions() {
        console.log('加载问题列表...');
        const questionsContainer = document.getElementById('detectionQuestionsList');
        if (!questionsContainer) {
            console.log('问题列表容器不存在，跳过加载');
            return;
        }

        // 显示加载状态
        questionsContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #6c757d;">
                <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px;"></i>
                <p style="font-size: 14px;">加载问题中...</p>
            </div>
        `;

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
                this.renderQuestions(data.data, questionsContainer);
            } else {
                console.error('获取问题失败:', data.msg);
                this.renderNoQuestions(questionsContainer);
            }
        })
        .catch(error => {
            console.error('获取问题失败:', error);
            this.renderNoQuestions(questionsContainer);
        });
    },

    // 渲染问题列表
    renderQuestions(questions, container) {
        if (!questions || questions.length === 0) {
            this.renderNoQuestions(container);
            return;
        }

        container.innerHTML = questions.map(question => `
            <div style="background: #f8f9fa; border-radius: 8px; padding: 12px; margin-bottom: 10px; border-left: 4px solid #007bff;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <h5 style="margin: 0; color: #333; font-size: 14px; font-weight: 600;">${question.title}</h5>
                    <span style="background: #e3f2fd; color: #0277bd; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${this.getQuestionTypeText(question.question_type)}</span>
                </div>
                <p style="margin: 0 0 8px 0; color: #666; font-size: 13px; line-height: 1.4;">${question.content}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #999;">
                        <i class="fas fa-clock"></i> ${question.time_limit}秒 | <i class="fas fa-star"></i> ${question.score}分
                    </span>
                    <button onclick="questionsModule.openAnswerModal(${question.id}, ${JSON.stringify(question).replace(/"/g, '&quot;')})" 
                            style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                        ${question.has_answered ? '查看答案' : '立即作答'}
                    </button>
                </div>
            </div>
        `).join('');
    },

    // 渲染无问题状态
    renderNoQuestions(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: #6c757d; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 8px; color: #adb5bd;"></i>
                <p style="font-size: 14px; margin: 0;">暂无活跃问题</p>
                <p style="font-size: 12px; margin-top: 4px; color: #adb5bd;">老师还没有发布问题</p>
            </div>
        `;
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

    // 清空问题列表
    clearQuestions() {
        console.log('清空问题列表');
        const questionsContainer = document.getElementById('detectionQuestionsList');
        if (questionsContainer) {
            questionsContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #6c757d; background: #f8f9fa; border-radius: 8px; border: 2px dashed #dee2e6;">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 8px; color: #adb5bd;"></i>
                    <p style="font-size: 14px; margin: 0;">暂无活跃问题</p>
                    <p style="font-size: 12px; margin-top: 4px; color: #adb5bd;">等待课程开始...</p>
                </div>
            `;
        }
    },
    
    // 显示课程开始提示
    showSessionStartedNotice() {
        let noticeEl = document.getElementById('sessionStartedNotice');
        if (!noticeEl) {
            noticeEl = document.createElement('div');
            noticeEl.id = 'sessionStartedNotice';
            noticeEl.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #007bff, #0056b3);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            noticeEl.innerHTML = `
                <i class="fas fa-play-circle" style="font-size: 18px;"></i>
                <span>课程已开始，检测功能已自动开启</span>
            `;
            document.body.appendChild(noticeEl);
        }
        noticeEl.style.display = 'flex';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (noticeEl) {
                noticeEl.style.display = 'none';
            }
        }, 3000);
    },
    
    // 禁用强制检测模式
    async disableForcedDetection() {
        console.log('课程结束，开始保存检测数据...');

        try {
            // 先关闭视频和音频检测（使用forceStop=true强制停止）
            await this.stopVideoDetectionAsync(true);
            await this.stopAudioRecognitionAsync(true);

            console.log('检测数据保存完成');

            // 等待所有语音识别请求完成
            await this.waitForPendingRequests();

            // 所有请求完成后，更新课程记录
            await this.updateCourseSessionRecord();

        } catch (error) {
            console.error('保存检测数据时出错:', error);
        }

        // 然后禁用强制模式
        this.forcedDetectionMode = false;
        this.hideForcedDetectionNotice();

        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
        }

        // 清空问题列表
        this.clearQuestions();
        
        // 同时清空questions模块中的问题列表
        if (typeof questionsModule !== 'undefined' && questionsModule.clearQuestions) {
            questionsModule.clearQuestions();
        }

        // 显示课程结束提示
        this.showSessionEndedNotice();

        // 重新启动课程状态检查（以便检测下一次课程开始）
        this.startCourseStatusCheck();

        console.log('课程已结束，检测功能已自动关闭');
    },
    
    // 等待所有待处理的语音识别请求完成
    async waitForPendingRequests() {
        console.log(`等待 ${this.pendingRequests} 个语音识别请求完成...`);
        
        const maxWaitTime = 30000; // 最大等待30秒
        const startTime = Date.now();
        
        while (this.pendingRequests > 0) {
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('等待语音识别请求超时，继续执行');
                break;
            }
            
            console.log(`还有 ${this.pendingRequests} 个请求未完成，继续等待...`);
            await new Promise(resolve => setTimeout(resolve, 500)); // 每500ms检查一次
        }
        
        console.log('所有语音识别请求已完成');
    },
    
    // 更新课程记录
    async updateCourseSessionRecord() {
        if (!this.currentCourseId) {
            console.log('没有当前课程ID，跳过更新课程记录');
            return;
        }
        
        console.log('正在更新课程记录...');
        console.log(`本节课累计提问次数: ${this.recordCount}, 课程ID: ${this.currentCourseId}`);
        
        try {
            const response = await fetch(`/student/course/${this.currentCourseId}/update_session_record`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    question_count: this.questionCount  // 传递本节课累计提问次数（只统计is_question=true的）
                })
            });
            
            console.log('API响应状态:', response.status);
            
            if (!response.ok) {
                console.error('API响应错误:', response.status, response.statusText);
                return;
            }
            
            const data = await response.json();
            
            if (data.code === 200) {
                console.log('课程记录更新成功:', data.data);
            } else {
                console.error('课程记录更新失败:', data.msg);
            }
        } catch (error) {
            console.error('更新课程记录时出错:', error);
        }
    },
    
    // 显示课程结束提示
    showSessionEndedNotice() {
        let noticeEl = document.getElementById('sessionEndedNotice');
        if (!noticeEl) {
            noticeEl = document.createElement('div');
            noticeEl.id = 'sessionEndedNotice';
            noticeEl.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            noticeEl.innerHTML = `
                <i class="fas fa-check-circle" style="font-size: 18px;"></i>
                <span>课程已结束，检测数据已保存到课程记录</span>
            `;
            document.body.appendChild(noticeEl);
        }
        noticeEl.style.display = 'flex';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (noticeEl) {
                noticeEl.style.display = 'none';
            }
        }, 3000);
    },
    
    // 显示强制检测提示
    showForcedDetectionNotice() {
        let noticeEl = document.getElementById('forcedDetectionNotice');
        if (!noticeEl) {
            noticeEl = document.createElement('div');
            noticeEl.id = 'forcedDetectionNotice';
            noticeEl.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #dc3545, #c82333);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            noticeEl.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 18px;"></i>
                <span>课程正在进行中，检测功能已自动开启，无法关闭</span>
            `;
            document.body.appendChild(noticeEl);
        }
        noticeEl.style.display = 'flex';
    },
    
    // 隐藏强制检测提示
    hideForcedDetectionNotice() {
        const noticeEl = document.getElementById('forcedDetectionNotice');
        if (noticeEl) {
            noticeEl.style.display = 'none';
        }
    },
    
    // 开始定期检查会话状态
    startSessionCheck() {
        this.sessionCheckInterval = setInterval(async () => {
            if (!this.currentCourseId) return;
            
            try {
                const response = await fetch(`/student/course/${this.currentCourseId}/session_status`, {
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (data.code === 200) {
                    // 保存当前会话ID
                    if (data.data.session_id) {
                        this.currentSessionId = data.data.session_id;
                    }
                    if (!data.data.is_in_session) {
                        console.log('检测到课程已结束，准备保存数据...');
                        // 课程已结束，禁用强制检测模式
                        await this.disableForcedDetection();
                    }
                }
            } catch (error) {
                console.error('检查会话状态失败:', error);
            }
        }, 5000); // 每5秒检查一次
    },
    
    // 绑定事件
    bindEvents() {
        if (this.startVideoBtn) {
            this.startVideoBtn.addEventListener('click', () => this.startVideoDetection());
        }
        
        if (this.stopVideoBtn) {
            this.stopVideoBtn.addEventListener('click', () => this.stopVideoDetection());
        }
        
        if (this.startAudioBtn) {
            this.startAudioBtn.addEventListener('click', () => this.startAudioRecognition());
        }
        
        if (this.stopAudioBtn) {
            this.stopAudioBtn.addEventListener('click', () => this.stopAudioRecognition());
        }
    },
    
    // 启动视频检测
    startVideoDetection() {
        console.log('开始启动视频检测');
        
        // 动态获取元素
        const videoElement = document.getElementById('videoElement');
        const videoPlaceholder = document.getElementById('videoPlaceholder');
        const videoStatus = document.getElementById('videoStatus');
        const startVideoBtn = document.getElementById('startVideoBtn');
        const stopVideoBtn = document.getElementById('stopVideoBtn');
        
        // 显示视频元素，隐藏占位符
        if (videoElement && videoPlaceholder) {
            console.log('显示视频元素，隐藏占位符');
            videoElement.style.display = 'block';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoPlaceholder.style.display = 'none';
        }
        
        // 更新状态
        if (videoStatus) {
            console.log('更新视频状态为检测中');
            videoStatus.textContent = '检测中';
            videoStatus.style.background = '#ffc107';
        }
        
        // 禁用启动按钮，启用停止按钮
        if (startVideoBtn && stopVideoBtn) {
            console.log('禁用启动按钮，启用停止按钮');
            startVideoBtn.disabled = true;
            startVideoBtn.style.background = '#6c757d';
            startVideoBtn.style.cursor = 'not-allowed';
            stopVideoBtn.disabled = false;
            stopVideoBtn.style.background = '#dc3545';
            stopVideoBtn.style.cursor = 'pointer';
        }
        
        // 请求摄像头权限
        console.log('请求摄像头权限');
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            } 
        })
            .then(stream => {
                console.log('成功获取摄像头流');
                this.videoStream = stream;
                if (videoElement) {
                    console.log('设置视频元素的srcObject');
                    videoElement.srcObject = stream;
                    
                    // 等待视频元数据加载完成
                    videoElement.onloadedmetadata = () => {
                        console.log('视频元数据加载完成');
                        
                        // 播放视频
                        const playPromise = videoElement.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                console.log('视频播放成功');
                                console.log('视频尺寸:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                                // 启动视频检测API
                                this.startVideoDetectionAPI();
                            }).catch(error => {
                                console.error('视频播放失败:', error);
                                // 尝试再次播放
                                setTimeout(() => {
                                    videoElement.play().catch(e => console.error('重试播放失败:', e));
                                }, 100);
                            });
                        }
                    };
                    
                    // 如果元数据已经加载，直接播放
                    if (videoElement.readyState >= 2) {
                        console.log('视频元数据已加载，直接播放');
                        videoElement.onloadedmetadata();
                    }
                } else {
                    console.error('视频元素不存在');
                    this.stopVideoDetection();
                }
            })
            .catch(error => {
                console.error('摄像头访问失败:', error);
                if (videoStatus) {
                    videoStatus.textContent = '摄像头访问失败';
                    videoStatus.style.background = '#dc3545';
                }
                if (startVideoBtn && stopVideoBtn) {
                    startVideoBtn.disabled = false;
                    startVideoBtn.style.background = 'var(--primary-color)';
                    startVideoBtn.style.cursor = 'pointer';
                    stopVideoBtn.disabled = true;
                    stopVideoBtn.style.background = '#6c757d';
                    stopVideoBtn.style.cursor = 'not-allowed';
                }
                if (videoElement && videoPlaceholder) {
                    videoElement.style.display = 'none';
                    videoPlaceholder.style.display = 'flex';
                }
            });
    },
    
    // 启动视频检测API
    startVideoDetectionAPI() {
        console.log('调用视频检测启动API');
        try {
            // 调用后端API启动检测
            fetch('/student/video/start_detection', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                console.log('API响应状态:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('API响应数据:', data);
                if (data.code === 200) {
                    console.log('视频检测启动成功');
                    // 开始发送视频帧进行检测
                    console.log('开始发送视频帧');
                    this.sendVideoFrames();
                } else {
                    console.error('视频检测启动失败:', data.msg);
                    // 显示错误信息
                    const videoStatus = document.getElementById('videoStatus');
                    if (videoStatus) {
                        videoStatus.textContent = '启动失败';
                        videoStatus.style.background = '#dc3545';
                    }
                    this.stopVideoDetection();
                }
            })
            .catch(error => {
                console.error('视频检测启动失败:', error);
                // 显示错误信息
                const videoStatus = document.getElementById('videoStatus');
                if (videoStatus) {
                    videoStatus.textContent = '网络错误';
                    videoStatus.style.background = '#dc3545';
                }
                this.stopVideoDetection();
            });
        } catch (error) {
            console.error('startVideoDetectionAPI错误:', error);
                // 显示错误信息
            const videoStatus = document.getElementById('videoStatus');
            if (videoStatus) {
                videoStatus.textContent = '系统错误';
                videoStatus.style.background = '#dc3545';
            }
            this.stopVideoDetection();
        }
    },
    
    // 发送视频帧进行检测
    sendVideoFrames() {
        console.log('开始发送视频帧进行检测');
        const videoElement = document.getElementById('videoElement');
        if (!videoElement) {
            console.error('视频元素不存在');
            return;
        }
        
        console.log('设置视频帧检测间隔');
        this.detectionInterval = setInterval(() => {
            console.log('捕获视频帧');
            // 捕获视频帧
            const canvas = document.createElement('canvas');
            // 使用固定尺寸
            canvas.width = 640;
            canvas.height = 480;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // 将帧转换为Base64
            const frameData = canvas.toDataURL('image/jpeg', 0.7);
            
            // 发送帧到后端
            fetch('/student/video/detect_frame', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    frame: frameData,
                    timestamp: Date.now()
                })
            })
            .then(response => {
                return response.json();
            })
            .then(data => {
                if (data.code === 200) {
                    // 更新统计数据
                    this.updateVideoStats(data.data);
                } else {
                    console.error('帧检测API失败:', data.msg);
                    const videoStatus = document.getElementById('videoStatus');
                    if (videoStatus) {
                        videoStatus.textContent = '检测失败';
                        videoStatus.style.background = '#dc3545';
                    }
                }
            })
            .catch(error => {
                console.error('视频帧检测失败:', error);
                const videoStatus = document.getElementById('videoStatus');
                if (videoStatus) {
                    videoStatus.textContent = '网络错误';
                    videoStatus.style.background = '#dc3545';
                    }
            });
        }, 1000); // 每秒发送一帧
    },
    
    // 更新视频检测统计数据
    updateVideoStats(data) {
        if (data) {
            this.headUpCount = data.head_up_count || 0;
            this.headDownCount = data.head_down_count || 0;
            this.headUpRate = data.head_up_rate || 0;
            
            // 更新UI - 支持多种元素ID
            const headUpCountEl = document.getElementById('headUpCount') || document.getElementById('head_up_count');
            const headDownCountEl = document.getElementById('headDownCount') || document.getElementById('head_down_count');
            const headUpRateEl = document.getElementById('headUpRate') || document.getElementById('head_up_rate');
            
            if (headUpCountEl) headUpCountEl.textContent = this.headUpCount;
            if (headDownCountEl) headDownCountEl.textContent = this.headDownCount;
            if (headUpRateEl) headUpRateEl.textContent = Math.round(this.headUpRate * 100) + '%';
        }
    },
    
    // 停止视频检测
    stopVideoDetection(forceStop = false) {
        // 如果是强制检测模式且不是强制停止，阻止停止
        if (this.forcedDetectionMode && !forceStop) {
            alert('课程正在进行中，无法停止检测功能');
            return;
        }
        
        this.stopVideoDetectionAsync(forceStop);
    },
    
    // 异步停止视频检测（返回Promise）
    async stopVideoDetectionAsync(forceStop = false) {
        // 如果是强制检测模式且不是强制停止，阻止停止
        if (this.forcedDetectionMode && !forceStop) {
            alert('课程正在进行中，无法停止检测功能');
            return;
        }
        
        console.log('停止视频检测，当前计数:', {
            headUp: this.headUpCount,
            headDown: this.headDownCount,
            rate: this.headUpRate
        });
        
        // 清除检测间隔
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }
        
        // 停止视频流
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
        
        // 动态获取元素
        const videoElement = document.getElementById('videoElement');
        const videoPlaceholder = document.getElementById('videoPlaceholder');
        const videoStatus = document.getElementById('videoStatus');
        const startVideoBtn = document.getElementById('startVideoBtn');
        const stopVideoBtn = document.getElementById('stopVideoBtn');
        
        // 重置UI
        if (videoElement) {
            videoElement.style.display = 'none';
        }
        if (videoPlaceholder) {
            videoPlaceholder.style.display = 'flex';
        }
        
        if (videoStatus) {
            videoStatus.textContent = '未检测';
            videoStatus.style.background = '#28a745';
        }
        
        if (startVideoBtn && stopVideoBtn) {
            startVideoBtn.disabled = false;
            startVideoBtn.style.background = 'var(--primary-color)';
            startVideoBtn.style.cursor = 'pointer';
            stopVideoBtn.disabled = true;
            stopVideoBtn.style.background = '#6c757d';
            stopVideoBtn.style.cursor = 'not-allowed';
        }
        
        // 调用后端API停止检测
        try {
            const response = await fetch('/student/video/end_detection', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    head_up_count: this.headUpCount,
                    head_down_count: this.headDownCount,
                    head_up_rate: this.headUpRate,
                    session_id: this.currentSessionId || ''
                })
            });
            
            const data = await response.json();
            
            if (data.code === 200) {
                console.log('视频检测数据保存成功:', data.data);
            } else {
                console.error('视频检测数据保存失败:', data.msg);
            }
            
            return data;
        } catch (error) {
            console.error('视频检测停止失败:', error);
            throw error;
        }
    },
    
    // 音频识别相关变量
    mediaRecorder: null,
    audioChunks: [],
    audioStream: null,
    isRecording: false,
    recordCount: 0,
    recordingTimer: null,
    RECORD_DURATION: 30000,
    questionCount: 0,
    
    // 启动音频识别
    async startAudioRecognition() {
        const audioStatus = document.getElementById('audioStatus');
        const startAudioBtn = document.getElementById('startAudioBtn');
        const stopAudioBtn = document.getElementById('stopAudioBtn');
        const audioResult = document.getElementById('audioResult');
        const questionCountEl = document.getElementById('questionCount');
        
        // 确保已获取课程ID
        if (!this.currentCourseId) {
            // 尝试从 coursesModule 获取当前课程ID
            if (typeof coursesModule !== 'undefined' && coursesModule.currentCourseId) {
                this.currentCourseId = coursesModule.currentCourseId;
                console.log('从 coursesModule 获取到课程ID:', this.currentCourseId);
            }
        }
        
        // 确保已获取会话ID
        if (!this.currentSessionId && this.currentCourseId) {
            console.log('启动音频检测前未获取到会话ID，尝试获取...');
            await this.fetchSessionId(this.currentCourseId);
        }
        
        if (!this.currentSessionId) {
            console.warn('警告: 仍未获取到会话ID，音频记录可能无法正确关联');
            console.warn('当前课程ID:', this.currentCourseId);
        } else {
            console.log('音频检测使用会话ID:', this.currentSessionId);
        }
        
        if (audioStatus) {
            audioStatus.textContent = '请求麦克风...';
            audioStatus.style.background = '#ffc107';
        }
        
        if (audioResult) {
            audioResult.innerHTML = '<div style="color: #999; text-align: center; padding: 20px;">正在请求麦克风权限...</div>';
        }
        
        this.recordCount = 0;
        this.questionCount = 0;
        if (questionCountEl) {
            questionCountEl.textContent = '0';
        }
        this.audioChunks = [];
        
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                console.log('成功获取麦克风权限');
                this.audioStream = stream;
                this.isRecording = true;
                
                let mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/mp4';
                    }
                }
                
                this.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
                console.log('使用音频格式:', mimeType);
                
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };
                
                this.mediaRecorder.onstop = () => {
                    if (this.audioChunks.length > 0) {
                        this.sendAudioForRecognition();
                    }
                    if (this.isRecording) {
                        this.startNewRecording();
                    }
                };
                
                if (audioStatus) {
                    audioStatus.textContent = '录音中';
                    audioStatus.style.background = '#28a745';
                }
                
                if (audioResult) {
                    audioResult.textContent = '正在录音，请说话...';
                }
                
                if (startAudioBtn && stopAudioBtn) {
                    startAudioBtn.disabled = true;
                    startAudioBtn.style.background = '#6c757d';
                    stopAudioBtn.disabled = false;
                    stopAudioBtn.style.background = '#dc3545';
                }
                
                this.startNewRecording();
            })
            .catch(error => {
                console.error('麦克风访问失败:', error);
                if (audioStatus) {
                    audioStatus.textContent = '麦克风访问失败';
                    audioStatus.style.background = '#dc3545';
                }
                if (audioResult) {
                    audioResult.textContent = '无法访问麦克风，请检查权限设置';
                }
                if (startAudioBtn) {
                    startAudioBtn.disabled = false;
                    startAudioBtn.style.background = 'var(--primary-color)';
                }
            });
    },
    
    // 开始新的录音段
    startNewRecording() {
        this.audioChunks = [];
        this.recordCount++;
        
        console.log(`开始第 ${this.recordCount} 段录音`);
        
        const audioStatus = document.getElementById('audioStatus');
        if (audioStatus) {
            audioStatus.textContent = `录音中 (${this.recordCount})`;
        }
        
        this.mediaRecorder.start();
        
        this.recordingTimer = setTimeout(() => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                console.log(`第 ${this.recordCount} 段录音时间到，停止并发送`);
                this.mediaRecorder.stop();
            }
        }, this.RECORD_DURATION);
    },
    
    // 发送音频进行识别
    sendAudioForRecognition() {
        const chunksToSend = [...this.audioChunks];
        this.audioChunks = [];
        
        const totalSize = chunksToSend.reduce((sum, chunk) => sum + chunk.size, 0);
        if (totalSize < 2000) {
            console.log('音频数据太小，跳过识别:', totalSize);
            return;
        }
        
        const audioBlob = new Blob(chunksToSend, { type: 'audio/webm' });
        console.log(`发送第 ${this.recordCount} 段音频，大小:`, audioBlob.size, '字节');
        
        // 检查 session_id
        console.log('当前 session_id:', this.currentSessionId);
        console.log('当前 course_id:', this.currentCourseId);
        
        const sequenceNum = String(this.recordCount).padStart(2, '0');
        const formData = new FormData();
        formData.append('audio', audioBlob, `recording_${sequenceNum}.webm`);
        formData.append('sequence', sequenceNum);
        formData.append('session_id', this.currentSessionId || '');  // 添加会话ID
        
        const audioResult = document.getElementById('audioResult');
        if (audioResult) {
            audioResult.innerHTML += `<div class="recognition-item" style="padding: 8px 0; border-bottom: 1px solid #eee;">
                <span style="color: #666; font-size: 12px;">[第${this.recordCount}段]</span>
                <span style="color: #999; font-size: 12px;">识别中...</span>
            </div>`;
            audioResult.scrollTop = audioResult.scrollHeight;
        }
        
        const currentRecordCount = this.recordCount;
        
        // 增加待处理请求计数
        this.pendingRequests++;
        console.log(`开始语音识别请求，当前待处理请求: ${this.pendingRequests}`);
        
        fetch('/student/audio/recognize', {
            method: 'POST',
            credentials: 'include',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // 减少待处理请求计数
            this.pendingRequests--;
            console.log(`语音识别请求完成，剩余待处理请求: ${this.pendingRequests}`);
            
            if (data.code === 200 && data.data) {
                console.log(`第 ${currentRecordCount} 段识别结果:`, data.data);
                
                const text = data.data.text || '';
                if (audioResult && text.trim()) {
                    const items = audioResult.querySelectorAll('.recognition-item');
                    const lastItem = items[items.length - 1];
                    if (lastItem) {
                        const timeStr = new Date().toLocaleTimeString();
                        const isQ = data.data.is_question;
                        lastItem.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <span style="color: #007bff; font-weight: 500;">[第${currentRecordCount}段] ${timeStr}</span>
                                <span class="question-tag ${isQ ? 'tag-yes' : 'tag-no'}" style="font-size: 11px;">${isQ ? '提问' : '陈述'}</span>
                            </div>
                            <div style="color: #333; line-height: 1.5;">${text}</div>
                        `;
                        audioResult.scrollTop = audioResult.scrollHeight;
                        
                        if (isQ) {
                            this.questionCount++;
                            const questionCountEl = document.getElementById('questionCount');
                            if (questionCountEl) {
                                questionCountEl.textContent = this.questionCount;
                            }
                        }
                    }
                }
            } else {
                console.error('识别失败:', data.msg);
                const items = audioResult.querySelectorAll('.recognition-item');
                const lastItem = items[items.length - 1];
                if (lastItem) {
                    lastItem.innerHTML = `<span style="color: #dc3545;">[第${currentRecordCount}段] 识别失败: ${data.msg}</span>`;
                }
            }
        })
        .catch(error => {
            // 减少待处理请求计数
            this.pendingRequests--;
            console.log(`语音识别请求失败，剩余待处理请求: ${this.pendingRequests}`);
            
            console.error('发送音频失败:', error);
            const items = audioResult.querySelectorAll('.recognition-item');
            const lastItem = items[items.length - 1];
            if (lastItem) {
                lastItem.innerHTML = `<span style="color: #dc3545;">[第${currentRecordCount}段] 发送失败</span>`;
            }
        });
    },
    
    // 停止音频识别
    stopAudioRecognition(forceStop = false) {
        // 如果是强制检测模式且不是强制停止，阻止停止
        if (this.forcedDetectionMode && !forceStop) {
            alert('课程正在进行中，无法停止检测功能');
            return;
        }
        
        this.stopAudioRecognitionAsync(forceStop);
    },
    
    // 异步停止音频识别（返回Promise）
    async stopAudioRecognitionAsync(forceStop = false) {
        // 如果是强制检测模式且不是强制停止，阻止停止
        if (this.forcedDetectionMode && !forceStop) {
            alert('课程正在进行中，无法停止检测功能');
            return;
        }
        
        console.log('停止音频识别，共录制段数:', this.recordCount);
        
        this.isRecording = false;
        
        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // 等待最后一段录音完成并发送
        const waitForLastRecording = new Promise((resolve) => {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                console.log('等待最后一段录音完成...');
                const originalOnStop = this.mediaRecorder.onstop;
                this.mediaRecorder.onstop = () => {
                    if (originalOnStop) originalOnStop();
                    console.log('最后一段录音已完成');
                    // 再等待一段时间确保请求已发送
                    setTimeout(resolve, 1000);
                };
                this.mediaRecorder.stop();
            } else {
                resolve();
            }
        });
        
        await waitForLastRecording;
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        const audioStatus = document.getElementById('audioStatus');
        const startAudioBtn = document.getElementById('startAudioBtn');
        const stopAudioBtn = document.getElementById('stopAudioBtn');
        
        if (audioStatus) {
            audioStatus.textContent = '已停止';
            audioStatus.style.background = '#6c757d';
        }
        
        if (startAudioBtn && stopAudioBtn) {
            startAudioBtn.disabled = false;
            startAudioBtn.style.background = 'var(--primary-color)';
            stopAudioBtn.disabled = true;
            stopAudioBtn.style.background = '#6c757d';
        }
        
        console.log('音频识别已停止，共录制', this.recordCount, '段');
        
        // 等待所有待处理的语音识别请求完成
        console.log(`等待 ${this.pendingRequests} 个语音识别请求完成...`);
        const maxWaitTime = 10000; // 最大等待10秒
        const startTime = Date.now();
        
        while (this.pendingRequests > 0) {
            if (Date.now() - startTime > maxWaitTime) {
                console.warn('等待语音识别请求超时');
                break;
            }
            console.log(`还有 ${this.pendingRequests} 个请求未完成，继续等待...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('所有语音识别请求已完成');
        return { code: 200, msg: '音频识别已停止' };
    }
};

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = detectionModule;
} else {
    window.detectionModule = detectionModule;
}
