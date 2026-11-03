const express = require('express');
const cors = require('cors');
const geoip = require('geoip-lite');

const app = express();
app.use(express.json());
app.use(cors());

// تخزين الزيارات والنشاط
let visitsLog = [];
let totalVisitsCount = 0;

// دالة بسيطة لتحليل نوع الجهاز والمتصفح من الـ User-Agent
function parseUserAgent(ua = '') {
    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet/i.test(ua)) device = 'Tablet';

    let browser = 'Unknown Browser';
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/edge/i.test(ua)) browser = 'Edge';

    return { device, browser };
}

// 1. مسار تسجيل الزيارات (يتم استدعاؤه من موقعك عبر tracker.js)
app.post('/api/track', (req, res) => {
    const { pageUrl, referrer } = req.body;
    
    // استخراج عنوان الـ IP الحقيقي للزائر
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    
    // جلب معلومات الموقع الجغرافي (المدينة والدولة)
    const geo = geoip.lookup(ip) || { city: 'Unknown City', country: 'XX' };
    const location = `${geo.city !== '' ? geo.city : 'Unknown City'}, ${geo.country}`;

    // تحليل الجهاز والمتصفح
    const uaString = req.headers['user-agent'] || '';
    const deviceInfo = parseUserAgent(uaString);

    totalVisitsCount++;
    
    const visitRecord = {
        id: Date.now(),
        ip: ip.includes('::1') ? '127.0.0.1' : ip,
        pageUrl: pageUrl || 'Unknown Page',
        referrer: referrer || 'Direct',
        location: location, // المدينة والدولة
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        timestamp: new Date().toLocaleTimeString(),
        lastActive: Date.now() // لتحديد المتواجدين حالياً
    };

    // إضافة الزيارة في بداية القائمة
    visitsLog.unshift(visitRecord);
    
    // الاحتفاظ بآخر 100 زيارة فقط في الذاكرة لتخفيف الضغط
    if (visitsLog.length > 100) {
        visitsLog.pop();
    }

    res.status(200).json({ success: true, message: 'Visit recorded successfully' });
});

// 2. مسار إرجاع الإحصائيات لتطبيق Flutter
app.get('/api/stats', (req, res) => {
    const now = Date.now();
    const ACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 دقائق تعتبر الزائر متواجداً حالياً

    // حساب عدد المتواجدين حالياً بناءً على آخر نشاط
    // نفرض أن كل سجل حديث يمثل نشاطاً، أو نقوم بتصفية حسب الـ IP والوقت
    const activeIps = new Set();
    visitsLog.forEach(visit => {
        if (now - visit.lastActive < ACTIVE_THRESHOLD) {
            activeIps.add(visit.ip);
        }
    });

    res.json({
        totalVisits: totalVisitsCount,
        activeUsersNow: activeIps.size, // عدد الموجودين حالياً
        recentVisits: visitsLog
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Advanced Tracker API is running on port ${PORT}`);
});