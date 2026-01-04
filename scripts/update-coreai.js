const { spawnSync } = require('child_process');

function run(cmd, args) {
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

function capture(cmd, args) {
    const result = spawnSync(cmd, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
    return result.stdout.trim();
}

run('git', ['fetch', 'coreai', 'main']);

const splitSha = capture('git', [
    'subtree',
    'split',
    '--prefix=src/Core/AI',
    'coreai/main',
]);

run('git', [
    'subtree',
    'pull',
    '--prefix=src/Core/AI',
    '.',
    splitSha,
    '--squash',
    '-m',
    'Update CoreAI subtree',
]);

run('node', ['scripts/update-coreai-brain.js']);
