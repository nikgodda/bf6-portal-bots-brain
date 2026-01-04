const { spawnSync } = require('child_process');

function run(cmd, args) {
    const result = spawnSync(cmd, args, { stdio: 'inherit' });
    return result.status ?? 1;
}

function capture(cmd, args) {
    const result = spawnSync(cmd, args, { encoding: 'utf8' });
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
    return result.stdout.trim();
}

const status = capture('git', ['status', '--porcelain']);
const hadLocalChanges = status.length > 0;
let stashed = false;

if (hadLocalChanges) {
    const code = run('git', ['stash', 'push', '-u', '-m', 'temp coreai update']);
    if (code !== 0) {
        process.exit(code);
    }
    stashed = true;
}

let exitCode = run('git', ['fetch', 'coreai']);
if (exitCode !== 0) {
    process.exit(exitCode);
}

const splitSha = capture('git', [
    'subtree',
    'split',
    '--prefix=src/Core/AI',
    'coreai/main',
]);

const hasSubtree =
    spawnSync('git', ['cat-file', '-e', 'HEAD:src/Core/AI']).status === 0;

if (hasSubtree) {
    exitCode = run('git', [
        'subtree',
        'pull',
        '--prefix=src/Core/AI',
        '.',
        splitSha,
        '--squash',
    ]);
} else {
    exitCode = run('git', [
        'subtree',
        'add',
        '--prefix=src/Core/AI',
        '.',
        splitSha,
        '--squash',
    ]);
}

if (exitCode === 0) {
    exitCode = run('node', ['scripts/update-coreai-brain.js']);
}

if (stashed) {
    const popCode = run('git', ['stash', 'pop']);
    if (popCode !== 0 && exitCode === 0) {
        exitCode = popCode;
    }
}

if (exitCode !== 0) {
    process.exit(exitCode);
}
