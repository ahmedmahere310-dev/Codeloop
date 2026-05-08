/**
 * CodeLoop V2 - Enhanced Editor Features
 * تحسينات المحرر المتقدمة
 * 
 * Features:
 * - Direct file editing in editor
 * - Auto-save improvements
 * - Code templates
 * - Better error handling
 * - Live code preview integration
 */

const editorEnhancements = {
    autoSaveInterval: 3000, // 3 seconds
    lastSaveTime: null,
    isDirty: false,
    templates: {
        html: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>المشروع</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    </style>
</head>
<body>
    <h1>مرحباً بك!</h1>
    <script src="script.js"></script>
</body>
</html>`,
        css: `/* أنماط عام */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: inherit;
    background: #f5f5f5;
    color: #333;
}

h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
}`,
        javascript: `// متغيرات
const myVariable = 'قيمة';

// دالة
function greet(name) {
    console.log('مرحباً ' + name);
}

// استدعاء
greet('مطور');`
    }
};

/**
 * Initialize Enhanced Editor
 */
window.initEditorEnhancements = () => {
    // Auto-save listener
    if (typeof aceEditor !== 'undefined') {
        aceEditor.session.on('change', () => {
            editorEnhancements.isDirty = true;
            startAutoSave();
        });
    }

    console.log('✅ Editor Enhancements Initialized');
};

/**
 * Auto-Save with Improvements
 */
function startAutoSave() {
    if (editorEnhancements.autoSaveTimeout) {
        clearTimeout(editorEnhancements.autoSaveTimeout);
    }

    editorEnhancements.autoSaveTimeout = setTimeout(async () => {
        if (!editorEnhancements.isDirty) return;

        try {
            // Save current file
            if (typeof localStorage !== 'undefined') {
                const code = typeof aceEditor !== 'undefined' ? aceEditor.getValue() : '';
                const draftData = {
                    code,
                    timestamp: Date.now(),
                    filename: typeof activeFileId !== 'undefined' ? activeFileId : 'index.html'
                };
                localStorage.setItem('v2_editor_autosave', JSON.stringify(draftData));
            }

            // Show quick save indicator
            showAutoSaveIndicator();
            editorEnhancements.isDirty = false;
            editorEnhancements.lastSaveTime = Date.now();
        } catch (error) {
            console.log('Auto-save failed:', error);
        }
    }, editorEnhancements.autoSaveInterval);
}

/**
 * Show Auto-Save Indicator
 */
function showAutoSaveIndicator() {
    let indicator = document.getElementById('autosave-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'autosave-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid #10b981;
            color: #10b981;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 700;
            z-index: 100;
            animation: fadeInOut 2s ease-out;
        `;
        document.body.appendChild(indicator);
    }

    indicator.innerHTML = '💾 تم الحفظ التلقائي';
    indicator.style.display = 'block';

    setTimeout(() => {
        indicator.style.display = 'none';
    }, 2000);
}

/**
 * Insert Code Template
 */
window.insertTemplate = (templateType) => {
    if (typeof aceEditor === 'undefined') return;

    const template = editorEnhancements.templates[templateType];
    if (!template) return;

    aceEditor.setValue(template, -1);
    window.sendNotification({
        type: 'info',
        title: '✅ تم إدراج القالب',
        message: `تم إدراج قالب ${templateType} الجديد`,
        icon: 'check-circle',
        color: 'success',
        duration: 2000
    });
};

/**
 * Recover Auto-Save
 */
window.recoverAutoSave = () => {
    try {
        const saved = localStorage.getItem('v2_editor_autosave');
        if (!saved) return false;

        const data = JSON.parse(saved);
        const hoursPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60);

        if (hoursPassed > 24) {
            localStorage.removeItem('v2_editor_autosave');
            return false;
        }

        if (typeof aceEditor !== 'undefined') {
            aceEditor.setValue(data.code, -1);
            window.sendNotification({
                type: 'info',
                title: '✅ تم استرجاع الحفظ',
                message: 'تم استرجاع آخر حفظ تلقائي',
                icon: 'refresh-cw',
                color: 'success',
                duration: 3000
            });
            return true;
        }
    } catch (error) {
        console.log('Error recovering auto-save:', error);
    }
    return false;
};

/**
 * Enhanced Code Preview
 */
window.runLivePreview = async () => {
    try {
        const code = typeof aceEditor !== 'undefined' ? aceEditor.getValue() : '';
        if (!code.trim()) {
            window.sendNotification({
                type: 'error',
                title: '❌ الكود فارغ',
                message: 'اكتب الكود أولاً',
                icon: 'alert-circle',
                color: 'danger'
            });
            return;
        }

        // Run preview
        if (typeof runPreview === 'function') {
            runPreview();
        }
    } catch (error) {
        console.error('Error running preview:', error);
        window.sendNotification({
            type: 'error',
            title: '❌ خطأ',
            message: 'فشل تشغيل المعاينة',
            icon: 'alert-circle',
            color: 'danger'
        });
    }
};

/**
 * Quick Actions in Editor
 */
window.editorQuickActions = {
    clearCode: () => {
        if (confirm('هل أنت متأكد من حذف كل الكود؟')) {
            if (typeof aceEditor !== 'undefined') {
                aceEditor.setValue('', -1);
            }
        }
    },
    
    selectAll: () => {
        if (typeof aceEditor !== 'undefined') {
            aceEditor.selectAll();
        }
    },
    
    formatCode: () => {
        if (typeof prettier !== 'undefined' && typeof aceEditor !== 'undefined') {
            try {
                const code = aceEditor.getValue();
                // Detect language from file extension
                let parser = 'babel';
                if (typeof activeFileName !== 'undefined') {
                    if (activeFileName.endsWith('.html')) parser = 'html';
                    if (activeFileName.endsWith('.css')) parser = 'css';
                }
                
                const formatted = prettier.format(code, {
                    parser: parser,
                    plugins: [prettierPlugins.babel, prettierPlugins.html, prettierPlugins.postcss]
                });
                
                aceEditor.setValue(formatted, -1);
                window.sendNotification({
                    type: 'success',
                    title: '✅ تم التنسيق',
                    message: 'تم تنسيق الكود بنجاح',
                    icon: 'check-circle',
                    color: 'success',
                    duration: 2000
                });
            } catch (error) {
                console.error('Format error:', error);
            }
        }
    }
};

// Export enhancements
window.editorEnhancements = editorEnhancements;

console.log('✅ Editor Enhancements Loaded');
