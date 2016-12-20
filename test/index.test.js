'use strict'

const path = require('path')
const assert = require('assert-plus')
const analyze = require('..')

describe('parse test', function () {
  it('should parse javascript', function () {
    let content = `
'use strict'

import './aaa.scss'

const xxx = require('bbb')

require.resolve('../ccc.js')
`

    let deps = analyze.parseJS(content)
    assert.deepEqual(deps, [
      './aaa.scss',
      'bbb',
      '../ccc.js'
    ])
  })

  it('should parse css', function () {
    let content = `
@import "aaa.scss", "bbb.scss", 'ccc.scss';

@import "./ddd.scss";

// @import "./eee.scss";

/* @import "./fff.scss" */
`
    let deps = analyze.parseCSS(content)
    assert.deepEqual(deps, [
      'aaa.scss',
      'bbb.scss',
      'ccc.scss',
      './ddd.scss'
    ])
  })

  it('should parse file', function () {
    // js
    let jsFile = path.join(__dirname, 'fixtures/normal/js/index.js')
    let deps = analyze.parse(jsFile)

    assert.deepEqual(deps, [
      'path',
      'fs',
      '@alife/test',
      './b',
      'test-import'
    ])

    // css
    let cssFile = path.join(__dirname, 'fixtures/normal/css/index.scss')
    deps = analyze.parse(cssFile)

    assert.deepEqual(deps, [
      '~normalize.css',
      './a.scss',
      'b.scss',
      'c.scss'
    ])

    // other
    let otherFile = path.join(__dirname, 'fixtures/normal/package.json')
    assert(!analyze.parse(otherFile))
  })

  it('should parse dir', function () {
    let normal = path.join(__dirname, 'fixtures/normal')
    let parsed = analyze.parse(normal)
    let expect = {
      'js/index.js': [
        'path',
        'fs',
        '@alife/test',
        './b',
        'test-import'
      ],
      'js/b.js': [
        './subdir/c'
      ],
      'js/subdir/c.js': [
        'jquery'
      ],
      'css/index.scss': [
        '~normalize.css',
        './a.scss',
        'b.scss',
        'c.scss'
      ],
      'css/a.scss': [
        'aaa'
      ]
    }

    assert.deepEqual(parsed, expect)

    // parse with matches
    parsed = analyze.parse(normal, [
      'js/index.js'
    ])

    assert.deepEqual(parsed, {
      'js/index.js': expect['js/index.js']
    })
  })
})
