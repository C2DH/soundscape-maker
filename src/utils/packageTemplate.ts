import appTemplate from '../../package/src/App.jsx?raw'
import indexTemplate from '../../package/index.html?raw'
import packageReadmeTemplate from '../../package/README.md?raw'
import packageJsonTemplate from '../../package/package.json?raw'
import mainTemplate from '../../package/src/main.jsx?raw'
import stylesTemplate from '../../package/src/styles.css?raw'
import viteConfigTemplate from '../../package/vite.config.js?raw'

export interface TemplateTokenMap {
  __SOUNDSCAPE_AUDIO__: string
  __SOUNDSCAPE_DATA__: string
  __SOUNDSCAPE_METADATA__: string
}

export interface PackageTemplateFile {
  path: string
  content: string
}

export function getPackageTemplateFiles(
  tokens: TemplateTokenMap,
): PackageTemplateFile[] {
  return [
    { path: 'README.md', content: packageReadmeTemplate },
    { path: 'index.html', content: indexTemplate },
    { path: 'package.json', content: packageJsonTemplate },
    { path: 'vite.config.js', content: viteConfigTemplate },
    { path: 'src/main.jsx', content: mainTemplate },
    { path: 'src/styles.css', content: stylesTemplate },
    {
      path: 'src/App.jsx',
      content: replaceTemplateTokens(appTemplate, tokens),
    },
  ]
}

function replaceTemplateTokens(content: string, tokens: TemplateTokenMap) {
  return content
    .replaceAll('__SOUNDSCAPE_AUDIO__', tokens.__SOUNDSCAPE_AUDIO__)
    .replaceAll('__SOUNDSCAPE_DATA__', tokens.__SOUNDSCAPE_DATA__)
    .replaceAll('__SOUNDSCAPE_METADATA__', tokens.__SOUNDSCAPE_METADATA__)
}
