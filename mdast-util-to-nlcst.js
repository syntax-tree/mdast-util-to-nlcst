(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.mdastUtilToNLCST = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
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

var NON_NEWLINE = /[^\n]/;

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

    while (++index < length) {
        child = one(children[index], index, parent, file, parser);

        if (child) {
            result = result.concat(child);
        }
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
    var siblings = parent && parent.children;
    var prev = siblings && siblings[index - 1];
    var pos = node.position;
    var start = pos.start;
    var end = pos.end;
    var final = prev && prev.position.end.offset;
    var replacement;
    var result;
    var space;

    space = final && file.toString().slice(final, start.offset);

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

    /**
     * There’s a difference between block-nodes with
     * lines between them. NLCST parsers need them to
     * differentiate between paragraphs.
     */

    if (replacement && space && !NON_NEWLINE.test(space)) {
        result = parser.tokenizeWhiteSpace(space);

        patch([result], file, final);

        replacement.unshift(result);
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

},{"nlcst-to-string":2,"remark-range":3}],2:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2014-2015 Titus Wormer
 * @license MIT
 * @module nlcst:to-string
 * @fileoverview Transform an NLCST node into a string.
 */

'use strict';

/* eslint-env commonjs */

/**
 * Stringify an NLCST node.
 *
 * @param {NLCSTNode|Array.<NLCSTNode>} node - Node to to
 *   stringify.
 * @param {string} separator - Value to separate each item
 *   with.
 * @return {string} - Stringified `node`.
 */
function nlcstToString(node, separator) {
    var values;
    var length;
    var children;

    separator = separator || '';

    if (typeof node.value === 'string') {
        return node.value;
    }

    children = 'length' in node ? node : node.children;
    length = children.length;

    /*
     * Shortcut: This is pretty common, and a small performance win.
     */

    if (length === 1 && 'value' in children[0]) {
        return children[0].value;
    }

    values = [];

    while (length--) {
        values[length] = nlcstToString(children[length], separator);
    }

    return values.join(separator);
}

/*
 * Expose.
 */

module.exports = nlcstToString;

},{}],3:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer
 * @license MIT
 * @module remark:range
 * @fileoverview Patch index-based range on mdast nodes.
 */

'use strict';

/* eslint-env commonjs */

/*
 * Dependencies.
 */

var visit = require('unist-util-visit');

/**
 * Calculate offsets for `lines`.
 *
 * @param {Array.<string>} lines - Lines to compile.
 * @return {Array.<number>} - List of offsets per line.
 */
function toOffsets(lines) {
    var total = 0;
    var index = -1;
    var length = lines.length;
    var result = [];

    while (++index < length) {
        result[index] = total += lines[index].length + 1;
    }

    return result;
}

/**
 * Add an offset based on `offsets` to `position`.
 *
 * @param {Object} position - Position.
 * @param {Function} fn - Calculator.
 */
function addRange(position, fn) {
    position.offset = fn(position);
}

/**
 * Factory to reverse an offset into a line--column
 * tuple.
 *
 * @param {Array.<number>} offsets - Offsets, as returned
 *   by `toOffsets()`.
 * @return {Function} - Bound method.
 */
function positionToOffsetFactory(offsets) {
    /**
     * Calculate offsets for `lines`.
     *
     * @param {Object} position - Position.
     * @return {Object} - Object with `line` and `colymn`
     *   properties based on the bound `offsets`.
     */
    function positionToOffset(position) {
        var line = position && position.line;
        var column = position && position.column;

        if (!isNaN(line) && !isNaN(column)) {
            return ((offsets[line - 2] || 0) + column - 1) || 0;
        }

        return -1;
    }

    return positionToOffset;
}

/**
 * Factory to reverse an offset into a line--column
 * tuple.
 *
 * @param {Array.<number>} offsets - Offsets, as returned
 *   by `toOffsets()`.
 * @return {Function} - Bound method.
 */
