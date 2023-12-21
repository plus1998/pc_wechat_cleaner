const fs = require('fs');
const path = require('path');
const os = require('os');
const { getDiskSpace } = require('./service/disk');
const { removeNotNullDir, deleteFile } = require('./service/clear');
const { glob } = require('glob');

const ignore = ['Global/**', 'Profiles/**', 'qtCef/**', '**/WXWorkCefCache/**']
const targets = [
    // 全删
    '**/Cache/',
    '**/Emotion/',
    // 特定
    '**/Data/file.db',
    '**/Data/message.db',
    '**/Backup/**/Data/file.db',
    '**/Backup/**/Data/message.db',
]

const documentDir = path.join(os.homedir(), 'Documents')
// 检查
if (!fs.existsSync(documentDir)) {
    // 创建
    fs.mkdirSync(documentDir)
}

const clear = async () => {
    // 微信默认文件夹
    const wechat_dir = path.join(documentDir, 'WXWork')
    // 检查目录是否存在
    if (!fs.existsSync(wechat_dir)) {
        console.log('⚠️ 企业微信文件夹不存在，仅支持默认文件夹');
        return
    }
    // 获取磁盘空间no
    const before_disk_space = await getDiskSpace(wechat_dir)
    // 获取所有文件夹
    const results = await glob(targets, {
        ignore,
        cwd: wechat_dir,
        withFileTypes: true,
    });
    for (const result of results) {
        console.log(`删除 文件${result.isDirectory() ? '夹' : ''} ${result.fullpath()}`)
        if (result.isDirectory()) {
            removeNotNullDir(result.fullpath())
        } else {
            deleteFile(result.fullpath())
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
}

const countdown = async (seconds) => {
    return new Promise(resolve => {
        if (seconds <= 0) {
            resolve();
        } else {
            process.stdout.clearLine();  // 清除当前输出行
            process.stdout.cursorTo(0);  // 将光标移动到行首
            process.stdout.write(`${seconds} 秒内可以按 CTRL + C 取消`);  // 输出更新后的倒计时数值
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
}

const main = async () => {
    // 启动定时器
    console.log('删除配置', targets);
    await startCountdown(5)
}

main()