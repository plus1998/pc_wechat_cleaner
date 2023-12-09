const enquirer = require('enquirer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDiskSpace } = require('./service/disk');
const { removeNotNullDir } = require('./service/clear');
const { notify } = require('./service/feishu');
const dayjs = require('dayjs');

const excludes = ['Global', 'Profiles']
const clearDataDirNames = ['Image', 'Video']

const documentDir = path.join(os.homedir(), 'Documents')
// 检查
if (!fs.existsSync(documentDir)) {
    // 创建
    fs.mkdirSync(documentDir)
}
const appConfigDir = path.join(documentDir, '企业微信清理工具')
// 检查
if (!fs.existsSync(appConfigDir)) {
    // 创建
    fs.mkdirSync(appConfigDir)
}
const configPath = path.join(appConfigDir, 'config.json')

const clear = async () => {
    // 微信默认文件夹
    const wechat_dir = path.join(documentDir, 'WXWork')
    // 检查目录是否存在
    if (!fs.existsSync(wechat_dir)) {
        console.log('⚠️ 微信文件夹不存在，仅支持默认文件夹');
        return
    }
    // 获取磁盘空间no
    const before_disk_space = await getDiskSpace(wechat_dir)
    // 获取所有文件夹
    const dirs = fs.readdirSync(wechat_dir)
    // 遍历
    for (const dir of dirs) {
        if (excludes.includes(dir)) {
            continue
        }
        const bigFileDir = path.join(wechat_dir, dir, 'Cache')
        // 检查文件夹
        if (!fs.existsSync(bigFileDir)) {
            continue
        }
        for (const clearDataDirName of clearDataDirNames) {
            // 检查文件夹
            if (!fs.existsSync(path.join(bigFileDir, clearDataDirName))) {
                continue
            }
            const targetDir = path.join(bigFileDir, clearDataDirName)
            // 删除非空文件夹
            try {
                const ret = await removeNotNullDir(targetDir)
                console.log('删除文件夹', targetDir, ret)
            } catch (error) {
                console.log(error)
            }
        }
    }
    // 获取磁盘空间
    const after_disk_space = await getDiskSpace(wechat_dir)
    // 本次清理
    const clear_size = after_disk_space.free - before_disk_space.free
    const releaseSpace = (clear_size / 1024 / 1024).toFixed(2) + 'MB'
    const freeSpace = (after_disk_space.free / 1024 / 1024 / 1024).toFixed(2) + 'GB'
    const freePercent = after_disk_space.free / after_disk_space.total
    const freePercentText = (freePercent * 100).toFixed(2) + '%'
    console.log('本次清理释放空间', releaseSpace)
    console.log('当前剩余可用空间', freeSpace)
    console.log('空闲空间', freePercentText)
    // 判断不足10%
    if (freePercent < 0.1) {
        console.error('⚠️ 磁盘空间不足10%');
        return
    }
    if (needNotify && config.webhook) {
        notify(config.webhook, {
            "elements": [
                {
                    "tag": "column_set",
                    "flex_mode": "none",
                    "background_style": "default",
                    "columns": [
                        {
                            "tag": "column",
                            "width": "weighted",
                            "weight": 1,
                            "vertical_align": "top",
                            "elements": [
                                {
                                    "tag": "div",
                                    "text": {
                                        "content": `名称\n**${config.name || '未填写'}**`,
                                        "tag": "lark_md"
                                    }
                                }
                            ]
                        },
                        {
                            "tag": "column",
                            "width": "weighted",
                            "weight": 1,
                            "vertical_align": "top",
                            "elements": [
                                {
                                    "tag": "div",
                                    "text": {
                                        "content": `时间\n**${dayjs().format('HH:mm:ss')}**`,
                                        "tag": "lark_md"
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    "tag": "column_set",
                    "flex_mode": "none",
                    "background_style": "default",
                    "columns": [
                        {
                            "tag": "column",
                            "width": "weighted",
                            "weight": 1,
                            "vertical_align": "top",
                            "elements": [
                                {
                                    "tag": "div",
                                    "text": {
                                        "content": `清理释放\n**${releaseSpace}**`,
                                        "tag": "lark_md"
                                    }
                                }
                            ]
                        },
                        {
                            "tag": "column",
                            "width": "weighted",
                            "weight": 1,
                            "vertical_align": "top",
                            "elements": [
                                {
                                    "tag": "markdown",
                                    "content": `剩余可用空间\n**${freeSpace}**`
                                }
                            ]
                        }
                    ]
                },
                {
                    "tag": "div",
                    "text": {
                        "content": `剩余空间: <font color=\"${freePercent < 0.1 ? 'red' : 'green'}\">${freePercentText}</font>`,
                        "tag": "lark_md"
                    }
                }
            ],
            "header": {
                "template": "turquoise",
                "title": {
                    "content": "微信清理通知",
                    "tag": "plain_text"
                }
            }
        });
    }
}

const countdown = async (seconds) => {
    return new Promise(resolve => {
        if (seconds <= 0) {
            resolve();
        } else {
            process.stdout.clearLine();  // 清除当前输出行
            process.stdout.cursorTo(0);  // 将光标移动到行首
            process.stdout.write(`下次清理倒计时: ${seconds} 秒`);  // 输出更新后的倒计时数值
            setTimeout(() => resolve(), 1000);
        }
    });
}

async function startCountdown(interval) {
    let seconds = interval
    while (seconds > 0) {
        await countdown(seconds);
        seconds--;
    }
    process.stdout.clearLine();  // 清除最后一行的倒计时数值
    process.stdout.cursorTo(0);  // 将光标移动到行首
    console.log('开始清理');
    await clear()
    await startCountdown(interval)
}

let needNotify = false
let config = {};
const main = async () => {
    const intervalMap = {
        '立即': 0,
        '三十分钟': 30,
        '每小时': 60,
        '每六小时': 360,
        '每天': 1440,
        '每三天': 4320,
        '每七天': 10080
    }
    // 是否需要通知
    const { need_notify } = await enquirer.prompt({
        type: 'confirm',
        name: 'need_notify',
        message: '是否需要通知',
        initial: true,
    });
    needNotify = need_notify
    if (need_notify) {
        console.log('[飞书通知] 已启用')
        // 读取现有通知
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath))
            } catch (error) {
                console.error('配置文件格式错误')
            }
        }
        // 要求输入飞书webhook
        const inputConfig = await enquirer.prompt([
            {
                type: 'input',
                name: 'webhook',
                message: '请输入飞书webhook',
                initial: config.webhook,
            },
            {
                type: 'input',
                name: 'name',
                message: '当前设备备注',
                initial: config.name,
            }
        ]);
        config = inputConfig
        // 写入配置文件
        fs.writeFileSync(configPath, JSON.stringify(config))
    }
    // 确定配置文件
    const { clear_interval } = await enquirer.prompt({
        type: 'select',
        name: 'clear_interval',
        message: '请选择清理间隔',
        choices: Object.keys(intervalMap),
    });
    if (intervalMap[clear_interval] === 0) {
        // 立即清理
        await clear()
        await new Promise((resolve) => {
            console.log('清理完成,3秒后退出');
            setTimeout(resolve, 3000);
        })
        return
    }
    if (!intervalMap[clear_interval]) {
        // 参数错误
        process.exit(1)
    }
    // 确定清理时间
    const interval = intervalMap[clear_interval] * 60
    // 启动定时器
    await startCountdown(interval)
}

main()