'use strict'

const fs = require('fs')
const path = require('path')
const debug = require('debug')('dependency-analyze')
const Minimatch = require('minimatch').Minimatch
const parser = {
  js: require('./parser/javascript'),
  css: require('./parser/css')
}

// function * analyze () {
//   //
// }

function parseFile (file) {
  let p

  debug('parse file: file = %s', file)

  switch (path.extname(file)) {
    case '.js':
    case '.jsx':
    case '.es6':
    case '.es5':
    case '.es':
      p = parser.js
      break
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      p = parser.css
      break
  }

  if (p) {
    return p(fs.readFileSync(file, 'utf8'))
  }
}

function isMatch (entry, rules) {
  if (!rules.length) {
    return true
  } else {
    return !!rules.find(r => {
      return r.match(entry)
    })
  }
}

function getAllFiles (dir, all) {
  all = all || []

  fs.readdirSync(dir).forEach(file => {
    if (file[0] === '.') {
      return
    }

    let filepath = path.join(dir, file)
    let stat = fs.statSync(filepath)

    if (stat.isDirectory()) {
      getAllFiles(filepath, all)
    } else {
      all.push(filepath)
    }
  })

  return all
}

function parseDir (baseDir, rules) {
  debug('parse dir: baseDir = %s', baseDir)

  let files = getAllFiles(baseDir)
  let parsed = {}

  // filter files
  for (let i = files.length - 1; i >= 0; i--) {
    let entryFile = path.relative(baseDir, files[i])

    if (isMatch(entryFile, rules)) {
      let deps = parseFile(files[i])
      if (deps) {
        parsed[entryFile] = deps
      }
    }
  }

  return parsed
}

function parse (file, matches) {
  let stat = fs.statSync(file)
  let rules = []

  if (!matches) {
    matches = []
  } else if (typeof matches === 'string') {
    matches = [ matches ]
  }

  matches.forEach(m => {
    rules.push(new Minimatch(m))
  })

  if (stat.isDirectory()) {
    return parseDir(file, rules)
  } else {
    return parseFile(file)
  }
}

module.exports = {
  parse,
  parseJS: parser.js,
  parseCSS: parser.css
  // analyze
}
