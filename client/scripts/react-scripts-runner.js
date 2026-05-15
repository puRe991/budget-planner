const { spawnSync } = require('child_process');

const command = process.argv[2];
const passthroughArgs = process.argv.slice(3);

if (!command) {
  console.error('Usage: node scripts/react-scripts-runner.js <start|build|test|eject> [args...]');
  process.exit(1);
}

const nodeMajorVersion = Number(process.versions.node.split('.')[0]);
const legacyOpenSslProvider = '--openssl-legacy-provider';
const env = { ...process.env };

if (nodeMajorVersion >= 17 && !(env.NODE_OPTIONS || '').includes(legacyOpenSslProvider)) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, legacyOpenSslProvider].filter(Boolean).join(' ');
}

const result = spawnSync(
  process.execPath,
  [require.resolve('react-scripts/bin/react-scripts.js'), command, ...passthroughArgs],
  {
    stdio: 'inherit',
    env,
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.signal) {
  process.kill(process.pid, result.signal);
}

process.exit(result.status || 0);
