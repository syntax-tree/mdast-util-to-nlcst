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
 *   nlcst parser.
 *
 *   For example, `parse-dutch`, `parse-english`, or `parse-latin`.
 * @typedef {new () => ParserInstance} ParserConstructor
 *   Create a new parser.
 *
 * @typedef Options
 *   Configuration.
 * @property {Array<string> | null | undefined} [ignore]
 *   List of mdast node types to ignore.
 *
 *   The types `'table'`, `'tableRow'`, and `'tableCell'` are always ignored.
 * @property {Array<string> | null | undefined} [source]
 *   List of mdast node types to mark as `source`.
 *
 *   The type `'inlineCode'` is always marked as source.
 *
 * @typedef State
 *   Info passed around.
 * @property {string} doc
 *   Whole document.
 * @property {Location} place
 *   Location info.
 * @property {ParserInstance} parser
 *   Parser.
 * @property {Array<string>} ignore
 *   List of mdast node types to ignore.
 * @property {Array<string>} source
 *   List of mdast node types to mark as source.
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
 * > 👉 **Note**: `tree` must have positional info and `file` must be a `VFile`
 * > corresponding to `tree`.
 *
 * @param {MdastNode} tree
 *   mdast tree to transform.
 * @param {VFile} file
 *   Virtual file.
 * @param {ParserInstance | ParserConstructor} Parser
 *   Parser to use.
 * @param {Options | null | undefined} [options]
 *   Configuration.
 * @returns {NlcstRoot}
 *   nlcst tree.
 */
export function toNlcst(tree, file, Parser, options) {
  const options_ = options || {}

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

  if (!pointStart(tree).line || !pointStart(tree).column) {
    throw new Error('mdast-util-to-nlcst expected position on nodes')
  }

  /** @type {State} */
  const state = {
    doc: String(file),
    place: location(file),
    parser: 'parse' in Parser ? Parser : new Parser(),
    ignore: options_.ignore
      ? [...defaultIgnore, ...options_.ignore]
      : defaultIgnore,
    source: options_.source
      ? [...defaultSource, ...options_.source]
      : defaultSource
  }

  return sentenceContentToRoot(state, one(state, tree) || [])
}

/**
 * Turn sentence content into an nlcst root.
 *
 * @param {State} state
 *   State.
 * @param {Array<NlcstSentenceContent>} nodes
 *   Sentence content.
 * @returns {NlcstRoot}
 *   Root.
 */
function sentenceContentToRoot(state, nodes) {
  if (nodes.length === 0) {
    return {type: 'RootNode', children: []}
  }

  const start = pointStart(nodes[0])
  const end = pointEnd(nodes[nodes.length - 1])

  // Turn into a sentence.
  /** @type {NlcstSentence} */
  const sentence = {type: 'SentenceNode', children: nodes}

  if (start && start.line && end && end.line) {
    sentence.position = {start, end}
  }

  let index = -1
  while (state.parser.tokenizeSentencePlugins[++index]) {
    state.parser.tokenizeSentencePlugins[index](sentence)
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
  while (state.parser.tokenizeParagraphPlugins[++index]) {
    state.parser.tokenizeParagraphPlugins[index](paragraph)
  }

  // Turn into a root.
  /** @type {NlcstRoot} */
  const root = {
    type: 'RootNode',
    children: splitNode(paragraph, 'WhiteSpaceNode', newLine)
  }
  if (start && start.line && end && end.line) {
    root.position = {start: {...start}, end: {...end}}
  }

  index = -1
  while (state.parser.tokenizeRootPlugins[++index]) {
    state.parser.tokenizeRootPlugins[index](root)
  }

  return root
}

/**
 * Transform a single node.
 *
 * @param {State} state
 *   State.
 * @param {MdastNode} node
 *   mdast node.
 * @returns {Array<NlcstSentenceContent> | undefined}
 *   nlcst sentence content.
 */
function one(state, node) {
  if (state.ignore.includes(node.type)) {
    return
  }

  let start = node.position ? node.position.start.offset : undefined
  const end = node.position ? node.position.end.offset : undefined
  /** @type {Array<NlcstSentenceContent> | undefined} */
  let results

  if (state.source.includes(node.type)) {
    if (start !== undefined && end !== undefined) {
      results = [{type: 'SourceNode', value: state.doc.slice(start, end)}]
    }
  } else if ('children' in node) {
    return all(state, node)
  } else if (node.type === 'image' || node.type === 'imageReference') {
    if (node.alt) {
      results = state.parser.tokenize(node.alt)

      if (typeof start === 'number') {
        start += 2
      }
    }
  } else if (node.type === 'break') {
    results = [{type: 'WhiteSpaceNode', value: '\n'}]
  } else if (node.type === 'text') {
    results = state.parser.tokenize(node.value)
  }

  if (results) {
    patch(state, results, start)
    return results
  }
}

/**
 * Transform all nodes in `parent`.
 *
 * @param {State} state
 *   State.
 * @param {MdastParent} parent
 *   mdast parent node.
 * @returns {Array<NlcstSentenceContent>}
 *   nlcst sentence content.
 */
function all(state, parent) {
  let index = -1
  /** @type {Array<NlcstSentenceContent>} */
  const results = []
  /** @type {Point | undefined} */
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
      patch(state, [lineEnding], end.offset)

      // Make sure it’ll be seen as a break between paragraphs.
      if (lineEnding.value.length < 2) {
        lineEnding.value = '\n\n'
      }

      results.push(lineEnding)
    }

    const result = one(state, child)
    if (result) results.push(...result)
    end = pointEnd(child)
  }

  return results
}

/**
 * Patch a position on each node in `nodes`.
 *
 * `offset` is the offset in `file` this run of content starts at.
 *
 * @param {State} state
 *   State.
 * @param {Array<NlcstContent>} nodes
 *   nlcst sentence content.
 * @param {number | undefined} offset
 *   Offset.
 * @returns {void}
 *   Nothing.
 */
function patch(state, nodes, offset) {
  let index = -1
  let start = offset

  while (++index < nodes.length) {
    const node = nodes[index]

    if ('children' in node) {
      patch(state, node.children, start)
    }

    const end =
      typeof start === 'number' ? start + toString(node).length : undefined

    node.position =
      start !== undefined && end !== undefined
        ? {start: state.place.toPoint(start), end: state.place.toPoint(end)}
        : undefined

    start = end
  }
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
