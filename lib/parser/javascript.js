'use strict'

const debug = require('debug')('dependency-analyze:js')
const t = require('babel-types')
const babylon = require('babylon')
const traverse = require('babel-traverse').default

function isResolve (node) {
  if (!t.isMemberExpression(node)) {
    return false
  }

  return t.isIdentifier(node.object, { name: 'require' }) &&
    t.isIdentifier(node.property, { name: 'resolve' })
}

function addDeps (dep, deps) {
  if (deps.indexOf(dep) < 0) {
    deps.push(dep)
  }
}

function parse (content) {
  let ast = babylon.parse(content, {
    sourceType: 'module'
  })
  let deps = []

  traverse(ast, {
    ImportDeclaration (path, state) {
      let source = path.get('source')

      if (t.isStringLiteral(source)) {
        debug('parse import: %s', source.node.value)

        addDeps(source.node.value, deps)
      }
    },
    CallExpression (path, state) {
      let callee = path.get('callee')

      let isRequire = t.isIdentifier(callee.node, {
        name: 'require'
      })

      if (!isRequire && !isResolve(callee.node)) {
        return
      }

      let args = path.get('arguments')

      if (args && args.length === 0) {
        return
      }

      if (t.isStringLiteral(args[0])) {
        debug('parse require: %s', args[0].node.value)

        addDeps(args[0].node.value, deps)
        return
      }
    }
  })

  return deps
}

module.exports = parse
