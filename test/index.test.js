'use strict'

const path = require('path')
const assert = require('assert-plus')
const analyze = require('..')

function simplify (result, basedir) {
  let simple = {}

  for (let file in result) {
    let value = result[file]
    let name = path.relative(basedir, file)

    simple[name] = {
      modules: value.modules.slice(),
      relatives: value.relatives.map(item => path.relative(basedir, item))
    }
  }

  return simple
}

describe('parse test', function () {
  it('should parse javascript', function () {
    let content = `
'use strict'

import './aaa.scss'

const xxx = require('bbb')

require.resolve('../ccc.js')

const tpl = () => (
  <ReactNode></ReactNode>
)
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

    // parse with matches (single rule)
    parsed = analyze.parse(normal, 'js/index.*')

    assert.deepEqual(parsed, {
      'js/index.js': expect['js/index.js']
    })

    // parse with matches (multiple rule)
    parsed = analyze.parse(normal, [
      'js/index.*',
      'css/index.*'
    ])

    assert.deepEqual(parsed, {
      'js/index.js': expect['js/index.js'],
      'css/index.scss': expect['css/index.scss']
    })
  })

  it('should analyze standard dependency file', function () {
    let basedir = path.join(__dirname, 'fixtures/analyze')
    let entry = path.join(basedir, 'index.js')
    let result

    // analyze with default option
    result = analyze.analyze(entry)
    assert.deepEqual(simplify(result, basedir), {
      "index.js": {
        "modules": [
          "react",
          "react-dom",
          "@alife/next",
          "@alife/xxx"
        ],
        "relatives": [
          "lib/a.js",
          "lib/b.jsx",
          "lib/c.js",
          "lib/d.jsx",
          "lib/a.scss",
          "lib/x.json"
        ]
      },
      "lib/a.js": {
        "modules": [],
        "relatives": []
      },
      "lib/b.jsx": {
        "modules": [],
        "relatives": []
      },
      "lib/c.js": {
        "modules": [],
        "relatives": [
          "lib/d.jsx"
        ]
      },
      "lib/d.jsx": {
        "modules": [],
        "relatives": []
      },
      "lib/x.json": {
        "modules": [],
        "relatives": []
      },
      "lib/a.scss": {
        "modules": [
          "@alife/mext"
        ],
        "relatives": [
          "lib/_b.scss"
        ]
      },
      "lib/_b.scss": {
        "modules": [],
        "relatives": [
          "lib/c.css",
          "lib/d.css"
        ]
      },
      "lib/c.css": {
        "modules": [],
        "relatives": []
      },
      "lib/d.css": {
        "modules": [],
        "relatives": []
      }
    })

    // analyze with options:
    // - depth = 1
    // - filter = all js/jsx
    result = analyze.analyze(entry, {
      depth: 1,
      filter (dep, currFile) {
        return !dep.match(/\.(css|scss)$/)
      }
    })
    assert.deepEqual(simplify(result, basedir), {
      "index.js": {
        "modules": [
          "react",
          "react-dom",
          "@alife/xxx"
        ],
        "relatives": [
          "lib/a.js",
          "lib/b.jsx",
          "lib/c.js",
          "lib/d.jsx",
          "lib/x.json"
        ]
      }
    })
  })

  it('should analyze with custom resolve', function () {
    let basedir = path.join(__dirname, 'fixtures/analyze')
    let entry = path.join(basedir, 'custom-resolve.js')

    let result = analyze.analyze({
      file: entry,
      content: `
import "@alife/next";
import "{custom-prefix}/lib/a";
import "./lib/b";
`
    }, {
      depth: 1,
      depResolve (dep, currFile, defaultResolve) {
        if (dep.indexOf('{') >= 0) {
          dep = dep.replace('{custom-prefix}', '.')
        }

        return defaultResolve(dep, currFile)
      }
    })

    assert.deepEqual(simplify(result, basedir), {
      "custom-resolve.js": {
        "modules": [
          "@alife/next"
        ],
        "relatives": [
          "lib/a.js",
          "lib/b.jsx"
        ]
      }
    })
  })

  it('should throw error when resolve failed', function () {
    let basedir = path.join(__dirname, 'fixtures/analyze')
    let entry = path.join(basedir, 'error-resolve.js')

    assert.throws(function () {
      analyze.analyze({
        file: entry,
        content: `
import "./non-exists";
`
      })
    }, /can not resolve .+? from .+?/i)
  })
})
