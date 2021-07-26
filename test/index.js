/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Literal<string>} Literal
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Text} Text
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('vfile').VFile} VFile
 */

import fs from 'node:fs'
import path from 'node:path'
import test from 'tape'
import remark from 'remark'
import gfm from 'remark-gfm'
import frontmatter from 'remark-frontmatter'
import {toVFile as vfile} from 'to-vfile'
// @ts-expect-error: to do type.
import {ParseLatin} from 'parse-latin'
// @ts-expect-error: to do type.
import {ParseDutch} from 'parse-dutch'
// @ts-expect-error: to do type.
import {ParseEnglish} from 'parse-english'
import {isHidden} from 'is-hidden'
import {toNlcst} from '../index.js'

test('mdast-util-to-nlcst', (t) => {
  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst()
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({})
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST (#2)'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  t.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst(
        /** @type {Text} */ ({type: 'text', value: 'foo'}),
        vfile({contents: 'foo'})
      )
    },
    /mdast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  t.throws(
    () => {
      toNlcst(
        /** @type {Text} */ ({type: 'text', value: 'foo'}),
        vfile(),
        ParseLatin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  t.doesNotThrow(() => {
    toNlcst(
      /** @type {Text} */ ({
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      vfile(),
      ParseEnglish
    )
  }, 'should accept a parser constructor')

  t.doesNotThrow(() => {
    toNlcst(
      /** @type {Text} */ ({
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      vfile(),
      new ParseDutch()
    )
  }, 'should accept a parser instance')

  t.throws(
    () => {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-expect-error runtime: incorrect positional info.
          position: {start: {}, end: {}}
        },
        vfile(),
        ParseLatin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  t.deepEqual(
    toNlcst(
      /** @type {Root} */ ({
        type: 'root',
        children: [{type: 'text', value: 'foo'}],
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      vfile(),
      ParseLatin
    ),
    {
      type: 'RootNode',
      children: [
        {
          type: 'ParagraphNode',
          children: [
            {
              type: 'SentenceNode',
              children: [
                {
                  type: 'WordNode',
                  children: [
                    {type: 'TextNode', value: 'foo', position: undefined}
                  ],
                  position: undefined
                }
              ]
            }
          ]
        }
      ]
    },
    'should handle a node in the tree w/o positional information'
  )

  t.deepEqual(
    toNlcst(
      /** @type {Root} */ ({
        type: 'root',
        children: [{type: 'image', alt: 'a'}],
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      vfile(),
      ParseLatin
    ),
    {
      type: 'RootNode',
      children: [
        {
          type: 'ParagraphNode',
          children: [
            {
              type: 'SentenceNode',
              children: [
                {
                  type: 'WordNode',
                  children: [
                    {type: 'TextNode', value: 'a', position: undefined}
                  ],
                  position: undefined
                }
              ]
            }
          ]
        }
      ]
    },
    'should handle an image in the tree w/o positional information'
  )

  t.deepEqual(
    toNlcst(
      /** @type {InlineCode} */ ({
        type: 'inlineCode',
        value: 'a',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      vfile(),
      ParseLatin,
      {ignore: ['inlineCode']}
    ),
    {type: 'RootNode', children: []},
    'should handle an image in the tree w/o positional information'
  )

  t.end()
})

test('Fixtures', (t) => {
  const base = path.join('test', 'fixtures')
  const files = fs.readdirSync(base)
  let index = -1

  while (++index < files.length) {
    const name = files[index]
    /** @type {Object.<string, unknown>|undefined} */
    let options

    if (isHidden(name)) continue

    const input = vfile.readSync(path.join(base, name, 'input.md'))
    /** @type {Node} */
    const expected = JSON.parse(
      String(vfile.readSync(path.join(base, name, 'output.json')))
    )

    try {
      options = JSON.parse(
        String(vfile.readSync(path.join(base, name, 'options.json')))
      )
    } catch {}

    const processor = remark()
    if (options && options.useRemarkGfm) processor.use(gfm)
    if (options && options.useRemarkFrontmatter) processor.use(frontmatter)
    const mdast = /** @type {Root} */ (processor.parse(input))

    t.deepEqual(
      toNlcst(mdast, input, ParseLatin, options),
      expected,
      'should work on `' + name + '`'
    )
  }

  t.end()
})
