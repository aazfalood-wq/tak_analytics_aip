const express = require('express');
const cors = require('cors');
const geoip = require('geoip-lite');

const app = express();
const PORT = process.env.PORT || 3000;

// تفعيل CORS والسماح بقراءة بيانات JSON
app.use(cors());
app.use(express.json());

// قاعدة بيانات مؤقتة في الذاكرة (يمكنك لاحقاً ربطها بقاعدة بيانات حقيقية مثل MongoDB أو SQLite)
let visitsLog = [];

// 1. نقطة النهاية (API Endpoint) لاستقبال تسجيل الزيارة من الموقع
app.post('/api/track', (req, res) => {
    try {
        const { pageUrl } = req.body;
        
        // استخراج عنوان الـ IP للزائر
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        
        // استخراج معلومات المتصفح والنظام من User-Agent
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        // تحديد الدولة بناءً على الـ IP
        const geo = geoip.lookup(ip);
        const country = geo ? geo.country : 'Unknown';

        // تنظيم بيانات الزيارة
        const visitData = {
            id: visitsLog.length + 1,
            ip: ip,
            country: country,
            userAgent: userAgent,
            pageUrl: pageUrl || 'Home',
            timestamp: new Date().toISOString()
        };

        // إضافة الزيارة للسجل
        visitsLog.unshift(visitData); // إضافة أحدث زيارة في البداية

        // طباعة تنبيه في وحدة التحكم (يمكننا ربطه بـ Pushover أو تطبيق Flutter لاحقاً)
        console.log(`[زيارة جديدة] من دولة: ${country} | الصفحة: ${visitData.pageUrl}`);

        res.status(200).json({ success: true, message: 'Visit tracked successfully' });
    } catch (error) {
        console.error('Error tracking visit:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// 2. نقطة نهاية (API Endpoint) لجلب الإحصائيات لعرضها في تطبيق Flutter
app.get('/api/stats', (req, res) => {
    res.status(200).json({
        totalVisits: visitsLog.length,
        recentVisits: visitsLog.slice(0, 50) // إرجاع آخر 50 زيارة
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`🚀 Tracker API is running on port ${PORT}`);
});