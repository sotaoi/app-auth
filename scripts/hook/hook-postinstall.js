#!/bin/env node

const fs = require('fs');
const path = require('path');

const main = async () => {
  const appOmniPath = path.dirname(require.resolve('@app/omni/package.json'));
  const pocketPath = fs.existsSync(path.resolve('../../pocket'))
    ? path.resolve('../../pocket')
    : path.resolve('../pocket');
  if (!fs.existsSync(pocketPath)) {
    console.error('Pocket folder is missing');
    return;
  }

  fs.existsSync(path.resolve(pocketPath, 'env.json')) &&
    fs.copyFileSync(path.resolve(pocketPath, 'env.json'), path.resolve(appOmniPath, 'env.json'));

  fs.rmdirSync(path.resolve(appOmniPath, 'certs'), { recursive: true });
  fs.mkdirSync(path.resolve(appOmniPath, 'certs'));
  fs.existsSync(path.resolve(pocketPath, 'certs')) &&
    fs.readdirSync(path.resolve(pocketPath, 'certs')).map((item) => {
      const fullpath = path.resolve(pocketPath, 'certs', item);
      if (fs.lstatSync(fullpath).isDirectory() || item.charAt(0) === '.') {
        return;
      }
      fs.copyFileSync(fullpath, path.resolve(appOmniPath, 'certs', item));
    });
};

main();
