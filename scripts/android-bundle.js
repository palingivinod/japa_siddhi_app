const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const propsPath = path.join(android, 'keystore.properties');
const keystorePath = path.join(android, 'app', 'japasiddhi-release.keystore');

if (!fs.existsSync(propsPath) || !fs.existsSync(keystorePath)) {
  console.error(
    'Release signing is missing. Keep android/keystore.properties and android/app/japasiddhi-release.keystore on this machine.',
  );
  process.exit(1);
}

const isWin = process.platform === 'win32';
const gradle = isWin ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradle, ['bundleRelease'], {
  cwd: android,
  stdio: 'inherit',
  shell: isWin,
  env: {
    ...process.env,
    JAVA_HOME:
      process.env.JAVA_HOME ||
      'C:\\Program Files\\Amazon Corretto\\jdk21.0.3_9',
    ANDROID_HOME:
      process.env.ANDROID_HOME ||
      path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const built = findNewestAab(android);
if (!built) {
  console.error('bundleRelease finished but no app-release.aab was found.');
  process.exit(1);
}

const builtSha = sha1OfAab(built);
const uploadSha = sha1OfKeystore(keystorePath, readStorePassword(propsPath));
if (!builtSha || !uploadSha || builtSha !== uploadSha) {
  console.error('This bundle is not signed with japasiddhi-release.keystore.');
  console.error('AAB SHA-1:     ' + (builtSha || 'unreadable'));
  console.error('Keystore SHA-1:' + (uploadSha || 'unreadable'));
  console.error('Do not upload it to Play.');
  process.exit(1);
}

const publishDir = path.join(android, 'app', 'release');
fs.mkdirSync(publishDir, { recursive: true });
const published = path.join(publishDir, 'app-release.aab');
if (path.resolve(built) !== path.resolve(published)) {
  fs.copyFileSync(built, published);
}

console.log('');
console.log('Play upload bundle: ' + published);
console.log('Upload key SHA-1:   ' + builtSha);
console.log('Play will re-sign testers with the app-signing certificate already in Firebase.');

function readStorePassword(file) {
  const line = fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find(row => row.startsWith('storePassword='));
  return line ? line.slice('storePassword='.length).trim() : '';
}

function findNewestAab(dir) {
  const hits = [];
  const walk = current => {
    let entries = [];
    try {
      entries = fs.readdirSync(current, {withFileTypes: true});
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.gradle') continue;
        walk(full);
      } else if (entry.name === 'app-release.aab') {
        hits.push(full);
      }
    }
  };
  walk(dir);
  hits.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return hits[0];
}

function sha1OfKeystore(file, storePassword) {
  const out = spawnSync(
    'keytool',
    ['-list', '-v', '-keystore', file, '-storepass', storePassword],
    {encoding: 'utf8'},
  );
  return extractSha1(out.stdout || '');
}

function sha1OfAab(file) {
  const out = spawnSync('jarsigner', ['-verify', '-verbose', '-certs', file], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return extractSha1((out.stdout || '') + (out.stderr || ''));
}

function extractSha1(text) {
  const match = text.match(/SHA1:\s*([0-9A-F:]{59})/i);
  return match ? match[1].toUpperCase() : '';
}
