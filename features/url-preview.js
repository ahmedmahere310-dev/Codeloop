/**
 * CodeLoop V2 - Live URL Preview System
 * نظام معاينة الروابط المباشرة
 * 
 * Features:
 * - Paste live URLs and preview them
 * - URL validation and safety checks
 * - iFrame sandbox for security
 * - URL metadata extraction
 * - Direct URL publishing
 */

const urlPreviewSystem = {
    cache: {},
    validationRules: {
        maxUrlLength: 2048,
        allowedProtocols: ['http://', 'https://'],
        blockedDomains: [
            'localhost',
            '127.0.0.1',
            '192.168',
            '10.0.0',
            'file://'
        ]
    }
};

/**
 * Validate URL Safety
 * التحقق من سلامة الرابط
 */
window.validateURL = (urlString) => {
    try {
        const url = new URL(urlString);
        
        // Check length
        if (urlString.length > urlPreviewSystem.validationRules.maxUrlLength) {
            return { valid: false, error: 'الرابط طويل جداً' };
        }

        // Check protocol
        if (!urlPreviewSystem.validationRules.allowedProtocols.some(p => url.href.startsWith(p))) {
            return { valid: false, error: 'بروتوكول غير آمن' };
        }

        // Check blocked domains
        const hostname = url.hostname;
        for (let blocked of urlPreviewSystem.validationRules.blockedDomains) {
            if (hostname.includes(blocked)) {
                return { valid: false, error: 'النطاق محظور لأسباب أمنية' };
            }
        }

        return { valid: true, url };
    } catch (error) {
        return { valid: false, error: 'رابط غير صحيح' };
    }
};

/**
 * Extract URL Metadata
 * استخراج معلومات الرابط
 */
window.extractURLMetadata = async (urlString) => {
    // Check cache first
    if (urlPreviewSystem.cache[urlString]) {
        return urlPreviewSystem.cache[urlString];
    }

    try {
        const response = await fetch(urlString, {
            method: 'GET',
            headers: {
                'Accept': 'text/html',
            },
            mode: 'no-cors'
        });

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const metadata = {
            title: doc.querySelector('title')?.textContent || '',
            description: doc.querySelector('meta[name="description"]')?.content || '',
            ogImage: doc.querySelector('meta[property="og:image"]')?.content || '',
            ogTitle: doc.querySelector('meta[property="og:title"]')?.content || '',
            domain: new URL(urlString).hostname,
            favicon: `https://www.google.com/s2/favicons?sz=64&domain=${new URL(urlString).hostname}`
        };

        // Cache for 1 hour
        urlPreviewSystem.cache[urlString] = metadata;
        setTimeout(() => delete urlPreviewSystem.cache[urlString], 3600000);

        return metadata;
    } catch (error) {
        console.log('Could not extract metadata:', error);
        return {
            title: new URL(urlString).hostname,
            description: 'معاينة متاحة عند الفتح',
            domain: new URL(urlString).hostname,
            favicon: `https://www.google.com/s2/favicons?sz=64&domain=${new URL(urlString).hostname}`
        };
    }
};

/**
 * Preview URL in Modal
 * معاينة الرابط في نافذة
 */
window.previewURL = (urlString) => {
    const validation = window.validateURL(urlString);
    if (!validation.valid) {
        window.sendNotification({
            type: 'error',
            title: '❌ رابط غير صحيح',
            message: validation.error,
            icon: 'alert-circle',
            color: 'danger'
        });
        return;
    }

    const modal = document.getElementById('fullscreen-modal') || createURLPreviewModal();
    const container = modal.querySelector('#fs-iframe-container') || createIframeContainer();
    
    // Clear previous content
    container.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = validation.url.href;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none; border-radius: 0;';
    iframe.sandbox.add('allow-same-origin', 'allow-scripts', 'allow-popups', 'allow-forms');
    
    container.appendChild(iframe);
    modal.style.display = 'flex';
};

/**
 * Create URL Preview Modal if doesn't exist
 */
function createURLPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'url-preview-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 300;
        background: #030303;
        display: none;
        flex-direction: column;
    `;
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #020202; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 350;">
            <span style="color: #fff; font-weight: 700;">معاينة الموقع</span>
            <button onclick="this.closest('#url-preview-modal').style.display='none'" style="background: transparent; border: none; color: #999; cursor: pointer; font-size: 24px;">&times;</button>
        </div>
        <div id="fs-iframe-container" style="flex: 1; width: 100%; overflow: hidden;"></div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

function createIframeContainer() {
    return document.querySelector('#fs-iframe-container') || (() => {
        const container = document.createElement('div');
        container.id = 'fs-iframe-container';
        document.body.appendChild(container);
        return container;
    })();
}

/**
 * Publish URL Post
 * نشر مشروع يحتوي على URL
 */
window.publishURLPost = async (config) => {
    const {
        title,
        description,
        url,
        visibility = 'public',
        category = 'resource'
    } = config;

    const validation = window.validateURL(url);
    if (!validation.valid) {
        window.sendNotification({
            type: 'error',
            title: '❌ خطأ في الرابط',
            message: validation.error,
            icon: 'alert-circle',
            color: 'danger'
        });
        return false;
    }

    try {
        const authorName = localStorage.getItem('cl_username') || 'مطور';
        const authorId = localStorage.getItem('cl_user_id') || 'guest';
        const metadata = await window.extractURLMetadata(url);

        const postData = {
            title,
            description,
            url: url,
            urlMetadata: metadata,
            isURLPost: true,
            type: 'url',
            category,
            visibility,
            authorName,
            authorId,
            likes: 0,
            likedBy: {},
            comments: {},
            views: 0,
            timestamp: Date.now(),
            createdAt: new Date().toISOString()
        };

        // Save to Firebase
        const newPostRef = push(ref(rdb, `${DB_ROOT}/posts`));
        await set(newPostRef, postData);

        window.sendNotification({
            type: 'success',
            title: '✅ تم النشر بنجاح',
            message: 'تم نشر الرابط في الفيد',
            icon: 'check-circle',
            color: 'success'
        });

        return true;
    } catch (error) {
        console.error('Error publishing URL post:', error);
        window.sendNotification({
            type: 'error',
            title: '❌ خطأ',
            message: 'فشل نشر الرابط',
            icon: 'alert-circle',
            color: 'danger'
        });
        return false;
    }
};

/**
 * Handle URL Paste in Editor
 * معالجة لصق الرابط في المحرر
 */
window.handleURLPaste = (event) => {
    const pastedText = event.clipboardData?.getData('text') || '';
    
    const urlValidation = window.validateURL(pastedText);
    if (!urlValidation.valid) return; // Not a URL, proceed normally

    event.preventDefault();

    // Show URL preview option
    const shouldPreview = confirm(`هل تريد معاينة هذا الرابط؟\n${pastedText}`);
    if (shouldPreview) {
        window.previewURL(pastedText);
    } else {
        // Insert URL as text
        document.execCommand('insertText', false, pastedText);
    }
};

// Export system
window.urlPreviewSystem = urlPreviewSystem;

console.log('✅ URL Preview System Loaded');
