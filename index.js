'use strict';

/* Dependencies. */
var repeat = require('repeat-string');
var vfileLocation = require('vfile-location');
var position = require('unist-util-position');
var toString = require('nlcst-to-string');

/* Expose. */
module.exports = toNLCST;

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

/* Transform `tree` into `nlcst`. */
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

/* Convert `node` into NLCST. */
function one(node, index, parent, file, location, parser) {
  var type = node.type;
  var doc = String(file);
  var start = location.toOffset(position.start(node));
  var end = location.toOffset(position.end(node));
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
    replacement = patch(parser.tokenize(node.alt), location, start + 2);
  } else if (
    type === 'text' ||
    type === 'escape'
  ) {
    replacement = patch(parser.tokenize(node.value), location, start);
  } else if (node.type === 'break') {
    replacement = patch([parser.tokenizeWhiteSpace('\n')], location, start);
  } else if (node.type === 'inlineCode') {
    replacement = patch([parser.tokenizeSource(doc.slice(start, end))], location, start);
  }

  return replacement || null;
}

/* Convert all nodes in `parent` (mdast) into NLCST. */
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
    endLine = position.start(node).line;

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

    pos = position.end(node);
    prevEndLine = pos.line;
    prevOffset = pos.offset;
  }

  return result;
}

/* Patch a position on each node in `nodes`.
 * `offset` is the offset in `file` this run of content
 * starts at. */
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
    };

    start = end;
  }

  return nodes;
}
