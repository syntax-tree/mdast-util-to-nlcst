# mdast-util-to-nlcst [![Build Status][travis-badge]][travis] [![Coverage Status][codecov-badge]][codecov]

<!--lint disable heading-increment list-item-spacing-->

Transform [MDAST][] to [NLCST][].

> **Note** You probably want to use [remark-retext][].

## Installation

[npm][npm-install]:

```bash
npm install mdast-util-to-nlcst
```

## Usage

Dependencies:

```javascript
var toNLCST = require('mdast-util-to-nlcst');
var inspect = require('unist-util-inspect');
var English = require('parse-english');
var remark = require('remark');
var vfile = require('vfile');
```

Process:

```javascript
var file = vfile('Some *foo*sball.');
var tree = remark().parse(file);
```

Stringify:

```javascript
var nlcst = toNLCST(tree, file, English);
```

Which, when inspecting, yields:

```txt
RootNode[1] (1:1-1:17, 0-16)
└─ ParagraphNode[1] (1:1-1:17, 0-16)
   └─ SentenceNode[4] (1:1-1:17, 0-16)
      ├─ WordNode[1] (1:1-1:5, 0-4)
      │  └─ TextNode: "Some" (1:1-1:5, 0-4)
      ├─ WhiteSpaceNode: " " (1:5-1:6, 4-5)
      ├─ WordNode[2] (1:7-1:16, 6-15)
      │  ├─ TextNode: "foo" (1:7-1:10, 6-9)
      │  └─ TextNode: "sball" (1:11-1:16, 10-15)
      └─ PunctuationNode: "." (1:16-1:17, 15-16)
```

## API

### `toNLCST(node, file, Parser)`

Transform an [MDAST][] syntax tree and corresponding [virtual file][vfile]
into an [NLCST][nlcst] tree.

###### Parameters

*   `node` ([`MDASTNode`][mdast]) — Syntax tree (with positional
    information);
*   `file` ([`VFile`][vfile]);
*   `parser` (`Function`)
    — Constructor of an NLCST parser, such as
    [**parse-english**][english], [**parse-dutch**][dutch],
    or [**parse-latin**][latin].

###### Returns

[`NLCSTNode`][nlcst].

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/wooorm/mdast-util-to-nlcst.svg

[travis]: https://travis-ci.org/wooorm/mdast-util-to-nlcst

[codecov-badge]: https://img.shields.io/codecov/c/github/wooorm/mdast-util-to-nlcst.svg

[codecov]: https://codecov.io/github/wooorm/mdast-util-to-nlcst

[npm-install]: https://docs.npmjs.com/cli/install

[license]: LICENSE

[author]: http://wooorm.com

[mdast]: https://github.com/wooorm/mdast

[nlcst]: https://github.com/wooorm/nlcst

[remark-retext]: https://github.com/wooorm/remark-retext

[vfile]: https://github.com/wooorm/vfile

[english]: https://github.com/wooorm/parse-english

[latin]: https://github.com/wooorm/parse-latin

[dutch]: https://github.com/wooorm/parse-dutch
