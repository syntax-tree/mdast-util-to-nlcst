/**
 * @typedef {import('unist').Point} Point
 *
 * @typedef {import('nlcst').Root} NlcstRoot
 * @typedef {import('nlcst').Content} NlcstContent
 * @typedef {import('nlcst').SentenceContent} NlcstSentenceContent
 * @typedef {import('nlcst').WhiteSpace} NlcstWhiteSpace
 * @typedef {import('nlcst').Source} NlcstSource
 * @typedef {NlcstRoot|NlcstContent} NlcstNode
 *
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast').Content} MdastContent
 * @typedef {MdastRoot|MdastContent} MdastNode
 * @typedef {Extract<MdastNode, import('unist').Parent>} MdastParent
 *
 *
 * @typedef {import('vfile').VFile} VFile
 * @typedef {ReturnType<import('vfile-location').location>} Location
 * @typedef {{
 *   parse(nodes: NlcstContent[]): NlcstRoot
 *   tokenizeSource(value: string): NlcstSource
 *   tokenizeWhiteSpace(value: string): NlcstWhiteSpace
 *   tokenize(value: string): NlcstSentenceContent[]
 * }} ParserInstance
 * @typedef {new () => ParserInstance} ParserConstructor
 *
 * @typedef Options
 * @property {string[]} [ignore]
 * @property {string[]} [source]
 *
 * @typedef Context
 * @property {string} doc
 * @property {Location} place
 * @property {ParserInstance} parser
 * @property {string[]} ignore
 * @property {string[]} source
 */

import {toString} from 'nlcst-to-string'
import {pointStart, pointEnd} from 'unist-util-position'
import {location} from 'vfile-location'

const defaultIgnore = ['table', 'tableRow', 'tableCell']
const defaultSource = ['inlineCode']

/**
 * Transform a `tree` in mdast to nlcst.
 *
 * @param {MdastNode} tree
 * @param {VFile} file
 * @param {ParserInstance|ParserConstructor} Parser
 * @param {Options} [options]
 */
export function toNlcst(tree, file, Parser, options = {}) {
  // Crash on invalid parameters.
  if (!tree || !tree.type) {
    throw new Error('mdast-util-to-nlcst expected node')
  }

  if (!file || !file.messages) {
    throw new Error('mdast-util-to-nlcst expected file')
  }

  // Construct parser.
  if (!Parser) {
    throw new Error('mdast-util-to-nlcst expected parser')
  }

  if (
    !tree.position ||
    !tree.position.start ||
    !tree.position.start.column ||
    !tree.position.start.line
  ) {
    throw new Error('mdast-util-to-nlcst expected position on nodes')
  }

  const parser = 'parse' in Parser ? Parser : new Parser()

  const result = one(
    {
      doc: String(file),
      place: location(file),
      parser,
      ignore: options.ignore
        ? defaultIgnore.concat(options.ignore)
        : defaultIgnore,
      source: options.source
        ? defaultSource.concat(options.source)
        : defaultSource
    },
    tree
  )

  // Transform mdast into nlcst tokens, and pass these into `parser.parse` to
  // insert sentences, paragraphs where needed.
  return parser.parse(result || [])
}

/**
 * Transform a single node.
 * @param {Context} config
 * @param {MdastNode} node
 * @returns {NlcstContent[]|undefined}
 */
function one(config, node) {
  const start = node.position ? node.position.start.offset : undefined

  if (!config.ignore.includes(node.type)) {
    if (config.source.includes(node.type) && start && node.position) {
      return patch(
        config,
        [
          config.parser.tokenizeSource(
            config.doc.slice(start, node.position.end.offset)
          )
        ],
        start
      )
    }

    if ('children' in node) {
      return all(config, node)
    }

    if ((node.type === 'image' || node.type === 'imageReference') && node.alt) {
      return patch(
        config,
        config.parser.tokenize(node.alt),
        typeof start === 'number' ? start + 2 : undefined
      )
    }

    if (node.type === 'break') {
      return patch(config, [config.parser.tokenizeWhiteSpace('\n')], start)
    }

    if (node.type === 'text') {
      return patch(config, config.parser.tokenize(node.value), start)
    }
  }
}

/**
 * Transform all nodes in `parent`.
 * @param {Context} config
 * @param {MdastParent} parent
 * @returns {NlcstContent[]}
 */
function all(config, parent) {
  let index = -1
  /** @type {NlcstContent[]} */
  const results = []
  /** @type {Point|undefined} */
  let end

  while (++index < parent.children.length) {
    const child = parent.children[index]
    const start = pointStart(child)

    if (
      end &&
      end.line !== null &&
      start.line !== null &&
      start.line !== end.line
    ) {
      const lineEnding = config.parser.tokenizeWhiteSpace(
        '\n'.repeat(start.line - end.line)
      )
      patch(config, [lineEnding], end.offset)

      if (lineEnding.value.length < 2) {
        lineEnding.value = '\n\n'
      }

      results.push(lineEnding)
    }

    const result = one(config, child)
    if (result) results.push(...result)
    end = pointEnd(child)
  }

  return results
}

/**
 * Patch a position on each node in `nodes`.
 * `offset` is the offset in `file` this run of content starts at.
 *
 * @template {NlcstContent[]} T
 * @param {Context} config
 * @param {T} nodes
 * @param {number|undefined} offset
 * @returns {T}
 */
function patch(config, nodes, offset) {
  let index = -1
  let start = offset

  while (++index < nodes.length) {
    const node = nodes[index]

    if ('children' in node) {
      patch(config, node.children, start)
    }

    const end =
      typeof start === 'number' ? start + toString(node).length : undefined

    node.position =
      start !== undefined && end !== undefined
        ? {
            start: config.place.toPoint(start),
            end: config.place.toPoint(end)
          }
        : undefined

    start = end
  }

  return nodes
}
