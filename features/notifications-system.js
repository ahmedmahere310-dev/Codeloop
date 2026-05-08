/**
 * CodeLoop V2 - Advanced Notifications System
 * نظام الإشعارات المتقدم
 * 
 * Features:
 * - Real-time notifications
 * - Auto-mention on republish
 * - Sound alerts + toasts + system notifications
 * - Notification history
 * - Smart mention dropdown
 */

// Global notification state
const notificationSystem = {
    queue: [],
    history: [],
    isPlaying: false,
    mentionCache: {},
    settings: {
        soundEnabled: true,
        toastEnabled: true,
        systemNotifEnabled: localStorage.getItem('cl_notifications_enabled') === 'true'
    }
};

/**
 * Initialize Advanced Notifications System
 * يتم استدعاءه مرة واحدة عند بدء التطبيق
 */
window.initAdvancedNotifications = () => {
    // Load notification settings from localStorage
    const savedSettings = localStorage.getItem('v2_notif_settings');
    if (savedSettings) {
        Object.assign(notificationSystem.settings, JSON.parse(savedSettings));
    }
    
    // Load notification history
    const savedHistory = localStorage.getItem('v2_notif_history');
    if (savedHistory) {
        try {
            notificationSystem.history = JSON.parse(savedHistory).slice(-50); // Keep last 50
        } catch (e) {
            console.log('Failed to load notification history');
        }
    }
    
    console.log('✅ Advanced Notifications System Initialized');
};

/**
 * Send Notification - الدالة الرئيسية للإشعارات
 * @param {Object} config
 * @param {string} config.type - 'mention', 'message', 'like', 'comment', 'republish', etc.
 * @param {string} config.title - عنوان الإشعار
 * @param {string} config.message - نص الإشعار
 * @param {string} config.icon - اسم الأيقونة (lucide)
 * @param {string} config.color - اللون (primary, success, danger, warning)
 * @param {Function} config.action - دالة عند النقر
 * @param {number} config.duration - المدة بالـ milliseconds (default: 4000)
 */
window.sendNotification = async (config) => {
    const {
        type = 'info',
        title = 'إشعار',
        message = '',
        icon = 'bell',
        color = 'primary',
        action = null,
        duration = 4000
    } = config;

    const notification = {
        id: Date.now(),
        type,
        title,
        message,
        icon,
        color,
        action,
        timestamp: new Date().toISOString(),
        read: false
    };

    // Add to history
    notificationSystem.history.push(notification);
    if (notificationSystem.history.length > 50) {
        notificationSystem.history.shift();
    }
    localStorage.setItem('v2_notif_history', JSON.stringify(notificationSystem.history));

    // Play sound if enabled
    if (notificationSystem.settings.soundEnabled) {
        await playNotificationSound();
    }

    // Show toast if enabled
    if (notificationSystem.settings.toastEnabled) {
        showAdvancedToast({
            title,
            message,
            icon,
            color,
            action,
            duration,
            notifId: notification.id
        });
    }

    // Show system notification if enabled
    if (notificationSystem.settings.systemNotifEnabled && Notification.permission === 'granted') {
        triggerSystemNotification(title, message, action);
    }

    return notification;
};

/**
 * Auto-Mention on Republish
 * عند إعادة نشر مشروع، يتم المنشن التلقائي لصاحب الأصل
 * @param {Object} originalPost - المشروع الأصلي
 * @param {Object} newPost - المشروع الجديد
 */
window.autoMentionOnRepublish = async (originalPost, newPost) => {
    if (!originalPost || !originalPost.authorId) return;

    const myId = localStorage.getItem('cl_user_id');
    const authorId = originalPost.authorId;

    // Don't mention yourself
    if (myId === authorId) return;

    try {
        const myName = localStorage.getItem('cl_username') || 'مطور';
        
        // Create mention notification
        await sendNotification({
            type: 'republish',
            title: `📢 ${myName} أعاد نشر مشروعك!`,
            message: `تم إعادة نشر "${originalPost.title}" بعنوان جديد`,
            icon: 'repeat-2',
            color: 'primary',
            action: () => window.openUserProfile(myId)
        });

        // Add to original author's notifications in Firebase
        const notifRef = ref(rdb, `${DB_ROOT}/users/${authorId}/notifications`);
        await push(notifRef, {
            type: 'republish',
            fromUserId: myId,
            fromUserName: myName,
            originalPostId: originalPost.id,
            newPostId: newPost.id,
            originalTitle: originalPost.title,
            newTitle: newPost.title,
            timestamp: Date.now(),
            read: false
        });

        console.log('✅ Auto-mention sent on republish');
    } catch (error) {
        console.error('Error in auto-mention:', error);
    }
};

