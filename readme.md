# mdast-util-to-nlcst [![Build Status](https://img.shields.io/travis/wooorm/mdast-util-to-nlcst.svg)](https://travis-ci.org/wooorm/mdast-util-to-nlcst) [![Coverage Status](https://img.shields.io/codecov/c/github/wooorm/mdast-util-to-nlcst.svg)](https://codecov.io/github/wooorm/mdast-util-to-nlcst)

[**mdast**](https://github.com/wooorm/mdast) utility to transform markdown
into [**nlcst**](https://github.com/wooorm/nlcst), while keeping location
information intact.

In plain English: this enables natural-language tooling to read markdown as
input.

> **Note** You probably want to use
> [remark-retext](https://github.com/wooorm/remark-retext).

## Installation

[npm](https://docs.npmjs.com/cli/install):

```bash
npm install mdast-util-to-nlcst
```

**mdast-util-to-nlcst** is also available for [bower](http://bower.io/#install-packages),
[component](https://github.com/componentjs/component), and
[duo](http://duojs.org/#getting-started), and as an AMD, CommonJS, and globals
module, [uncompressed](mdast-util-to-nlcst.js) and
[compressed](mdast-util-to-nlcst.min.js).

## Usage

```js
var toNLCST = require('mdast-util-to-nlcst');
var inspect = require('unist-util-inspect');
var remark = require('remark');
var retext = require('retext');

/*
 * Process.
 */

remark().process('Some *foo*s-_ball_.', function (err, file) {
    var tree = toNLCST(file, retext().Parser);

    console.log(inspect(tree));
    /*
     * Yields:
     *
     * RootNode[1] (1:1-1:20, 0-19)
     * └─ ParagraphNode[1] (1:1-1:20, 0-19)
     *    └─ SentenceNode[4] (1:1-1:20, 0-19)
     *       ├─ WordNode[1] (1:1-1:5, 0-4)
     *       │  └─ TextNode: "Some" (1:1-1:5, 0-4)
     *       ├─ WhiteSpaceNode: " " (1:5-1:6, 4-5)
     *       ├─ WordNode[4] (1:7-1:18, 6-17)
     *       │  ├─ TextNode: "foo" (1:7-1:10, 6-9)
     *       │  ├─ TextNode: "s" (1:11-1:12, 10-11)
     *       │  ├─ PunctuationNode: "-" (1:12-1:13, 11-12)
     *       │  └─ TextNode: "ball" (1:14-1:18, 13-17)
     *       └─ PunctuationNode: "." (1:19-1:20, 18-19)
     */
});
```

## API

### toNLCST(file, Parser | parser)

Transform a by [**remark**](https://github.com/wooorm/remark) processed
[**virtual file**](https://github.com/wooorm/vfile) into an
[NLCST](https://github.com/wooorm/nlcst) tree for
[**retext**](https://github.com/wooorm/retext).

Parameters:

*   `file` (`File`)
    — [Virtual file](https://github.com/wooorm/vfile), must be passed through
    [`parse()`](https://github.com/wooorm/remark/blob/master/doc/remark.3.md#remarkparsefile-options).

*   `parser` (`Function` or `Parser`, optional)
    — You can pass the (constructor of) an NLCST parser, such as
    [**parse-english**](https://github.com/wooorm/parse-english),
    [**parse-dutch**](https://github.com/wooorm/parse-dutch), or
    [**parse-latin**](https://github.com/wooorm/parse-latin).

Returns:

[`NLCSTNode`](https://github.com/wooorm/nlcst).

## License

[MIT](LICENSE) © [Titus Wormer](http://wooorm.com)
