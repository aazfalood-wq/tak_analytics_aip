const express = require('express');
const cors = require('cors');
const geoip = require('geoip-lite'); // استدعاء المكتبة المحلية الموجودة في مشروعك
const app = express();

// لتحديد الـ IP الحقيقي بدقة خلف الاستضافات والبروكسي
app.set('trust proxy', true);

app.use(express.json());
app.use(cors());

let totalVisits = 0;
let activeUsersNow = 1;
let recentVisits = [];

app.post('/api/track', (req, res) => {
    const pageUrl = req.body.pageUrl || 'الصفحة الرئيسية';
    const userAgent = req.get('User-Agent') || 'Unknown';
    
    const isMobile = /mobile|android|iphone|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    
    let browserName = 'Browser';
    if (userAgent.includes('Chrome')) browserName = 'Chrome';
    else if (userAgent.includes('Firefox')) browserName = 'Firefox';
    else if (userAgent.includes('Safari')) browserName = 'Safari';
    else if (userAgent.includes('Edge')) browserName = 'Edge';

    // استخراج الـ IP الحقيقي للزائر
    let clientIp = req.headers['x-client-ip'] || 
                   req.headers['x-real-ip'] || 
                   req.headers['cf-connecting-ip'] || '';
                   
    if (!clientIp) {
        const xForwarded = req.headers['x-forwarded-for'];
        if (xForwarded) {
            clientIp = xForwarded.split(',')[0].trim();
        } else {
            clientIp = req.socket.remoteAddress || '';
        }
    }

    if (clientIp.startsWith('::ffff:')) {
        clientIp = clientIp.replace('::ffff:', '');
    }

    let locationStr = 'المملكة العربية السعودية';

    // فحص الـ IP عبر مكتبة geoip-lite المحلية
    if (clientIp && clientIp !== '::1' && clientIp !== '127.0.0.1') {
        const geo = geoip.lookup(clientIp);
        if (geo) {
            // geo.country يعطي رمز الدولة (مثل SA)، و geo.city يعطي المدينة
            const country = geo.country ? geo.country : 'المملكة العربية السعودية';
            const city = geo.city ? geo.city : '';
            
            locationStr = city ? `${country} - ${city}` : country;
        }
    } else {
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