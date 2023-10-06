const diskusage = require('diskusage');

async function getDiskSpace(path) {
    try {
        const ret = await diskusage.check(path);
        return ret
    } catch (err) {
        console.error(err)
        return null
    }
}

module.exports = { getDiskSpace };