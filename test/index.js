/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast-util-from-markdown').Options} FromMarkdownOptions
 * @typedef {import('../index.js').Options} Options
 */

/**
 * @typedef ExtraConfigFields
 * @property {boolean | null | undefined} [useRemarkFrontmatter=false]
 * @property {boolean | null | undefined} [useRemarkGfm=false]
 *
 * @typedef {ExtraConfigFields & Options} Config
 */

import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'
import {isHidden} from 'is-hidden'
import {fromMarkdown} from 'mdast-util-from-markdown'
import {frontmatterFromMarkdown} from 'mdast-util-frontmatter'
import {gfmFromMarkdown} from 'mdast-util-gfm'
import {frontmatter} from 'micromark-extension-frontmatter'
import {gfm} from 'micromark-extension-gfm'
import {ParseLatin} from 'parse-latin'
import {ParseDutch} from 'parse-dutch'
import {ParseEnglish} from 'parse-english'
import {read} from 'to-vfile'
import {VFile} from 'vfile'
import {toNlcst} from '../index.js'

test('toNlcst', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('../index.js')).sort(), [
      'toNlcst'
    ])
  })

  await t.test('should fail when not given an AST', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst()
    }, /mdast-util-to-nlcst expected node/)
  })

  await t.test('should fail when not given an AST (#2)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst({})
    }, /mdast-util-to-nlcst expected node/)
  })

  await t.test('should fail when not given a file', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst({type: 'foo'})
    }, /mdast-util-to-nlcst expected file/)
  })

  await t.test('should fail when not given a file (#2)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst({type: 'foo'})
    }, /mdast-util-to-nlcst expected file/)
  })

  await t.test('should fail when not given a file (#3)', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst({type: 'text', value: 'foo'}, {foo: 'bar'})
    }, /mdast-util-to-nlcst expected file/)
  })

  await t.test('should fail without parser', async function () {
    assert.throws(function () {
      // @ts-expect-error: check that the runtime throws.
      toNlcst({type: 'text', value: 'foo'}, new VFile())
    }, /mdast-util-to-nlcst expected parser/)
  })

  await t.test(
    'should fail when not given positional information',
    async function () {
      assert.throws(function () {
        toNlcst({type: 'text', value: 'foo'}, new VFile(), ParseLatin)
      }, /mdast-util-to-nlcst expected position on nodes/)
    }
  )

  await t.test('should accept a parser constructor', async function () {
    assert.doesNotThrow(function () {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
        },
        new VFile(),
        ParseEnglish
      )
    })
  })

  await t.test('should accept a parser instance', async function () {
    assert.doesNotThrow(function () {
      toNlcst(
        {
          type: 'text',
          value: 'foo',
          position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
        },
        new VFile(),
        new ParseDutch()
      )
    })
  })

  await t.test(
    'should fail when not given positional information (#2)',
    async function () {
      assert.throws(function () {
        toNlcst(
          {
            type: 'text',
            value: 'foo',
            // @ts-expect-error: check how runtime handles incorrect positional info.
            position: {start: {}, end: {}}
          },
          new VFile(),
          ParseLatin
        )
      }, /mdast-util-to-nlcst expected position on nodes/)
    }
  )

  await t.test(
    'should handle a node in the tree w/o positional information',
    async function () {
      assert.deepEqual(
        toNlcst(
          {
            type: 'root',
            children: [{type: 'text', value: 'foo'}],
            position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
          },
          new VFile(),
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
        }
      )
    }
  )

  await t.test(
    'should handle an image in the tree w/o positional information',
    async function () {
      assert.deepEqual(
        toNlcst(
          {
            type: 'root',
            children: [{type: 'image', url: 'a', alt: 'a'}],
            position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
          },
          new VFile(),
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
        }
      )
    }
  )

  await t.test(
    'should handle an image in the tree w/o positional information',
    async function () {
      assert.deepEqual(
        toNlcst(
          {
            type: 'inlineCode',
            value: 'a',
            position: {start: {line: 1, column: 1}, end: {line: 1, column: 4}}
          },
          new VFile(),
          ParseLatin,
          {ignore: ['inlineCode']}
        ),
        {type: 'RootNode', children: []}
      )
    }
  )
})

test('fixtures', async function (t) {
  const base = new URL('fixtures/', import.meta.url)
  const files = await fs.readdir(base)
  let index = -1

  while (++index < files.length) {
    const name = files[index]
    /** @type {Config} */
    let options = {}

    if (isHidden(name)) continue

    await t.test('should work on `' + name + '`', async function () {
      const input = await read(new URL(name + '/input.md', base))
      /** @type {Root} */
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

      // To do: remove cast when `from-markdown` releases.
      const mdast = /** @type {Root} */ (fromMarkdown(String(input), config))

      assert.deepEqual(toNlcst(mdast, input, ParseLatin, options), expected)
    })
  }
})
