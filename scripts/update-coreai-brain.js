const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const aiRoot = path.join(root, 'src', 'Core', 'AI');
const scriptPath = path.join(root, '__SCRIPT.ts');

if (!fs.existsSync(aiRoot)) {
    throw new Error(`Core AI root not found: ${aiRoot}`);
}

if (!fs.existsSync(scriptPath)) {
    throw new Error(`__SCRIPT.ts not found: ${scriptPath}`);
}

function resolveImport(baseDir, importPath) {
    if (!importPath.startsWith('.')) {
        return null;
    }

    const candidate = path.resolve(baseDir, importPath);

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
    }

    if (fs.existsSync(`${candidate}.ts`)) {
        return `${candidate}.ts`;
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        const indexTs = path.join(candidate, 'index.ts');
        if (fs.existsSync(indexTs)) {
            return indexTs;
        }
    }

    return null;
}

const files = fs
    .readdirSync(aiRoot, { recursive: true })
    .filter((p) => p.endsWith('.ts'))
    .map((p) => path.join(aiRoot, p))
    .sort();

const deps = new Map();
const contents = new Map();

for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    contents.set(filePath, text);

    const depSet = new Set();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        const match = line.match(/^\s*import\s+.*?from\s+["'](.+?)["']/);
        if (!match) continue;

        const importPath = match[1];
        const resolved = resolveImport(path.dirname(filePath), importPath);
        if (!resolved) continue;

        if (path.basename(resolved) === 'Brain.ts') {
            continue;
        }

        depSet.add(resolved);
    }

    deps.set(filePath, depSet);
}

const visited = new Set();
const temp = new Set();
const order = [];

function visit(node) {
    if (temp.has(node)) {
        throw new Error(`Cycle detected in CoreAI dependencies at: ${node}`);
    }
    if (visited.has(node)) return;

    temp.add(node);
    for (const dep of deps.get(node) || []) {
        visit(dep);
    }
    temp.delete(node);
    visited.add(node);
    order.push(node);
}

for (const filePath of files) {
    visit(filePath);
}

const scriptText = fs.readFileSync(scriptPath, 'utf8');
const nl = scriptText.includes('\r\n') ? '\r\n' : '\n';

const parts = [];

for (const filePath of order) {
    const text = contents.get(filePath) || '';
    const lines = text.split(/\r?\n/);
    const filtered = lines.filter((line) => !/^\s*import\s+/.test(line));

    while (filtered.length && /^\s*$/.test(filtered[0])) {
        filtered.shift();
    }

    const outText = filtered.join(nl).trimEnd();
    if (outText) {
        parts.push(outText);
    }
}

const brainBody = parts.join(`${nl}${nl}`);

const start = '//----------- START OF BRAIN';
const end = '//----------- END OF BRAIN';
const pattern = new RegExp(
    `${start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${end.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    )}`
);

if (!pattern.test(scriptText)) {
    throw new Error('Brain section markers not found in __SCRIPT.ts');
}

const replacement = `${start}${nl}${nl}${brainBody}${nl}${nl}${end}`;
const newText = scriptText.replace(pattern, replacement);

fs.writeFileSync(scriptPath, newText, 'utf8');
console.log('Updated brain section in __SCRIPT.ts from src/Core/AI');
