# dependency-analyze

js/css code dependency analyze.

## Usage

### Parse file/dir

Parse javascript/css code:

```js
const analyze = require('dependency-analyze')

let jsCode = `
import './aaa.scss'

const xxx = require('bbb')

require.resolve('../ccc.js')
`

// result: [
//   './aaa.scss',
//   'bbb',
//   '../css.js'
// ]
analyze.parseJS(jsCode)

let cssCode = `
@import "aaa.scss", "bbb.scss", 'ccc.scss';

@import "./ddd.scss";

// @import "./eee.scss";

/* @import "./fff.scss" */
`

// result: [
//   'aaa.scss',
//   'bbb.scss',
//   'ccc.scss',
//   './ddd.scss'
// ]
analyze.parseCSS(cssCode)
```

Parse js/css file:

```js
const analyze = require('dependency-analyze')

// result: [
//   'dep1',
//   'dep2',
//   ...
// ]
analyze.parse('path/to/some/js/file.js')
```

Parse a directory:

```js
const analyze = require('dependency-analyze')

// result: {
//   'file.js': [
//     'dep1',
//     'dep2',
//     ...
//   ],
//   'file.css': [
//     'dep1.css',
//     'dep2.css',
//     ...
//   ],
//   ...
// }
analyze.parse('path/to/some/dir')
```

### Analyze file

analyze dependencies from content

```js
const analyze = require('dependency-analyze')

// result: {
//   '/path/to/mock/file.js', {
//     deps: [{
//       parent: '/path/to/mock/file.js',
//       raw: 'react',
//       name: 'react',
//       module: 'react',
//       file: null
//     }, {
//       parent: '/path/to/mock/file.js',
//       raw: 'react-dom',
//       name: 'react-dom',
//       module: 'react-dom',
//       file: null
//     }, {
//       parent: '/path/to/mock/file.js',
//       raw: './src/index.jsx',
//       name: './src/index.jsx',
//       module: null,
//       file: '/path/to/mock/src/index.jsx'
//     }],
//     modules: [
//       'react',
//       'react-dom'
//     ],
//     relatives: [
//       '/path/to/mock/src/index.jsx'
//     ],
//   },
//   '/path/to/mock/src/index.jsx': {
//     deps: [ ... ],
//     modules: [ ... ],
//     relatives: [ ... ]
//   },
//   ...
// }
analyze.analyze({
  file: '/path/to/mock/file.js',
  content: `
import React from "react";
import ReactDOM from "react-dom";
import "./src/index.jsx";
`
})

// or your can pass file (if file real exists)
analyze.analyze('/path/to/real/file.js')
```

## API

### `analyze.parseJS(content)`

Parse js code and get it's dependencies.

#### params

- `content {String}` js code

#### return

- `{Array}` an dependencies array

### `analyze.parseCSS(content)`

Parse css (sass/less) code and get it's dependencies.

#### params

- `content {String}` css (sass/less) code

#### return

- `{Array}` an dependencies array

### `analyze.parse(file[, matches])`

Parse a file/directory, and get it's dependencies.

#### params

- `file {String}` file or dir path
- `matches {String|Array}` minimatch rules (`String` will be treat as a single rule)

If `matches` is specfied, the files under basedir (`file`) will be filtered; otherwise all files except dot-started file (`.xxx`, \*nix hidden file) will be parsed.

#### return

- `{Array}` if `file` is a File, then dependencies array will be return
- `{Object}` if `file` is a directory, then a (file => dependencies) Object will be return, just like:

  ```js
  return {
    'dir/index.js': [
      'dep1',
      'dep2',
      ...
    ],
    'dir/index.css': [
      'dep1',
      'dep2',
      ...
    ]
  }
  ```

### `analyze.analyze(file[, options])`

analyze dependencies of specified file (or file content).

#### params

- `file {Mixed}` type of `file` can be `String` (file path) or `Object` (file + content info)
  - `{String}` the file path
  - `{Object}` the object of file and content `{ file: ..., content: ... }`
- `options {Object}` analyze options
  - depth `{Number}` max resolve depth (default is Infinity)
  - depResolve `{Function}` custom resolve dep to standard format (e.g. `~xxx` => `xxx`)
  - filter `{Function}` filter which deps can be resolved, will be invoked with `(dep, currFile)`

`options.depResolve` will be invoked with params `(dep, currFile, defaultResolve)`:

- `dep {String}` original dep string
- `currFile {String}` current file to resolve
- `defaultResolve {Function}` default dep resolve function

#### return

will return a object like:

```js
{
  '/path/to/entry.js': {
    deps: [{
      parent: '/path/to/entry.js',
      raw: 'react',
      name: 'react',
      module: 'react',
      file: null,
    }, ...],
    modules: [
      'react',
      ...
    ],
    relatives: [
      '/path/to/a.js',
      ...
    ]
  }
}
```

## Parser

dependency-analyze use different parser to parse code.

### javascript

Use [babylon](https://github.com/babel/babylon) to parse js code, these statements will be considered as a dependency:

- `import 'xxx'`
- `require('xxx')`
- `require.resolve('xxx')`

### css

Use **RegExp** to parse css code, `@import` statement will be considered as a dependency.

*Don't worry about `@import` in css comments, they will be skipped*

## License

MIT
