const { name, version } = require('./package.json');
const cp = require('child_process');

cp.exec(`pkg app.js -t node14-win-x64 -o dist/${name}-${version}.exe`, (err, stdout, stderr) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
    console.error(stderr);
});