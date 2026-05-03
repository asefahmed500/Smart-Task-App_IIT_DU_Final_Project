const fs = require('fs');
const path = require('path');

const mappings = {
  '@/lib/admin-actions': '@/actions/admin-actions',
  '@/lib/auth-actions': '@/actions/auth-actions',
  '@/lib/automation-actions': '@/actions/automation-actions',
  '@/lib/board-actions': '@/actions/board-actions',
  '@/lib/dashboard-actions': '@/actions/dashboard-actions',
  '@/lib/manager-actions': '@/actions/manager-actions',
  '@/lib/member-actions': '@/actions/member-actions',
  '@/lib/notification-actions': '@/actions/notification-actions',
  '@/lib/task-actions': '@/actions/task-actions',
  '@/lib/automation-utils': '@/utils/automation-utils',
  '@/lib/notification-utils': '@/utils/notification-utils',
  '@/lib/socket-emitter': '@/utils/socket-emitter',
  '@/lib/mail': '@/utils/mail',
  '@/lib/utils': '@/utils/utils',
};

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const rootDir = process.cwd();
const ignoreDirs = ['node_modules', '.next', '.git', 'generated'];

walkDir(rootDir, (filePath) => {
  if (ignoreDirs.some(dir => filePath.includes(path.sep + dir + path.sep) || filePath.endsWith(path.sep + dir))) return;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.mjs')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  for (const [oldPath, newPath] of Object.entries(mappings)) {
    // Match from '@/lib/...'
    const regex = new RegExp(`from\\s+['"]${oldPath}['"]`, 'g');
    content = content.replace(regex, `from '${newPath}'`);
    
    // Match import('@/lib/...')
    const dynamicRegex = new RegExp(`import\\(['"]${oldPath}['"]\\)`, 'g');
    content = content.replace(dynamicRegex, `import('${newPath}')`);
  }

  if (content !== originalContent) {
    console.log(`Updated imports in: ${path.relative(rootDir, filePath)}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
