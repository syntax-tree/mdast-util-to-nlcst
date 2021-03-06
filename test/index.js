/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('vfile').VFile} VFile
 */

import fs from 'fs'
import path from 'path'
import test from 'tape'
import remark from 'remark'
import gfm from 'remark-gfm'
import frontmatter from 'remark-frontmatter'
import {toVFile as vfile} from 'to-vfile'
import {ParseLatin} from 'parse-latin'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {isHidden} from 'is-hidden'
import {toNlcst} from '../index.js'

test('mdast-util-to-nlcst', function (t) {
  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst()
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({})
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST (#2)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    function () {
      // @ts-ignore runtime.
      toNlcst({type: 'text', value: 'foo'}, vfile({contents: 'foo'}))
    },
    /mdast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    function () {
      toNlcst({type: 'text', value: 'foo'}, vfile(), ParseLatin)
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  t.doesNotThrow(function () {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      },
      vfile(),
      ParseEnglish
    )
  }, 'should accept a parser constructor')

  t.doesNotThrow(function () {
    toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      },
      vfile(),
      new ParseDutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    function () {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-ignore runtime.
          position: {start: {}, end: {}}
        },
        vfile(),
        ParseLatin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.end()
})

test('Fixtures', function (t) {
  var base = path.join('test', 'fixtures')
  var files = fs.readdirSync(base)
  var index = -1
  /** @type {string} */
  var name
  /** @type {VFile} */
  var input
  /** @type {Node} */
  var expected
  /** @type {Node} */
  var mdast
  /** @type {Object.<string, unknown>} */
  var options

  while (++index < files.length) {
    name = files[index]

    if (isHidden(name)) continue

    input = vfile.readSync(path.join(base, name, 'input.md'))
    expected = JSON.parse(
      String(vfile.readSync(path.join(base, name, 'output.json')))
    )

    try {
      options = JSON.parse(
        String(vfile.readSync(path.join(base, name, 'options.json')))
      )
    } catch {
      options = undefined
    }

    mdast = remark()
      .use(options && options.useRemarkGfm ? gfm : undefined)
      .use(options && options.useRemarkFrontmatter ? frontmatter : undefined)
      .parse(input)

    t.deepEqual(
      toNlcst(mdast, input, ParseLatin, options),
      expected,
      'should work on `' + name + '`'
    )
  }

  t.end()
})
