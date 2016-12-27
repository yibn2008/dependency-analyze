'use strict'

const path = require('path')
const fs = require('fs')
const priv = require('@scope/test')
const rel = require('./b')

// require('will-not-be-parsed1')

/**
 * require('will-not-be-parsed2')
 */

const xxx = `
require('will-not-be-parsed3')
`

import node from 'test-import';