/**
 * Mention Detection & Smart Suggestions
 * كشف المنشن وتقديم اقتراحات ذكية
 */
window.getSmartMentionSuggestions = (searchTerm) => {
    if (!searchTerm || searchTerm.length === 0) {
        // Return recent mentionees
        return Object.values(usersData)
            .sort((a, b) => (b.lastMentioned || 0) - (a.lastMentioned || 0))
            .slice(0, 5);
    }

    const term = searchTerm.toLowerCase();
    return Object.values(usersData)
        .filter(u => (u.name || '').toLowerCase().includes(term))
        .sort((a, b) => {
            // Priority: exact match > starts with > contains
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            
            if (aName === term) return -1;
            if (bName === term) return 1;
            if (aName.startsWith(term)) return -1;
            if (bName.startsWith(term)) return 1;
            return 0;
        })
        .slice(0, 5);
};

/**
 * Track mention for smart suggestions
 * تتبع المنشن للاقتراحات الذكية
 */
window.trackMention = (userId) => {
    if (usersData[userId]) {
        usersData[userId].lastMentioned = Date.now();
    }
};

/**
 * Show Advanced Toast
 * عرض toast محسّن
 */
function showAdvancedToast(config) {
    const { title, message, icon, color, action, duration, notifId } = config;
    
    // Use existing toast or create new element
    let toastEl = document.getElementById('advanced-toast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'advanced-toast';
        toastEl.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 12px 20px;
            min-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            font-family: 'Cairo', sans-serif;
            cursor: pointer;
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(toastEl);
    }

    const colorMap = {
        primary: '#2563eb',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b'
    };

    toastEl.innerHTML = `
        <div style="width: 4px; height: 40px; background: ${colorMap[color] || colorMap.primary}; border-radius: 2px;"></div>
        <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 14px; color: #fff; margin-bottom: 2px;">${title}</div>
            <div style="font-size: 12px; color: #aaa;">${message}</div>
        </div>
        ${action ? `<div style="cursor: pointer; color: ${colorMap[color] || colorMap.primary}; font-size: 12px; font-weight: 700; text-transform: uppercase;">اقتح</div>` : ''}
    `;

    if (action) {
        toastEl.onclick = () => {
            action();
            toastEl.style.display = 'none';
        };
    }

    toastEl.style.display = 'flex';
    setTimeout(() => {
        toastEl.style.display = 'none';
    }, duration);
}

/**
 * Play Notification Sound
 * تشغيل صوت الإشعار
 */
async function playNotificationSound() {
    try {
        if (typeof audioCtx === 'undefined') return;
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const now = audioCtx.currentTime;

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.start();
        osc.stop(now + 0.2);
    } catch (e) {
        console.log('Could not play notification sound');
    }
}

/**
 * Get Notification History
 * الحصول على سجل الإشعارات
 */
window.getNotificationHistory = () => {
    return notificationSystem.history;
};

/**
 * Update Notification Settings
 * تحديث إعدادات الإشعارات
 */
window.updateNotificationSettings = (newSettings) => {
    Object.assign(notificationSystem.settings, newSettings);
    localStorage.setItem('v2_notif_settings', JSON.stringify(notificationSystem.settings));
    
    // Send success notification
    window.sendNotification({
        type: 'info',
        title: '✅ تم تحديث الإعدادات',
        message: 'تم حفظ تفضيلاتك',
        icon: 'check-circle',
        color: 'success'
    });
};

// Export for use
window.notificationSystem = notificationSystem;

console.log('✅ Notifications System Loaded');
