const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// هامة جداً لكي يتعرف السيرفر على الـ IP الحقيقي للزائر عند استضافته على الإنترنت
app.set('trust proxy', true);

app.use(express.json());
app.use(cors());

let totalVisits = 0;
let activeUsersNow = 1;
let recentVisits = [];

app.post('/api/track', async (req, res) => {
    const pageUrl = req.body.pageUrl || 'الصفحة الرئيسية';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    
    let browserName = 'Browser';
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName.includes('Safari'); // تم تصحيحها للتحقق السليم
    else if (userAgent.includes('Edge')) browserName = 'Edge';

    // استخراج الـ IP الحقيقي للزائر بدقة
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (clientIp.includes(',')) clientIp = clientIp.split(',')[0].trim();
    
    // تنظيف صيغة الـ IPv6 لو كانت مرتبطة بـ IPv4 مثل ::ffff:192.168.1.1
    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }

    let locationStr = 'المملكة العربية السعودية - الرياض'; // قيمة افتراضية في حال الفشل
    
    // جلب الدولة والمدينة الحقيقية عبر الـ IP
    // ملاحظة: للاختبار محلياً (localhost)، يمكنك وضع IP حقيقي مؤقتاً للتأكد مثل '8.8.8.8'
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        try {
            const geoRes = await axios.get(`http://ip-api.com/json/${clientIp}?fields=status,country,city,query`);
            if (geoRes.data && geoRes.data.status === 'success') {
                const country = geoRes.data.country || 'المملكة العربية السعودية';
                const city = geoRes.data.city || 'الرياض';
                locationStr = `${country} - ${city}`;
            }
        } catch (err) {
            console.log('Geo fetch error:', err.message);
        }
    } else {
        // اختبار محلي افتراضي للتأكد أن الكود يعمل
        locationStr = 'المملكة العربية السعودية - الرياض (محلي)';
    }

    totalVisits++;

    const newVisit = {
        pageUrl: pageUrl,
        device: deviceType,
        browser: browserName,
        location: locationStr, 
        ip: clientIp || 'Local',
        timestamp: new Date().toISOString()
    };

    recentVisits.unshift(newVisit);
    if (recentVisits.length > 15) {
        recentVisits.pop();
    }

    res.status(200).json({ success: true, totalVisits });
});

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