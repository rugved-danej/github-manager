const tablerProps = 'viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gh-icon"';

const tablerFolder = `<svg viewBox="0 0 24 24" width="16" height="16" fill="#54aeff" fill-opacity="0.2" stroke="#54aeff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gh-icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2" /></svg>`;
const tablerFile = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /></svg>`;
const tablerFileCode = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M10 13l-2 2l2 2" /><path d="M14 13l2 2l-2 2" /></svg>`;
const tablerFileJson = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M10 13l-1.5 1.5l1.5 1.5" /><path d="M14 13l1.5 1.5l-1.5 1.5" /></svg>`;
const tablerFileText = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M9 9h1" /><path d="M9 13h6" /><path d="M9 17h6" /></svg>`;

const tablerFileJs = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M3 15h3v4.5a1.5 1.5 0 0 1 -3 0" /><path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1" /></svg>`;
const tablerFileTs = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" /><path d="M3.5 15h3" /><path d="M5 15v6" /></svg>`;
const tablerFileJsx = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" /><path d="M4 15h3v4.5a1.5 1.5 0 0 1 -3 0" /><path d="M10 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" /><path d="M16 15l4 6" /><path d="M16 21l4 -6" /></svg>`;
const tablerFileTsx = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M16 15l4 6" /><path d="M16 21l4 -6" /><path d="M10 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75" /><path d="M4.5 15h3" /><path d="M6 15v6" /></svg>`;

const tablerLangJs = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5l16 0" /><path d="M7.5 8h3v8l-2 -1" /><path d="M16.5 8h-2.5a.5 .5 0 0 0 -.5 .5v3a.5 .5 0 0 0 .5 .5h1.423a.5 .5 0 0 1 .495 .57l-.418 2.93l-2 .5" /></svg>`;
const tablerLangTs = `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 17.5c.32 .32 .754 .5 1.207 .5h.543c.69 0 1.25 -.56 1.25 -1.25v-.25a1.5 1.5 0 0 0 -1.5 -1.5a1.5 1.5 0 0 1 -1.5 -1.5v-.25c0 -.69 .56 -1.25 1.25 -1.25h.543c.453 0 .887 .18 1.207 .5" /><path d="M9 12h4" /><path d="M11 12v6" /><path d="M21 19v-14a2 2 0 0 0 -2 -2h-14a2 2 0 0 0 -2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2 -2" /></svg>`;

export const tablerIcons = {
  pin: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4z" /><path d="M9 15l-4.5 4.5" /><path d="M14.5 4l5.5 5.5" /></svg>`,
  download: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>`,
  pull: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M18 13l-6 6" /><path d="M6 13l6 6" /></svg>`,
  rocket: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3" /><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3" /><path d="M15 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>`,
  copy: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" /><path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" /></svg>`,
  trash: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>`,
  star: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" /></svg>`,
  circle: `<svg ${tablerProps}><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /></svg>`
};

const colorMap = {
  js: '#f1e05a', ts: '#3178c6', jsx: '#61dafb', tsx: '#3178c6',
  py: '#3572A5', html: '#e34c26', css: '#563d7c', json: '#8b949e', 
  md: '#58a6ff', vue: '#41b883', java: '#b07219', c: '#555555', cpp: '#f34b7d'
};

export function getFileIcon(filename, isDir = false) {
  if (isDir) return tablerFolder;
  
  const ext = filename.split('.').pop().toLowerCase();
  const color = colorMap[ext] || '#8b949e';
  
  let svgTemplate = tablerFile; 
  
  if (ext === 'js') {
    svgTemplate = tablerFileJs;
  } else if (ext === 'jsx') {
    svgTemplate = tablerFileJsx;
  } else if (ext === 'ts') {
    svgTemplate = tablerFileTs;
  } else if (ext === 'tsx') {
    svgTemplate = tablerFileTsx;
  } else if (['py', 'html', 'css', 'vue', 'java', 'c', 'cpp'].includes(ext)) {
    svgTemplate = tablerFileCode;
  } else if (ext === 'json') {
    svgTemplate = tablerFileJson;
  } else if (ext === 'md' || ext === 'txt') {
    svgTemplate = tablerFileText;
  }
  
  return svgTemplate.replace('stroke="currentColor"', `stroke="${color}"`);
}

export function getRepoLanguageIcon(language) {
  if (!language) return tablerIcons.circle;
  
  const langLower = language.toLowerCase();
  let svgTemplate = tablerIcons.circle; 
  
  if (langLower === 'javascript') {
    svgTemplate = tablerLangJs;
  } else if (langLower === 'typescript') {
    svgTemplate = tablerLangTs;
  }

  const extMap = { javascript: 'js', typescript: 'ts', python: 'py', html: 'html', css: 'css', vue: 'vue', java: 'java', c: 'c', 'c++': 'cpp' };
  const ext = extMap[langLower] || langLower;
  const color = colorMap[ext] || '#8b949e';

  return svgTemplate.replace('stroke="currentColor"', `stroke="${color}"`);
}
