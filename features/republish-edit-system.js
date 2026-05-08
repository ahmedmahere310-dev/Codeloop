/**
 * CodeLoop V2 - Advanced Republish & Edit System
 * نظام إعادة النشر والتعديل المتقدم
 * 
 * Features:
 * - Republish as-is (نسخ مباشرة)
 * - Republish with modifications (نسخ مع تعديل)
 * - Edit original (تعديل الأصل مباشرة في المحرر)
 * - Smart choice modal
 * - Direct editor integration
 */

const republishSystem = {
    currentEditMode: null,
    editingPostId: null,
    originalPost: null
};

/**
 * Show Smart Republish/Edit Modal
 * اختيار ذكي بين إعادة النشر والتعديل
 */
window.showRepublishModal = (postId, post) => {
    // Store original post
    republishSystem.originalPost = post;
    republishSystem.editingPostId = postId;

    const modal = document.createElement('div');
    modal.id = 'republish-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(3, 3, 3, 0.95);
        backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
    `;

    modal.innerHTML = `
        <div style="
            background: #0c0c0c;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 2rem;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2 style="
                    color: #fff;
                    font-size: 1.5rem;
                    font-weight: 900;
                    margin: 0 0 0.5rem 0;
                ">ماذا تريد أن تفعل؟</h2>
                <p style="
                    color: #888;
                    font-size: 0.875rem;
                    margin: 0;
                ">${post.title}</p>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <!-- Option 1: Republish As Is -->
                <button onclick="window.republishAsIs('${postId}')" style="
                    background: linear-gradient(135deg, #2563eb, #1d4ed8);
                    border: none;
                    color: white;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                ">
                    <span style="font-size: 1.5rem;">📋</span>
                    <div>
                        <div style="font-weight: 900;">نسخ مباشرة</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">انسخ المشروع كما هو بالضبط</div>
                    </div>
                </button>

                <!-- Option 2: Republish with Modifications -->
                <button onclick="window.republishWithMods('${postId}')" style="
                    background: linear-gradient(135deg, #7c3aed, #6d28d9);
                    border: none;
                    color: white;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                ">
                    <span style="font-size: 1.5rem;">✏️</span>
                    <div>
                        <div style="font-weight: 900;">انسخ مع تعديل</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">عدّل الوصف والعنوان قبل النشر</div>
                    </div>
                </button>

                <!-- Option 3: Edit Original -->
                <button onclick="window.editOriginalPost('${postId}')" style="
                    background: linear-gradient(135deg, #059669, #047857);
                    border: none;
                    color: white;
                    padding: 1rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    text-align: left;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                ">
                    <span style="font-size: 1.5rem;">🔧</span>
                    <div>
                        <div style="font-weight: 900;">تعديل الأصل</div>
                        <div style="font-size: 0.75rem; opacity: 0.8;">اتجه إلى المحرر وعدّل المشروع الأصلي</div>
                    </div>
                </button>

                <!-- Cancel -->
                <button onclick="document.getElementById('republish-modal').remove()" style="
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #aaa;
                    padding: 0.75rem;
                    border-radius: 0.75rem;
                    cursor: pointer;
                    font-weight: 700;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                ">
                    ❌ إلغاء
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

/**
 * Republish As Is - نسخ مباشرة بدون تعديل
 */
window.republishAsIs = async (postId) => {
    const post = republishSystem.originalPost;
    if (!post) return;

    try {
        const authorName = localStorage.getItem('cl_username') || 'مطور';
        const authorId = localStorage.getItem('cl_user_id') || 'guest';

        // Create new post with same data
        const newPostRef = push(ref(rdb, `${DB_ROOT}/posts`));
        await set(newPostRef, {
            title: post.title,
            description: post.description,
            code: post.code,
            language: post.language,
            visibility: 'public',
            authorName,
            authorId,
            originalAuthor: post.authorName,
            originalPostId: postId,
            isRepublish: true,
            likes: 0,
            likedBy: {},
            comments: {},
            views: 0,
            timestamp: Date.now(),
            createdAt: new Date().toISOString()
        });

        // Send auto-mention to original author
        await window.autoMentionOnRepublish(post, { id: newPostRef.key, title: post.title });

        window.sendNotification({
            type: 'success',
            title: '✅ تم النسخ بنجاح',
            message: `تم نسخ "${post.title}" إلى مشاريعك`,
            icon: 'check-circle',
            color: 'success',
            duration: 3000
        });

        // Close modal
        const modal = document.getElementById('republish-modal');
        if (modal) modal.remove();

        // Refresh feed
        setTimeout(() => {
            currentView === 'home' && renderFeed();
        }, 500);
    } catch (error) {
        console.error('Error republishing:', error);
        window.sendNotification({
            type: 'error',
            title: '❌ خطأ',
            message: 'فشل نسخ المشروع',
            icon: 'alert-circle',
            color: 'danger'
        });
    }
};

/**
 * Republish with Modifications - نسخ مع تعديل
 */
window.republishWithMods = (postId) => {
    const post = republishSystem.originalPost;
    if (!post) return;

    // Close republish modal
    const modal = document.getElementById('republish-modal');
    if (modal) modal.remove();

    // Show modification modal
    const modModal = document.createElement('div');
    modModal.id = 'republish-mods-modal';
    modModal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(3, 3, 3, 0.95);
        backdrop-filter: blur(20px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        overflow-y: auto;
    `;

    modModal.innerHTML = `
        <div style="
            background: #0c0c0c;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 2rem;
            padding: 2rem;
            max-width: 600px;
            width: 90%;
            margin: 2rem auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="
                    color: #fff;
                    font-size: 1.25rem;
                    font-weight: 900;
                    margin: 0;
                ">عدّل المشروع</h2>
                <button onclick="document.getElementById('republish-mods-modal').remove()" style="
                    background: transparent;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    font-size: 1.5rem;
                ">&times;</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                    <label style="display: block; font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; color: #aaa;">العنوان</label>
                    <input type="text" id="mod-title" value="${post.title}" style="
                        width: 100%;
                        background: #000;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 0.75rem;
                        padding: 0.75rem;
                        color: white;
                        font-family: inherit;
                        box-sizing: border-box;
                    ">
                </div>

                <div>
                    <label style="display: block; font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; color: #aaa;">الوصف</label>
                    <textarea id="mod-desc" style="
                        width: 100%;
                        background: #000;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 0.75rem;
                        padding: 0.75rem;
                        color: white;
                        font-family: inherit;
                        min-height: 100px;
                        box-sizing: border-box;
                        resize: vertical;
                    ">${post.description}</textarea>
                </div>

                <div>
                    <label style="display: block; font-weight: 700; font-size: 0.875rem; margin-bottom: 0.5rem; color: #aaa;">الرؤية</label>
                    <select id="mod-visibility" style="
                        width: 100%;
                        background: #000;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 0.75rem;
                        padding: 0.75rem;
                        color: white;
                        font-family: inherit;
                    ">
                        <option value="public" selected>🌐 عام</option>
                        <option value="followers">👥 المتابعين فقط</option>
                        <option value="private">🔒 خاص</option>
                    </select>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="window.submitRepublishMods()" style="
                        flex: 1;
                        background: linear-gradient(135deg, #7c3aed, #6d28d9);
                        border: none;
                        color: white;
                        padding: 0.875rem;
                        border-radius: 0.75rem;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 0.95rem;
                        transition: all 0.2s;
                    ">
                        ✅ نشر النسخة
                    </button>
                    <button onclick="document.getElementById('republish-mods-modal').remove()" style="
                        flex: 1;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #aaa;
                        padding: 0.875rem;
                        border-radius: 0.75rem;
                        cursor: pointer;
                        font-weight: 700;
                        font-size: 0.95rem;
                    ">
                        ❌ إلغاء
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modModal);
};

/**
 * Submit Republish with Modifications
 */
window.submitRepublishMods = async () => {
    const post = republishSystem.originalPost;
    const title = document.getElementById('mod-title').value.trim();
    const description = document.getElementById('mod-desc').value.trim();
    const visibility = document.getElementById('mod-visibility').value;

    if (!title || !description) {
        window.sendNotification({
            type: 'error',
            title: '❌ حقول مفقودة',
            message: 'يجب ملء العنوان والوصف',
            icon: 'alert-circle',
            color: 'danger'
        });
        return;
    }

    try {
        const authorName = localStorage.getItem('cl_username') || 'مطور';
        const authorId = localStorage.getItem('cl_user_id') || 'guest';

        const newPostRef = push(ref(rdb, `${DB_ROOT}/posts`));
        await set(newPostRef, {
            title,
            description,
            code: post.code,
            language: post.language,
            visibility,
            authorName,
            authorId,
            originalAuthor: post.authorName,
            originalPostId: republishSystem.editingPostId,
            isRepublish: true,
            likes: 0,
            likedBy: {},
            comments: {},
            views: 0,
            timestamp: Date.now(),
            createdAt: new Date().toISOString()
        });

        await window.autoMentionOnRepublish(post, { id: newPostRef.key, title });

        window.sendNotification({
            type: 'success',
            title: '✅ تم النشر بنجاح',
            message: 'تم نشر النسخة المعدلة',
            icon: 'check-circle',
            color: 'success',
            duration: 3000
        });

        document.getElementById('republish-mods-modal').remove();
        setTimeout(() => {
            currentView === 'home' && renderFeed();
        }, 500);
    } catch (error) {
        console.error('Error publishing modified version:', error);
        window.sendNotification({
            type: 'error',
            title: '❌ خطأ',
            message: 'فشل نشر المشروع',
            icon: 'alert-circle',
            color: 'danger'
        });
    }
};

/**
 * Edit Original Post - فتح المحرر للتعديل
 */
window.editOriginalPost = async (postId) => {
    const post = republishSystem.originalPost;
    if (!post) return;

    // Check if user is the author
    const myId = localStorage.getItem('cl_user_id');
    if (myId !== post.authorId) {
        window.sendNotification({
            type: 'error',
            title: '❌ ليس لديك صلاحية',
            message: 'لا يمكنك تعديل مشروع شخص آخر',
            icon: 'alert-circle',
            color: 'danger'
        });
        return;
    }

    // Save edit session to localStorage
    const editSession = {
        postId,
        title: post.title,
        description: post.description,
        code: post.code,
        language: post.language,
        visibility: post.visibility || 'public',
        timestamp: Date.now()
    };

    localStorage.setItem('cl_editor_edit_id', postId);
    localStorage.setItem('cl_post_draft', JSON.stringify(editSession));

    // Close modal
    const modal = document.getElementById('republish-modal');
    if (modal) modal.remove();

    window.sendNotification({
        type: 'info',
        title: '📝 جاري الانتقال للمحرر',
        message: 'سيتم فتح المحرر...',
        icon: 'edit-3',
        color: 'primary',
        duration: 2000
    });

    // Redirect to editor
    setTimeout(() => {
        window.location.href = 'ed.html';
    }, 1000);
};

// Export system
window.republishSystem = republishSystem;

console.log('✅ Advanced Republish System Loaded');
