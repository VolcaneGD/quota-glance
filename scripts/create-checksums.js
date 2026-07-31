const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const dist = path.join(__dirname, '..', 'dist');
const files = fs.readdirSync(dist)
  .filter((name) => /^Quota-Glance-.*\.exe$/i.test(name))
  .sort();

if (files.length === 0) {
  throw new Error('No Quota Glance release executable was found in dist.');
}

const lines = files.map((name) => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(path.join(dist, name)));
  return `${hash.digest('hex')}  ${name}`;
});

fs.writeFileSync(path.join(dist, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`, 'utf8');
console.log(lines.join('\n'));
