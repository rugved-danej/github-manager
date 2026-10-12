export function createLucideIcon(paths: string, size = 16, extraAttrs = ''): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gh-icon" ${extraAttrs}>${paths}</svg>`;
}

const lucideFolder =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="#54aeff" fill-opacity="0.2" stroke="#54aeff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="gh-icon"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';

export const lucideIcons: Record<string, string> = {
  pin: createLucideIcon('<line x1="12" x2="12" y1="17" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>'),
  download: createLucideIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'),
  pull: createLucideIcon('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>'),
  rocket: createLucideIcon('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>'),
  copy: createLucideIcon('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  trash: createLucideIcon('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'),
  star: createLucideIcon('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>'),
  circle: createLucideIcon('<circle cx="12" cy="12" r="10"/>'),
  search: createLucideIcon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  branch: createLucideIcon('<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>'),
  lock: createLucideIcon('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
  globe: createLucideIcon('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
  plus: createLucideIcon('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  refresh: createLucideIcon('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  folderOpen: createLucideIcon('<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>'),
  code: createLucideIcon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  logout: createLucideIcon('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>'),
  github: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" class="gh-icon"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
  edit: createLucideIcon('<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>'),
  gitMerge: createLucideIcon('<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>'),
  back: createLucideIcon('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  check: createLucideIcon('<path d="M20 6 9 17l-5-5"/>'),
  org: createLucideIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  user: createLucideIcon('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  userPlus: createLucideIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
  chevronDown: createLucideIcon('<path d="m6 9 6 6 6-6"/>'),
  building: createLucideIcon('<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'),
  eye: createLucideIcon('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
  image: createLucideIcon('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'),
  externalLink: createLucideIcon('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  x: createLucideIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  file: createLucideIcon('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>'),
  fileCode: createLucideIcon('<path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>'),
  fileImage: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><circle cx="10" cy="12" r="1.5"/><path d="m18 18-4-4-5 5"/>'),
  fileText: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
  fileJson: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1"/><path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"/>'),
  fileArchive: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><circle cx="10" cy="14" r="1"/><path d="M10 10v1"/><path d="M10 6v1"/>'),
  fileAudio: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M9 18V9l6-2v9"/><circle cx="9" cy="18" r="2"/><circle cx="15" cy="16" r="2"/>'),
  fileVideo: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polygon points="10 11 15 14 10 17 10 11"/>'),
  fileLock: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><rect width="8" height="5" x="8" y="13" rx="1"/><path d="M10 13v-2a2 2 0 1 1 4 0v2"/>'),
  fileDatabase: createLucideIcon('<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><ellipse cx="12" cy="12" rx="4" ry="2"/><path d="M8 12v3c0 1.1 1.8 2 4 2s4-.9 4-2v-3"/>')
};

export const tablerIcons = lucideIcons;

export function getIcon(name: string, size = 16): string {
  if (lucideIcons[name]) {
    if (size === 16) return lucideIcons[name];
    return lucideIcons[name]
      .replace(/width="[0-9]+"/, `width="${size}"`)
      .replace(/height="[0-9]+"/, `height="${size}"`);
  }
  return lucideIcons.file;
}

export function isImageFile(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|ico|bmp|avif|tiff|psd|ai)$/i.test(filename);
}

export function getImageMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'svg': return 'image/svg+xml';
    case 'ico': return 'image/x-icon';
    case 'bmp': return 'image/bmp';
    case 'avif': return 'image/avif';
    case 'tiff': return 'image/tiff';
    default: return 'image/png';
  }
}

// Generate deterministic vibrant color for any language string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

// Official GitHub Linguist language colors
const languageColorMap: Record<string, string> = {
  javascript: '#f1e05a',
  js: '#f1e05a',
  typescript: '#3178c6',
  ts: '#3178c6',
  jsx: '#61dafb',
  tsx: '#3178c6',
  python: '#3572A5',
  py: '#3572A5',
  java: '#b07219',
  c: '#555555',
  'c++': '#f34b7d',
  cpp: '#f34b7d',
  'c#': '#178600',
  csharp: '#178600',
  cs: '#178600',
  php: '#4f5d95',
  go: '#00add8',
  golang: '#00add8',
  rust: '#dea584',
  rs: '#dea584',
  ruby: '#701516',
  rb: '#701516',
  swift: '#f05138',
  kotlin: '#a97bff',
  kt: '#a97bff',
  dart: '#00b4ab',
  shell: '#89e051',
  bash: '#89e051',
  sh: '#89e051',
  powershell: '#012456',
  ps1: '#012456',
  html: '#e34c26',
  css: '#563d7c',
  scss: '#c6538c',
  sass: '#c6538c',
  less: '#1d365d',
  vue: '#41b883',
  svelte: '#ff3e00',
  lua: '#000080',
  r: '#198ce7',
  scala: '#c22d40',
  haskell: '#5e5086',
  hs: '#5e5086',
  elixir: '#6e4a7e',
  ex: '#6e4a7e',
  clojure: '#db5855',
  clj: '#db5855',
  zig: '#ec915c',
  nim: '#ffc200',
  julia: '#a270ba',
  jl: '#a270ba',
  solidity: '#aa6746',
  sol: '#aa6746',
  assembly: '#6E4C13',
  asm: '#6E4C13',
  erlang: '#B83998',
  perl: '#0298c3',
  pl: '#0298c3',
  sql: '#e38c00',
  markdown: '#083fa1',
  md: '#58a6ff',
  json: '#cbcb41',
  yaml: '#cb171e',
  yml: '#cb171e',
  toml: '#9c4221',
  dockerfile: '#384d54',
  makefile: '#427819',
  tex: '#3D6117',
  latex: '#3D6117',
  matlab: '#e16737',
  fortran: '#4d41b1',
  v: '#4f87c4',
  groovy: '#4298b8',
  coffeescript: '#244776',
  d: '#ba595e',
  graphql: '#e10098',
  prisma: '#0c344b',
  vim: '#199f4b',
  'vim script': '#199f4b',
  ocaml: '#ef7a08',
  'f#': '#b845fc',
  fsharp: '#b845fc',
  xml: '#e65100',
  svg: '#ffb224',
  ini: '#eab308'
};

export function getLanguageColor(language: string | null): string {
  if (!language) return '#8b949e';
  const key = language.toLowerCase().trim();
  return languageColorMap[key] || stringToColor(key);
}

export function renderLanguageBadge(language: string | null): string {
  if (!language) {
    return `<span class="gh-lang"><span class="gh-lang-dot" style="background-color: #8b949e;"></span><span>Plain Text</span></span>`;
  }
  const color = getLanguageColor(language);
  return `<span class="gh-lang"><span class="gh-lang-dot" style="background-color: ${color};"></span><span>${language}</span></span>`;
}

export function getFileIcon(filename: string, isDir = false): string {
  if (isDir) return lucideFolder;

  const lowerName = filename.toLowerCase();
  const ext = lowerName.includes('.') ? lowerName.split('.').pop() || '' : '';

  // Special full filenames
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) {
    return lucideIcons.fileCode.replace('stroke="currentColor"', 'stroke="#388bfd"');
  }
  if (lowerName === '.gitignore' || lowerName === '.gitattributes' || lowerName === '.gitmodules') {
    return lucideIcons.branch.replace('stroke="currentColor"', 'stroke="#f05032"');
  }
  if (lowerName === 'license' || lowerName.startsWith('license.')) {
    return lucideIcons.fileText.replace('stroke="currentColor"', 'stroke="#e3b341"');
  }
  if (lowerName.includes('package.json') || lowerName.includes('tsconfig.json')) {
    return lucideIcons.fileJson.replace('stroke="currentColor"', 'stroke="#3178c6"');
  }
  if (lowerName === 'makefile' || lowerName === 'cmakelists.txt') {
    return lucideIcons.fileCode.replace('stroke="currentColor"', 'stroke="#427819"');
  }

  const color = getLanguageColor(ext);

  // Category determination
  if (isImageFile(filename)) {
    return lucideIcons.fileImage.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return lucideIcons.fileAudio.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'wmv', 'flv'].includes(ext)) {
    return lucideIcons.fileVideo.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz', 'apk', 'jar'].includes(ext)) {
    return lucideIcons.fileArchive.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['lock', 'key', 'pem', 'crt', 'cer', 'pub'].includes(ext) || lowerName.includes('lock')) {
    return lucideIcons.fileLock.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['db', 'sqlite', 'sqlite3', 'sql'].includes(ext)) {
    return lucideIcons.fileDatabase.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['json', 'json5', 'jsonc'].includes(ext)) {
    return lucideIcons.fileJson.replace('stroke="currentColor"', `stroke="${color}"`);
  }
  if (['md', 'markdown', 'txt', 'log', 'rtf', 'pdf', 'doc', 'docx', 'tex', 'latex'].includes(ext)) {
    return lucideIcons.fileText.replace('stroke="currentColor"', `stroke="${color}"`);
  }

  // All code files
  return lucideIcons.fileCode.replace('stroke="currentColor"', `stroke="${color}"`);
}

// Backward-compatible alias for existing imports
export function getRepoLanguageIcon(language: string | null): string {
  const color = getLanguageColor(language);
  return `<span class="gh-lang-dot" style="background-color: ${color};"></span>`;
}
