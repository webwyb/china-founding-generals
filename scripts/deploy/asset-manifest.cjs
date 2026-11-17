const { createHash } = require('node:crypto')
const { readdirSync, readFileSync } = require('node:fs')
const { join, basename } = require('node:path')

function files(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = prefix + entry.name
    return entry.isDirectory() ? files(join(directory, entry.name), relative + '/') : [relative]
  }).sort()
}

function manifest(directory, base) {
  if (!base) return []
  const url = new URL(base)
  if (url.protocol !== 'https:' || url.search || url.hash || url.username || url.password) throw Error('Asset base must be an HTTPS URL without credentials or query')
  base = base.replace(/\/+$/, '')
  return files(directory).map(path => {
    const content = readFileSync(join(directory, path))
    const sha256 = createHash('sha256').update(content).digest('hex')
    const key = `${sha256}/${basename(path)}`
    return { path, sha256, key, size: content.length, url: `${base}/${key}` }
  })
}

module.exports = { files, manifest }
