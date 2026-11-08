const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

// تخزين البيانات في الذاكرة المؤقتة للسيرفر
let totalVisits = 0;
let activeUsersNow = 1;
let recentVisits = [];

// 1. استقبال بيانات الزيارة الجديدة (بما فيها مسار الصفحة URL)
app.post('/api/track', (req, res) => {
    const pageUrl = req.body.pageUrl || 'الصفحة الرئيسية';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    // تحديد نوع الجهاز بذكاء من الـ User-Agent
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    
    // استخراج اسم المتصفح بشكل مبسط
    let browserName = 'Browser';
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';

    totalVisits++;

    const newVisit = {
        pageUrl: pageUrl,
        device: deviceType,
        browser: browserName,
        location: 'المملكة العربية السعودية',
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Local',
        timestamp: new Date().toISOString() // توقيت السيرفر UTC
    };

    // إضافة الزيارة الجديدة في مقدمة القائمة والاحتفاظ بآخر 15 زيارة فقط
    recentVisits.unshift(newVisit);
    if (recentVisits.length > 15) {
        recentVisits.pop();
    }

    res.status(200).json({ success: true, totalVisits });
});

// 2. تزويد التطبيق ولوحة الكمبيوتر بالإحصائيات الحالية
app.get('/api/stats', (req, res) => {
    res.json({
        totalVisits: totalVisits,
        activeUsersNow: activeUsersNow,
        recentVisits: recentVisits
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TAK Analytics Server running on port ${PORT}`);
});