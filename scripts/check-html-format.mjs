import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import beautify from 'js-beautify';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoots = ['apps', 'libs'].map(directory => path.join(projectRoot, directory));
const config = JSON.parse(await readFile(path.join(projectRoot, '.jsbeautifyrc'), 'utf8'));

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findHtmlFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    }),
  );

  return files.flat();
}

const unformattedFiles = [];

for (const file of (await Promise.all(sourceRoots.map(findHtmlFiles))).flat()) {
  const source = await readFile(file, 'utf8');

  if (beautify.html(source, config.html) !== source) {
    unformattedFiles.push(path.relative(projectRoot, file));
  }
}

if (unformattedFiles.length > 0) {
  console.error('HTML formatting issues found in:');
  console.error(unformattedFiles.map(file => `  ${file}`).join('\n'));
  console.error('Run `npm run format:html` to fix them.');
  process.exitCode = 1;
} else {
  console.log('All HTML files use js-beautify code style.');
}
