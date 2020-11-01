'use strict'

var fs = require('fs')
var path = require('path')
var test = require('tape')
var remark = require('remark')
var gfm = require('remark-gfm')
var frontmatter = require('remark-frontmatter')
var vfile = require('to-vfile')
var Latin = require('parse-latin')
var Dutch = require('parse-dutch')
var English = require('parse-english')
var negate = require('negate')
var hidden = require('is-hidden')
var toNlcst = require('..')

test('mdast-util-to-nlcst', function (t) {
  t.throws(
    function () {
      toNlcst()
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST'
  )

  t.throws(
    function () {
      toNlcst({})
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST (#2)'
  )

  t.throws(
    function () {
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    function () {
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    function () {
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    function () {
      toNlcst({type: 'text', value: 'foo'}, vfile({contents: 'foo'}))
    },
    /mdast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    function () {
      toNlcst({type: 'text', value: 'foo'}, vfile(), Latin)
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
      English
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
      new Dutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    function () {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          position: {start: {}, end: {}}
        },
        vfile(),
        Latin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.test('should accept nodes without offsets', function (st) {
    var node = toNlcst(
      {
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      },
      vfile({contents: 'foo'}),
      Latin
    )

    st.equal(node.position.start.offset, 0, 'should set starting offset')
    st.equal(node.position.end.offset, 3, 'should set ending offset')

    st.end()
  })

  t.end()
})

test('Fixtures', function (t) {
  var base = path.join(__dirname, 'fixtures')

  fs.readdirSync(base)
    .filter(negate(hidden))
    .forEach(function (name) {
      var input = vfile.readSync(path.join(base, name, 'input.md'))
      var expected = JSON.parse(
        vfile.readSync(path.join(base, name, 'output.json'))
      )
      var options

      try {
        options = JSON.parse(
          vfile.readSync(path.join(base, name, 'options.json'))
        )
      } catch (_) {}

      var mdast = remark()
        .use(options && options.useRemarkGfm ? gfm : [])
        .use(options && options.useRemarkFrontmatter ? frontmatter : [])
        .parse(input)

      var actual = toNlcst(mdast, input, Latin, options)

      t.deepEqual(actual, expected, 'should work on `' + name + '`')
    })

  t.end()
})
