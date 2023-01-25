/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').Text} Text
 * @typedef {import('mdast').InlineCode} InlineCode
 * @typedef {import('mdast-util-from-markdown').Options} FromMarkdownOptions
 * @typedef {import('../index.js').Options} Options
 *
 * @typedef ExtraConfigFields
 * @property {boolean | null | undefined} [useRemarkGfm=false]
 * @property {boolean | null | undefined} [useRemarkFrontmatter=false]
 *
 * @typedef {ExtraConfigFields & Options} Config
 */

import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {frontmatterFromMarkdown} from 'mdast-util-frontmatter'
import {gfm} from 'micromark-extension-gfm'
import {frontmatter} from 'micromark-extension-frontmatter'
import {toVFile, read} from 'to-vfile'
import {ParseLatin} from 'parse-latin'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {isHidden} from 'is-hidden'
import {toNlcst} from '../index.js'
import * as mod from '../index.js'

test('toNlcst', () => {
  assert.deepEqual(
    Object.keys(mod).sort(),
    ['toNlcst'],
    'should expose the public api'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst()
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({})
    },
    /mdast-util-to-nlcst expected node/,
    'should fail when not given an AST (#2)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'foo'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#2)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    },
    /mdast-util-to-nlcst expected file/,
    'should fail when not given a file (#3)'
  )

  assert.throws(
    () => {
      // @ts-expect-error runtime: too few arguments.
      toNlcst(
        /** @type {Text} */ ({type: 'text', value: 'foo'}),
        toVFile({contents: 'foo'})
      )
    },
    /mdast-util-to-nlcst expected parser/,
    'should fail without parser'
  )

  assert.throws(
    () => {
      toNlcst(
        /** @type {Text} */ ({type: 'text', value: 'foo'}),
        toVFile(),
        ParseLatin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information'
  )

  assert.doesNotThrow(() => {
    toNlcst(
      /** @type {Text} */ ({
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      toVFile(),
      ParseEnglish
    )
  }, 'should accept a parser constructor')

  assert.doesNotThrow(() => {
    toNlcst(
      /** @type {Text} */ ({
        type: 'text',
        value: 'foo',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      toVFile(),
      new ParseDutch()
    )
  }, 'should accept a parser instance')

  assert.throws(
    () => {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          // @ts-expect-error runtime: incorrect positional info.
          position: {start: {}, end: {}}
        },
        toVFile(),
        ParseLatin
      )
    },
    /mdast-util-to-nlcst expected position on nodes/,
    'should fail when not given positional information (#2)'
  )

  assert.deepEqual(
    toNlcst(
      /** @type {Root} */ ({
        type: 'root',
        children: [{type: 'text', value: 'foo'}],
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      toVFile(),
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

  assert.deepEqual(
    toNlcst(
      /** @type {Root} */ ({
        type: 'root',
        children: [{type: 'image', alt: 'a'}],
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      toVFile(),
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

  assert.deepEqual(
    toNlcst(
      /** @type {InlineCode} */ ({
        type: 'inlineCode',
        value: 'a',
        position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
      }),
      toVFile(),
      ParseLatin,
      {ignore: ['inlineCode']}
    ),
    {type: 'RootNode', children: []},
    'should handle an image in the tree w/o positional information'
  )
})

test('fixtures', async () => {
  const base = new URL('fixtures/', import.meta.url)
  const files = await fs.readdir(base)
  let index = -1

  while (++index < files.length) {
    const name = files[index]
    /** @type {Config} */
    let options = {}

    if (isHidden(name)) continue

    const input = await read(new URL(name + '/input.md', base))
    /** @type {Node} */
    const expected = JSON.parse(
      String(await fs.readFile(new URL(name + '/output.json', base)))
    )

    try {
      options = JSON.parse(
        String(await fs.readFile(new URL(name + '/options.json', base)))
      )
    } catch {}

    /** @type {FromMarkdownOptions} */
    const config = {mdastExtensions: [], extensions: []}
    assert(config.mdastExtensions)
    assert(config.extensions)

    if (options.useRemarkGfm) {
      config.mdastExtensions.push(gfmFromMarkdown())
      config.extensions.push(gfm())
    }

    if (options.useRemarkFrontmatter) {
      config.mdastExtensions.push(frontmatterFromMarkdown())
      config.extensions.push(frontmatter())
    }

    const mdast = fromMarkdown(String(input), config)

    assert.deepEqual(
      toNlcst(mdast, input, ParseLatin, options),
      expected,
      'should work on `' + name + '`'
    )
  }
})
