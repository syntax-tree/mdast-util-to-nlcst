/**
 * @typedef {import('unist').Node} Node
 * @typedef {import('unist').Literal<string>} Literal
 * @typedef {import('unist').Parent} Parent
 * @typedef {import('unist').Point} Point
 * @typedef {import('mdast').Content} Content
 * @typedef {import('vfile').VFile} VFile
 * @typedef {ReturnType<import('vfile-location').location>} Location
 * @typedef {{
 *   parse(nodes: Node[]): Node
 *   tokenizeSource(value: string): Node
 *   tokenizeWhiteSpace(value: string): Node
 *   tokenize(value: string): Node[]
 * }} ParserInstance
 * @typedef {new () => ParserInstance} ParserConstructor
 *
 * @typedef Options
 * @property {Array.<string>} [ignore]
 * @property {Array.<string>} [source]
 *
 * @typedef Context
 * @property {string} doc
 * @property {Location} place
 * @property {ParserInstance} parser
 * @property {Array.<string>} ignore
 * @property {Array.<string>} source
 */

import repeat from 'repeat-string'
import {toString} from 'nlcst-to-string'
import {pointStart, pointEnd} from 'unist-util-position'
import {location} from 'vfile-location'

/**
 * Transform a `tree` in mdast to nlcst.
 *
 * @param {Node} tree
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

  // Transform mdast into nlcst tokens, and pass these into `parser.parse` to
  // insert sentences, paragraphs where needed.
  return parser.parse(
    one(
      {
        doc: String(file),
        place: location(file),
        parser,
        ignore: [].concat(
          'table',
          'tableRow',
          'tableCell',
          options.ignore || []
        ),
        source: [].concat('inlineCode', options.source || [])
      },
      // @ts-ignore assume mdast node.
      tree
    )
  )
}

/**
 * Transform a single node.
 * @param {Context} config
 * @param {Content} node
 * @returns {Array.<Node>|undefined}
 */
function one(config, node) {
  /** @type {number} */
  let start

  if (!config.ignore.includes(node.type)) {
    start = node.position.start.offset

    if (config.source.includes(node.type)) {
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
      // @ts-ignore looks like a parent.
      return all(config, node)
    }

    if (node.type === 'image' || node.type === 'imageReference') {
      return patch(config, config.parser.tokenize(node.alt), start + 2)
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
 * @param {Parent} parent
 * @returns {Array.<Node>}
 */
function all(config, parent) {
  let index = -1
  /** @type {Array.<Node>} */
  const results = []
  /** @type {Point} */
  let end

  while (++index < parent.children.length) {
    /** @type {Content} */
    // @ts-ignore Assume `parent` is an mdast parent.
    const child = parent.children[index]
    const start = pointStart(child)

    if (end && start.line !== end.line) {
      const lineEnding = config.parser.tokenizeWhiteSpace(
        repeat('\n', start.line - end.line)
      )
      patch(config, [lineEnding], end.offset)

      if (literal(lineEnding) && lineEnding.value.length < 2) {
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
 * @template {Array.<Node>} T
 * @param {Context} config
 * @param {T} nodes
 * @param {number} offset
 * @returns {T}
 */
function patch(config, nodes, offset) {
  let index = -1
  let start = offset

  while (++index < nodes.length) {
    const node = nodes[index]

    if ('children' in node) {
      // @ts-ignore looks like a parent.
      patch(config, node.children, start)
    }

    const end = start + toString(node).length

    node.position = {
      start: config.place.toPoint(start),
      end: config.place.toPoint(end)
    }

    start = end
  }

  return nodes
}

/**
 * @param {Node} node
 * @returns {node is Literal}
 */
function literal(node) {
  return 'value' in node
}
