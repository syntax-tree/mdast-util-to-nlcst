/**
 * @typedef {import('unist').Point} Point
 * @typedef {import('unist').Position} UnistPosition
 * @typedef {import('unist').Parent} UnistParent
 *
 * @typedef {import('nlcst').Root} NlcstRoot
 * @typedef {import('nlcst').Content} NlcstContent
 * @typedef {import('nlcst').SentenceContent} NlcstSentenceContent
 * @typedef {import('nlcst').WhiteSpace} NlcstWhiteSpace
 * @typedef {import('nlcst').Sentence} NlcstSentence
 * @typedef {import('nlcst').Paragraph} NlcstParagraph
 *
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('mdast').Content} MdastContent
 *
 * @typedef {import('vfile').VFile} VFile
 *
 * @typedef {ReturnType<import('vfile-location').location>} Location
 */

/**
 * @typedef {MdastRoot | MdastContent} MdastNode
 * @typedef {NlcstRoot | NlcstContent} NlcstNode
 * @typedef {Extract<NlcstNode, UnistParent>} NlcstParent
 * @typedef {Extract<MdastNode, UnistParent>} MdastParent
 *
 * @typedef {{
 *   tokenizeSentencePlugins: Array<(node: NlcstSentence) => void>,
 *   tokenizeParagraphPlugins: Array<(node: NlcstParagraph) => void>,
 *   tokenizeRootPlugins: Array<(node: NlcstRoot) => void>,
 *   parse(value: string | null | undefined): NlcstRoot
 *   tokenize(value: string | null | undefined): Array<NlcstSentenceContent>
 * }} ParserInstance
 * @typedef {new () => ParserInstance} ParserConstructor
 *
 * @typedef Options
 * @property {Array<string>} [ignore]
 *   List of mdast node types to ignore.
 * @property {Array<string>} [source]
 *   List of mdast node types to mark as `source`.
 *
 * @typedef Context
 * @property {string} doc
 * @property {Location} place
 * @property {ParserInstance} parser
 * @property {Array<string>} ignore
 * @property {Array<string>} source
 */

import {toString} from 'nlcst-to-string'
import {pointStart, pointEnd} from 'unist-util-position'
import {location} from 'vfile-location'

const defaultIgnore = ['table', 'tableRow', 'tableCell']
const defaultSource = ['inlineCode']

// Ported from:
// <https://github.com/wooorm/parse-latin/blob/ea33f09/lib/expressions.js#L5>
const newLine = /^[ \t]*((\r?\n|\r)[\t ]*)+$/
const terminalMarker = /^([!.?\u2026\u203D]+)$/

/**
 * Transform a `tree` in mdast to nlcst.
 *
 * @param {MdastNode} tree
 * @param {VFile} file
 * @param {ParserInstance|ParserConstructor} Parser
 * @param {Options} [options]
 */
// eslint-disable-next-line complexity
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

  /** @type {Context} */
  const context = {
    doc: String(file),
    place: location(file),
    parser,
    ignore: options.ignore
      ? defaultIgnore.concat(options.ignore)
      : defaultIgnore,
    source: options.source
      ? defaultSource.concat(options.source)
      : defaultSource
  }

  const result = one(context, tree)

  if (result && result.length > 0) {
    const start = pointStart(result[0])
    const end = pointEnd(result[result.length - 1])

    // Turn into a sentence.
    /** @type {NlcstSentence} */
    const sentence = {type: 'SentenceNode', children: result}

    if (start && start.line && end && end.line) {
      sentence.position = {start, end}
    }

    let index = -1
    while (parser.tokenizeSentencePlugins[++index]) {
      parser.tokenizeSentencePlugins[index](sentence)
    }

    // Turn into a paragraph.
    /** @type {NlcstParagraph} */
    const paragraph = {
      type: 'ParagraphNode',
      children: splitNode(sentence, 'PunctuationNode', terminalMarker)
    }
    if (start && start.line && end && end.line) {
      paragraph.position = {start: {...start}, end: {...end}}
    }

    index = -1
    while (parser.tokenizeParagraphPlugins[++index]) {
      parser.tokenizeParagraphPlugins[index](paragraph)
    }

    /** @type {NlcstRoot} */
    const root = {
      type: 'RootNode',
      children: splitNode(paragraph, 'WhiteSpaceNode', newLine)
    }
    if (start && start.line && end && end.line) {
      root.position = {start: {...start}, end: {...end}}
    }

    index = -1
    while (parser.tokenizeRootPlugins[++index]) {
      parser.tokenizeRootPlugins[index](root)
    }

    return root
  }

  return {type: 'RootNode', children: []}
}

/**
 * Transform a single node.
 * @param {Context} config
 * @param {MdastNode} node
 * @returns {Array<NlcstSentenceContent>|undefined}
 */
function one(config, node) {
  const start = node.position ? node.position.start.offset : undefined

  if (!config.ignore.includes(node.type)) {
    if (config.source.includes(node.type) && start && node.position) {
      return patch(
        config,
        [
          {
            type: 'SourceNode',
            value: config.doc.slice(start, node.position.end.offset)
          }
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
      return patch(config, [{type: 'WhiteSpaceNode', value: '\n'}], start)
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
 * @returns {Array<NlcstSentenceContent>}
 */
function all(config, parent) {
  let index = -1
  /** @type {Array<NlcstSentenceContent>} */
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
      /** @type {NlcstWhiteSpace} */
      const lineEnding = {
        type: 'WhiteSpaceNode',
        value: '\n'.repeat(start.line - end.line)
      }
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
 * @template {Array<NlcstContent>} T
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

// Ported from:
// <https://github.com/wooorm/parse-latin/blob/ea33f09/lib/index.js#L266-L310>
/**
 * A function that splits one node into several nodes.
 *
 * @template {NlcstParent} TheNode
 * @param {TheNode} node
 * @param {RegExp} expression
 * @param {NlcstContent['type']} childType
 * @returns {Array<TheNode>}
 */
function splitNode(node, childType, expression) {
  /** @type {Array<TheNode>} */
  const result = []
  let index = -1
  let start = 0

  while (++index < node.children.length) {
    const token = node.children[index]

    if (
      index === node.children.length - 1 ||
      (token.type === childType && expression.test(toString(token)))
    ) {
      /** @type {TheNode} */
      // @ts-expect-error: fine
      const parent = {
        type: node.type,
        children: node.children.slice(start, index + 1)
      }

      const first = node.children[start]
      const last = token
      if (first.position && last.position) {
        parent.position = {
          start: first.position.start,
          end: last.position.end
        }
      }

      result.push(parent)
      start = index + 1
    }
  }

  return result
}
