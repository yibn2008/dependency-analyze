'use strict'

const debug = require('debug')('dependency-analyze:css')

const AT_IMPORT_RULE = /@import\s+(((\s*,\s*)?(['"])([^'"]+?)\4)+)/mg
const IMPORT_FILE_RULE = /(['"])([^'"]+?)\1/mg

function findComments (text) {
  let ranges = []
  let ruleMap = {
    '//': '\n',
    '/*': '*/'
  }
  let startRule = /\/\/|\/\*/g
  let matches

  while (matches = startRule.exec(text)) { // eslint-disable-line
    let endChars = ruleMap[matches[0]]
    let start = startRule.lastIndex - matches[0].length
    let end = text.indexOf(endChars, startRule.lastIndex)

    if (end < 0) {
      end = Infinity
    }

    ranges.push([ start, end ])

    startRule.lastIndex = end
  }

  return ranges
}

function inCommentRanges (index, ranges) {
  return ranges.find(r => {
    return index >= r[0] && index < r[1]
  })
}

function fetchFiles (value) {
  let rule = IMPORT_FILE_RULE
  let files = []
  let matches

  rule.lastIndex = 0

  while (matches = (rule.exec(value))) {  // eslint-disable-line
    files.push(JSON.parse('"' + matches[2] + '"'))
  }

  return files
}

function parse (content) {
  let commentRanges = findComments(content)
  let deps = []
  let rule = AT_IMPORT_RULE
  let matches

  rule.lastIndex = 0

  while (matches = (rule.exec(content))) {  // eslint-disable-line
    let startIndex = rule.lastIndex - matches[0].length

    // skip comments
    if (inCommentRanges(startIndex, commentRanges)) {
      debug('skip comment for %s', matches[0])
      continue
    }

    let files = fetchFiles(matches[1])
    files.forEach(file => {
      if (deps.indexOf(file) < 0) {
        deps.push(file)
      }
    })
  }

  return deps
}

module.exports = parse
