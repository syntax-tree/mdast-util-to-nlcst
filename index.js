/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module mdast:to-nlcst
 * @fileoverview Transform MDAST to NLCST.
 */

'use strict';

/* eslint-env commonjs */

/* Dependencies. */
var repeat = require('repeat-string');
var vfileLocation = require('vfile-location');
var toString = require('nlcst-to-string');

/* Map of ignored mdast nodes: nodes which have no (simple)
 * representation in NLCST. */
var IGNORE = {
    horizontalRule: true,
    table: true,
    tableRow: true,
    tableCell: true
};

/* Constants. */
var C_NEWLINE = '\n';

/**
 * Patch a position on each node in `nodes`.
 * `offset` is the offset in `file` this run of content
 * starts at.
 *
 * Note that NLCST nodes are concrete, meaning that their
 * starting and ending positions can be inferred from their
 * content.
 *
 * @param {Array.<NLCSTNode>} nodes - NLCST nodes.
 * @param {Object} location - Bound location info.
 * @param {number} offset - Starting offset for `nodes`.
 * @return {Array.<NLCSTNode>} - `nodes`.
 */
function patch(nodes, location, offset) {
    var length = nodes.length;
    var index = -1;
    var start = offset;
    var children;
    var node;
    var end;

    while (++index < length) {
        node = nodes[index];
        children = node.children;

        if (children) {
            patch(children, location, start);
        }

        end = start + toString(node).length;

        node.position = {
            start: location.toPosition(start),
            end: location.toPosition(end)
        }

        start = end;
    }

    return nodes;
}

/**
 * Convert all nodes in `parent` (mdast) into NLCST.
 *
 * @param {MDASTNode} parent - Parent node.
 * @param {File} file - Virtual file.
 * @param {Object} location - Bound location info.
 * @param {Parser} parser - NLCST parser.
 * @return {Array.<NLCSTNode>} - Concatenation of calling
 *   `one` on each MDASTNode in `parent`.
 */
function all(parent, file, location, parser) {
    var children = parent.children;
    var length = children && children.length;
    var index = -1;
    var result = [];
    var child;
    var node;
    var pos;
    var prevEndLine;
    var prevOffset;
    var endLine;

    while (++index < length) {
        node = children[index];
        pos = node.position;
        endLine = pos.start.line;

        if (prevEndLine && endLine !== prevEndLine) {
            child = parser.tokenizeWhiteSpace(
                repeat(C_NEWLINE, endLine - prevEndLine)
            );

            patch([child], location, prevOffset);

            if (child.value.length < 2) {
                child.value = repeat(C_NEWLINE, 2);
            }

            result.push(child);
        }

        child = one(node, index, parent, file, location, parser);

        if (child) {
            result = result.concat(child);
        }

        prevEndLine = pos.end.line;
        prevOffset = pos.end.offset;
    }

    return result;
}

/**
 * Convert `node` into NLCST.
 *
 * @param {MDASTNode} node - Node.
 * @param {number?} index - Position of `node` in `parent`.
 * @param {MDASTNode?} parent - Parent node of `node`.
 * @param {File} file - Virtual file.
 * @param {Object} location - Bound location info.
 * @param {Parser} parser - NLCST parser.
 * @return {Array.<NLCSTNode>?} - A list of NLCST nodes, if
 *   `node` could be converted.
 */
function one(node, index, parent, file, location, parser) {
    var type = node.type;
    var pos = node.position;
    var start = location.toOffset(pos.start);
    var end = location.toOffset(pos.end);
    var replacement;

    if (type in IGNORE) {
        return null;
    }

    if (node.children) {
        replacement = all(node, file, location, parser);
    } else if (
        type === 'image' ||
        type === 'imageReference'
    ) {
        replacement = patch(
            parser.tokenize(node.alt), location, start + 2
        );
    } else if (
        type === 'text' ||
        type === 'escape'
    ) {
        replacement = patch(
            parser.tokenize(node.value), location, start
        );
    } else if (node.type === 'break') {
        replacement = patch([
            parser.tokenizeWhiteSpace('\n')
        ], location, start);
    } else if (node.type === 'inlineCode') {
        replacement = patch([parser.tokenizeSource(
            file.toString().slice(start, end)
        )], location, start);
    }

    return replacement || null;
}

/**
 * Transform `ast` into `nlcst`.
 *
 * @param {Node} tree - MDAST node.
 * @param {File} file - Virtual file.
 * @param {Parser|Function} Parser - (Instance of) NLCST
 *   parser.
 * @return {NLCSTNode} - NLCST.
 */
function toNLCST(tree, file, Parser) {
    var parser;
    var location;

    /* Warn for invalid parameters. */
    if (!tree || !tree.type) {
        throw new Error('mdast-util-to-nlcst expected node');
    }

    if (!file || !file.messages) {
        throw new Error('mdast-util-to-nlcst expected file');
    }

    /* Construct parser. */
    if (!Parser) {
        throw new Error('mdast-util-to-nlcst expected parser');
    }

    location = vfileLocation(file);

    if (
        !tree.position ||
        !tree.position.start ||
        !tree.position.start.column ||
        !tree.position.start.line
    ) {
        throw new Error('mdast-util-to-nlcst expected position on nodes');
    }

    parser = 'parse' in Parser ? Parser : new Parser();

    /* Transform mdast into NLCST tokens, and pass these
     * into `parser.parse` to insert sentences, paragraphs
     * where needed. */
    return parser.parse(one(tree, null, null, file, location, parser));
}

/* Expose. */
module.exports = toNLCST;
