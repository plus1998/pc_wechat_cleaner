const https = require('https');

const notify = async (webhook, card) => {
    const data = JSON.stringify({ msg_type: 'interactive', card });
    const options = {
        hostname: 'open.feishu.cn',
        port: 443,
        path: webhook.split('open.feishu.cn')[1],
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    };
    const req = https.request(options, res => {
        res.on('data', d => {
            console.log('[飞书通知]成功', d.toString())
        })
        res.on('error', error => {
            if (error) {
                console.error('[飞书通知]错误', error)
            }
        })
    });
    req.write(data)
    req.end()
}

module.exports = { notify };