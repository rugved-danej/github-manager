const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

const iconFile = path.join(__dirname, 'icon.png');
const pluginJSON = path.join(__dirname, 'plugin.json');
const distFolder = path.join(__dirname, 'dist');
const json = JSON.parse(fs.readFileSync(pluginJSON, 'utf8'));

// Correctly identify readme and changelog paths
const readmePath = path.join(__dirname, 'readme.md');
const changelogPath = path.join(__dirname, 'changelog.md');

const zip = new jszip();

// Add essential files to the root of the ZIP
zip.file('icon.png', fs.readFileSync(iconFile));
zip.file('plugin.json', fs.readFileSync(pluginJSON));

if (fs.existsSync(readmePath)) {
  zip.file("readme.md", fs.readFileSync(readmePath));
}

if (fs.existsSync(changelogPath)) {
  zip.file("changelog.md", fs.readFileSync(changelogPath));
}

// Function to recursively load files from the dist folder
function loadFile(root, folder) {
  const distFiles = fs.readdirSync(folder);
  distFiles.forEach((file) => {
    const stat = fs.statSync(path.join(folder, file));

    if (stat.isDirectory()) {
      zip.folder(file);
      loadFile(path.join(root, file), path.join(folder, file));
      return;
    }

    if (!/LICENSE.txt/.test(file)) {
      zip.file(path.join(root, file), fs.readFileSync(path.join(folder, file)));
    }
  });
}

// Start loading the bundled code from dist/
loadFile('', distFolder);

zip
  .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
  .pipe(fs.createWriteStream(path.join(__dirname, 'plugin.zip')))
  .on('finish', () => {
    console.log('Plugin plugin.zip written successfully with documentation.');
  });
