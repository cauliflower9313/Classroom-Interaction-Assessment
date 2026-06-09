// 学生端主模块
const studentSystem = {
    // 初始化学生系统
    init() {
        this.initModules();
    },
    
    
    // 初始化各个模块
    initModules() {
        // 初始化课程模块
        if (typeof coursesModule !== 'undefined') {
            coursesModule.loadCourses();
        }
        
        // 初始化检测模块
        if (typeof detectionModule !== 'undefined') {
            detectionModule.init();
        }
        
        // 初始化问题模块
        if (typeof questionsModule !== 'undefined') {
            questionsModule.init();
        }
        
        // 初始化记录模块
        if (typeof recordsModule !== 'undefined') {
            recordsModule.init();
        }
    },
    
    // 初始化指定模块
    initModule(tabName) {
        switch (tabName) {
            case 'courses':
                if (typeof coursesModule !== 'undefined') {
                    coursesModule.loadCourses();
                }
                break;
            case 'dashboard':
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
                break;
            case 'evaluation':
                if (typeof loadEvaluationData === 'function') {
                    loadEvaluationData();
                }
                break;
        }
    },
    
    // 退出登录
    logout() {
        fetch('/student/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                window.location.href = '/student/login';
            } else {
                alert('退出失败: ' + data.msg);
            }
        })
        .catch(error => {
            console.error('退出失败:', error);
            alert('退出失败，请稍后重试');
        });
    },
    
    // 加载活跃问题
    loadActiveQuestions() {
        if (typeof questionsModule !== 'undefined') {
            questionsModule.loadActiveQuestions();
        }
    },
    
    // 提交答案
    submitAnswer() {
        if (typeof questionsModule !== 'undefined') {
            questionsModule.submitAnswer();
        }
    }
};

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', function() {
    studentSystem.init();
});
