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

process.exit(result.status ?? 1);
