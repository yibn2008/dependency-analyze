'use strict'

const fs = require('fs')
const path = require('path')
const debug = require('debug')('dependency-analyze')
const Minimatch = require('minimatch').Minimatch
const parser = {
  js: require('./parser/javascript'),
  css: require('./parser/css')
}

const EXTENSIONS_MAP = {
  js: ['.js', '.jsx'],
  jsx: ['.js', '.jsx'],
  css: ['.css'],
  scss: ['.scss', '.sass', '.css'],
  sass: ['.scss', '.sass', '.css'],
  less: ['.less', '.css']
}

const FILE_TYPE_MAP = {
  css: ['.css', '.scss', '.sass', '.less'],
  js: ['.js', '.jsx']
}

class ResolveError extends Error {
  constructor (dep, file) {
    super(`Can not resolve "${dep}" from ${file}`)
  }
}

function extname (file) {
  let ext = path.extname(file)

  return ext ? ext.substring(1) : ''
}

function fileResolve (name, currFile) {
  let basedir = path.dirname(currFile)
  let file = path.normalize(path.join(basedir, name))
  let tryList = [ file ]

  if (currFile.match(/\.(scss|sass)$/)) {
    tryList.push(path.join(path.dirname(file), '_' + path.basename(file)))
  }

  let exts = EXTENSIONS_MAP[extname(currFile)]
  if (exts) {
    let extsFiles = []

    tryList.forEach(item => {
      let ext = path.extname(item)

      // if ext is not exists in `exts`, then add all ext in `exts`
      if (exts.indexOf(ext) < 0) {
        exts.forEach(t => {
          extsFiles.push(item + t)
        })
      }
    })

    tryList = tryList.concat(extsFiles)
  }

  file = tryList.find(item => fs.existsSync(item))

  return file
}

function defaultDepResolve (dep, currFile) {
  let currType = getParseType(currFile)

  if (currType === 'css') {
    if (dep.startsWith('~')) {
      dep = dep.substring(1)
    } else if (!dep.startsWith('.')) {
      dep = './' + dep
    }
  }

  // remove lead ~ if it exists
  if (dep.startsWith('~')) {
    dep = dep.substring(1)
  }

  return dep
}

/**
 * get dependency info
 * @param  {String} dep  dependency
 * @param  {String} currFile current file
 * @param  {Function} customDepResolve custom dep resolve function
 * @return {Object}
 */
function getDepInfo (dep, currFile, customDepResolve) {
  let depResolve

  if (!customDepResolve) {
    depResolve = defaultDepResolve
  } else {
    depResolve = (dep, currFile) => {
      // parse defaultResolve as third param
      return customDepResolve(dep, currFile, defaultDepResolve)
    }
  }

  let currType = getParseType(currFile)
  let type = getParseType(dep) || currType
  let info = {
    parent: currFile,     // parent file path
    type: type,           // current file type (js/css)
    raw: dep,             // raw dependency name (require('./xxx') => './xxx')
    name: null,           // formated dependency name ('~@alife/xxx' => '@alife/xxx')
    module: null,         // module name (only external module)
    file: null            // resolved file name (only relative file)
  }

  info.name = depResolve(dep, currFile)

  if (!info.name.startsWith('.')) {
    if (info.name.startsWith('@')) {
      info.module = info.name.split('/', 2).join('/')
    } else {
      info.module = info.name.split('/', 1)[0]
    }
  } else {
    info.file = fileResolve(info.name, currFile)

    if (!info.file) {
      throw new ResolveError(info.name, currFile)
    }
  }

  return info
}

/**
 * recursively analyze single file
 * @param  {String} file      file path
 * @param  {String} content   file content
 * @param  {Function} filter  filter function
 * @param  {Function} depResolve resolve dep to normal dep format
 * @param  {Number} depth     max analyze depth
 * @param  {Object} result    the analyed result
 * @return {Object}
 */
function analyzeFile (file, content, filter, depResolve, depth, result) {
  depth = typeof depth === 'number' ? depth : Infinity
  result = result || {}

  if (depth < 1) {
    return
  }

  if (file in result) {
    return
  }

  debug('analyze file: file = %s, depth = %s', file, depth)

  let deps = parseFile(file, content) || []
  let item = result[file] = {
    deps: [],
    relatives: [],
    modules: []
  }

  // filter deps
  if (filter) {
    deps = deps.filter(dep => filter(dep, file))
  }

  // convert
  deps.forEach(dep => {
    let info = getDepInfo(dep, file, depResolve)

    item.deps.push(info)

    if (info.module && item.modules.indexOf(info.module) < 0) {
      item.modules.push(info.module)
    } else if (info.file && item.relatives.indexOf(info.file) < 0) {
      item.relatives.push(info.file)

      // deep first traversing
      analyzeFile(info.file, fs.readFileSync(info.file, 'utf8'), filter, depResolve, depth - 1, result)
    }
  })

  return result
}

/**
 * analyze dependencies of a file
 *
 * ```
 * return {
 *   <file>: {
 *     deps: [{               // all deps
 *       parent: currFile,    // parent file path
 *       type: type,          // current file type (js/css)
 *       raw: dep,            // raw dependency name (require('./xxx') => './xxx')
 *       name: null,          // formated dependency name ('~@alife/xxx' => '@alife/xxx')
 *       module: null,        // module name (only external module)
 *       file: null,          // resolved file name (only relative file)
 *     }, ...],
 *     relatives: [ ... ],    // relative deps' absolute path
 *     modules: [ ... ],      // all external modules name
 *   },
 *   ...
 * }
 * ```
 *
 * @param  {Mixed} file - file path
 *  - {String} file path
 *  - {Object} file path and content
 *    - file: {String} file path
 *    - content: {String} file content
 * @param  {Object} options analyze options
 *  - filter: {Function} filter deps, will be invoked with `filter(dep, currFile)`
 *  - resolve: {Function} custom resolve for relative file, will be invoked with `resolve(dep, currFile, defaultResolve)`
 *  - depth: {Number} set max depth to analyze (default is Infinity)
 * @return {Object}
 */
function analyze (file, options) {
  options = options || {}

  let content

  // normalize file
  if (typeof file === 'string') {
    content = fs.readFileSync(file, 'utf8')
  } else {
    content = file.content
    file = file.file
  }

  let filter = options.filter
  let depResolve = options.depResolve
  let depth = options.depth

  return analyzeFile(file, content, filter, depResolve, depth)
}

/**
 * get parser type of file
 * @param  {String} file
 * @return {String}
 */
function getParseType (file) {
  let ext = path.extname(file)

  for (let type in FILE_TYPE_MAP) {
    let exts = FILE_TYPE_MAP[type]

    if (exts.indexOf(ext) >= 0) {
      return type
    }
  }
}

/**
 * parse file
 * @param  {String} file - file path
 * @param  {String} content - file content (optional)
 * @return {Array} all deps
 */
function parseFile (file, content) {
  let type = getParseType(file)

  debug('parse file: file = %s, parseType = %s', file, type)

  if (type in parser) {
    if (typeof content !== 'string') {
      content = fs.readFileSync(file, 'utf8')
    }

    return parser[type](content)
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
  parseCSS: parser.css,
  analyze
}
