module.exports = {
  appId: 'com.personal.notepad',
  productName: 'Kişisel Notlarım',
  directories: {
    output: 'dist-installer',
  },
  files: [
    'out/**/*',
    'assets/**/*',
    'node_modules/**/*',
    'package.json',
  ],
  extraResources: [
    { from: 'assets/images', to: 'images', filter: ['**/*'] },
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'assets/icon.png',
    requestedExecutionLevel: 'asInvoker',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Kişisel Notlarım',
  },
  asar: true,
  asarUnpack: ['**/better-sqlite3/**'],
};
