const fs = require('fs')
const path = require('path')

const deleteFile = async filePath => {
    let data
    try {
        fs.unlinkSync(filePath)
    } catch (error) {
        console.error(error.message)
    }
    return {
        success: true,
        data
    }
}
const deleteFolder = async dirPath => {
    let data
    try {
        fs.rmdirSync(dirPath)
    } catch (error) {
        console.error(error.message)
    }
    return {
        success: true,
        data
    }
}

const removeNotNullDir = async dir => {
    let folders
    try {
        folders = fs.readdirSync(dir)
    } catch (error) {
        console.error(dir, error.message)
        return {
            success: true,
            message: '文件夹已删除'
        }
    }
    for (const folder of folders) {
        let attribute
        const currentDir = path.join(dir, folder)
        try {
            attribute = fs.statSync(currentDir)
        } catch (error) {
            return {
                success: true,
                message: '文件夹已删除'
            }
        }
        if (attribute.isDirectory()) {
            // 递归
            await removeNotNullDir(currentDir)
        } else {
            // 删除
            await deleteFile(currentDir)
        }
    }
    await deleteFolder(dir)
    return {
        success: true,
        data: folders
    }
}

module.exports = { removeNotNullDir, deleteFile };