function offsetToPositionFactory(offsets) {
    /**
     * Calculate offsets for `lines`.
     *
     * @param {number} offset - Offset.
     * @return {Object} - Object with `line` and `colymn`
     *   properties based on the bound `offsets`.
     */
    function offsetToPosition(offset) {
        var index = -1;
        var length = offsets.length;

        if (offset < 0) {
            return {};
        }

        while (++index < length) {
            if (offsets[index] > offset) {
                return {
                    'line': index + 1,
                    'column': (offset - (offsets[index - 1] || 0)) + 1
                };
            }
        }

        return {};
    }

    return offsetToPosition;
}

/**
 * Add ranges for `ast`.
 *
 * @param {Node} ast - Context to patch.
 * @param {VFile} file - Virtual file.
 */
function transformer(ast, file) {
    var contents = String(file).split('\n');
    var positionToOffset;

    /*
     * Invalid.
     */

    if (!file || typeof file.contents !== 'string') {
        throw new Error('Missing `file` for remark-range');
    }

    /*
     * Construct.
     */

    contents = toOffsets(contents);
    positionToOffset = positionToOffsetFactory(contents);

    /*
     * Expose methods.
     */

    file.offsetToPosition = offsetToPositionFactory(contents);
    file.positionToOffset = positionToOffset;

    /*
     * Add `offset` on both `start` and `end`.
     */

    visit(ast, function (node) {
        var position = node.position;

        if (position && position.start) {
            addRange(position.start, positionToOffset);
        }

        if (position && position.end) {
            addRange(position.end, positionToOffset);
        }
    });
}

/**
 * Attacher.
 *
 * @return {Function} - `transformer`.
 */
function attacher() {
    return transformer;
}

/*
 * Expose.
 */

module.exports = attacher;

},{"unist-util-visit":4}],4:[function(require,module,exports){
/**
 * @author Titus Wormer
 * @copyright 2015 Titus Wormer. All rights reserved.
 * @module unist:util:visit
 * @fileoverview Utility to recursively walk over unist nodes.
 */

'use strict';

/**
 * Walk forwards.
 *
 * @param {Array.<*>} values - Things to iterate over,
 *   forwards.
 * @param {function(*, number): boolean} callback - Function
 *   to invoke.
 * @return {boolean} - False if iteration stopped.
 */
function forwards(values, callback) {
    var index = -1;
    var length = values.length;

    while (++index < length) {
        if (callback(values[index], index) === false) {
            return false;
        }
    }

    return true;
}

/**
 * Walk backwards.
 *
 * @param {Array.<*>} values - Things to iterate over,
 *   backwards.
 * @param {function(*, number): boolean} callback - Function
 *   to invoke.
 * @return {boolean} - False if iteration stopped.
 */
function backwards(values, callback) {
    var index = values.length;
    var length = -1;

    while (--index > length) {
        if (callback(values[index], index) === false) {
            return false;
        }
    }

    return true;
}

/**
 * Visit.
 *
 * @param {Node} tree - Root node
 * @param {string} [type] - Node type.
 * @param {function(node): boolean?} callback - Invoked
 *   with each found node.  Can return `false` to stop.
 * @param {boolean} [reverse] - By default, `visit` will
 *   walk forwards, when `reverse` is `true`, `visit`
 *   walks backwards.
 */
function visit(tree, type, callback, reverse) {
    var iterate;
    var one;
    var all;

    if (typeof type === 'function') {
        reverse = callback;
        callback = type;
        type = null;
    }

    iterate = reverse ? backwards : forwards;

    /**
     * Visit `children` in `parent`.
     */
    all = function (children, parent) {
        return iterate(children, function (child, index) {
            return child && one(child, index, parent);
        });
    };

    /**
     * Visit a single node.
     */
    one = function (node, index, parent) {
        var result;

        index = index || (parent ? 0 : null);

        if (!type || node.type === type) {
            result = callback(node, index, parent || null);
        }

        if (node.children && result !== false) {
            return all(node.children, node);
        }

        return result;
    };

    one(tree);
}

/*
 * Expose.
 */

module.exports = visit;

},{}]},{},[1])(1)
});