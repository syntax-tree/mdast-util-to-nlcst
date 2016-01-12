/**
 * @author Titus Wormer
 * @copyright 2015-2016 Titus Wormer
 * @license MIT
 * @module mdast:util:to-nlcst
 * @fileoverview Create a Natural Language Concrete Syntax Tree from
 *   a Markdown Abstract Syntax Tree.
 */

'use strict';

/* eslint-env commonjs */

/*
 * Dependencies.
 */

var range = require('remark-range');
var toString = require('nlcst-to-string');
var repeat = require('repeat-string');

/*
 * Map of ignored mdast nodes: nodes which have no (simple)
 * representation in NLCST.
 */

var IGNORE = {
    'horizontalRule': true,
    'table': true,
    'tableRow': true,
    'tableCell': true
};

/*
 * Constants.
 */

var C_NEWLINE = '\n';

/**
 * Create an position object for `offset` in `file`.
 *
 * @param {number} offset - Offset in `file`.
 * @param {File} file - Virtual file.
 * @return {Object} - Positional information.
 */
function position(offset, file) {
    var pos = file.offsetToPosition(offset);

    pos.offset = offset;

    return pos;
}

/**
 * Create a location object for `start` and `end` in
 * `file`.
 *
 * @param {number} start - Starting offset in `file`.
 * @param {number} end - Ending offset in `file`.
 * @param {File} file - Virtual file.
 * @return {Object} - Location information.
 */
function location(start, end, file) {
    return {
        'start': position(start, file),
        'end': position(end, file)
    };
}

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
 * @param {File} file - Virtual file.
 * @param {number} offset - Starting offset for `nodes`.
 * @return {Array.<NLCSTNode>} - `nodes`.
 */
function patch(nodes, file, offset) {
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
            patch(children, file, start);
        }

        end = start + toString(node).length;

        node.position = location(start, end, file);

        start = end;
    }

    return nodes;
}

/*
 * Transformers.
 */

var all;
var one;

/**
 * Convert all nodes in `parent` (mdast) into NLCST.
 *
 * @param {MDASTNode} parent - Parent node.
 * @param {File} file - Virtual file.
 * @param {Parser} parser - NLCST parser.
 * @return {Array.<NLCSTNode>} - Concatenation of calling
 *   `one` on each MDASTNode in `parent`.
 */
all = function (parent, file, parser) {
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

            patch([child], file, prevOffset);

            if (child.value.length < 2) {
                child.value = repeat(C_NEWLINE, 2);
            }

            result.push(child);
        }

        child = one(node, index, parent, file, parser);

        if (child) {
            result = result.concat(child);
        }

        prevEndLine = pos.end.line;
        prevOffset = pos.end.offset;
    }

    return result;
};

/**
 * Convert `node` into NLCST.
 *
 * @param {MDASTNode} node - Node.
 * @param {number} index - Position of `node` in `parent`.
 * @param {MDASTNode} parent - Parent node of `node`.
 * @param {File} file - Virtual file.
 * @param {Parser} parser - NLCST parser.
 * @return {Array.<NLCSTNode>?} - A list of NLCST nodes, if
 *   `node` could be converted.
 */
one = function (node, index, parent, file, parser) {
    var type = node.type;
    var pos = node.position;
    var start = pos.start;
    var end = pos.end;
    var replacement;

    if (type in IGNORE) {
        return null;
    }

    if (node.children) {
        replacement = all(node, file, parser);
    } else if (
        type === 'image' ||
        type === 'imageReference'
    ) {
        replacement = patch(parser.tokenize(
            node.alt
        ), file, start.offset + 2);
    } else if (
        type === 'text' ||
        type === 'escape'
    ) {
        replacement = patch(parser.tokenize(node.value), file, start.offset);
    } else if (node.type === 'break') {
        replacement = patch([
            parser.tokenizeWhiteSpace('\n')
        ], file, start.offset);
    } else if (node.type === 'inlineCode') {
        replacement = patch([parser.tokenizeSource(
            file.toString().slice(start.offset, end.offset)
        )], file, start.offset);
    }

    return replacement || null;
};

/**
 * Transform `ast` into `nlcst`.
 *
 * @param {File} file - Virtual file.
 * @param {Parser|Function} Parser - (Instance of) NLCST
 *   parser.
 * @return {NLCSTNode} - NLCST.
 */
function toNLCST(file, Parser) {
    var ast;
    var space;
    var parser;

    /*
     * Warn for invalid parameters.
     */

    if (!file || !file.messages) {
        throw new Error('mdast-util-to-nlcst expected file');
    }

    space = file.namespace('mdast');
    ast = space.tree || space.ast;

    if (!ast || !ast.type) {
        throw new Error('mdast-util-to-nlcst expected node');
    }

    if (
        !ast.position ||
        !ast.position.start ||
        !ast.position.start.column ||
        !ast.position.start.line
    ) {
        throw new Error('mdast-util-to-nlcst expected position on nodes');
    }

    /*
     * Construct parser.
     */

    if (!Parser) {
        throw new Error('mdast-util-to-nlcst expected parser');
    }

    parser = 'parse' in Parser ? Parser : new Parser();

    /*
     * Patch ranges.
     */

    range()(ast, file);

    /*
     * Transform mdast into NLCST tokens, and pass these
     * into `parser.parse` to insert sentences, paragraphs
     * where needed.
     */

    return parser.parse(one(ast, null, null, file, parser));
}

/*
 * Expose.
 */

module.exports = toNLCST;
