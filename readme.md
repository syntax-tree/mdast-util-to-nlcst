# mdast-util-to-nlcst [![Build Status](https://img.shields.io/travis/wooorm/mdast-util-to-nlcst.svg)](https://travis-ci.org/wooorm/mdast-util-to-nlcst) [![Coverage Status](https://img.shields.io/codecov/c/github/wooorm/mdast-util-to-nlcst.svg)](https://codecov.io/github/wooorm/mdast-util-to-nlcst)

[**mdast**](https://github.com/wooorm/mdast) utility to transform markdown
into [**nlcst**](https://github.com/wooorm/nlcst), while keeping location
information intact.

In plain English: this enables natural-language tooling to read markdown as
input.

> **Note** The interface is pretty rough. But in the future this will be built
> into mdast/retext, something called “bridging”, so you won’t have to
> use this library manually in the future :smile:!

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
/*
 * Dependencies.
 */

var mdast = require('mdast');
var toNLCST = require('mdast-util-to-nlcst');

/*
 * Process.
 */

mdast.process('Some *foo*s-_ball_.', function (err, doc, file) {
    toNLCST(file);
    console.log(file.namespace('retext').cst);
    /*
     * Yields:
     *
     * Object
     * ├─ type: "RootNode"
     * ├─ position: Object
     * |  └─ start: Object
     * |  |  ├─ line: 1
     * |  |  ├─ column: 1
     * |  |  └─ offset: 0
     * |  └─ end: Object
     * |     ├─ line: 1
     * |     ├─ column: 20
     * |     └─ offset: 19
     * └─ children: Array[1]
     *    └─ 0: Object
     *          ├─ type: "ParagraphNode"
     *          ├─ position: Object
     *          |  └─ start: Object
     *          |  |  ├─ line: 1
     *          |  |  ├─ column: 1
     *          |  |  └─ offset: 0
     *          |  └─ end: Object
     *          |     ├─ line: 1
     *          |     ├─ column: 20
     *          |     └─ offset: 19
     *          └─ children: Array[1]
     *             └─ 0: Object
     *                   ├─ type: "SentenceNode"
     *                   ├─ position: Object
     *                   |  └─ start: Object
     *                   |  |  ├─ line: 1
     *                   |  |  ├─ column: 1
     *                   |  |  └─ offset: 0
     *                   |  └─ end: Object
     *                   |     ├─ line: 1
     *                   |     ├─ column: 20
     *                   |     └─ offset: 19
     *                   └─ children: Array[4]
     *                      ├─ 0: Object
     *                      |     ├─ type: "WordNode"
     *                      |     ├─ position: Object
     *                      |     |  └─ start: Object
     *                      |     |  |  ├─ line: 1
     *                      |     |  |  ├─ column: 1
     *                      |     |  |  └─ offset: 0
     *                      |     |  └─ end: Object
     *                      |     |     ├─ line: 1
     *                      |     |     ├─ column: 5
     *                      |     |     └─ offset: 4
     *                      |     └─ children: Array[1]
     *                      |        └─ 0: Object
     *                      |              ├─ type: "TextNode"
     *                      |              ├─ position: Object
     *                      |              |  └─ start: Object
     *                      |              |  |  ├─ line: 1
     *                      |              |  |  ├─ column: 1
     *                      |              |  |  └─ offset: 0
     *                      |              |  └─ end: Object
     *                      |              |     ├─ line: 1
     *                      |              |     ├─ column: 5
     *                      |              |     └─ offset: 4
     *                      |              └─ value: "Some"
     *                      ├─ 1: Object
     *                      |     ├─ type: "WhiteSpaceNode"
     *                      |     ├─ position: Object
     *                      |     |  └─ start: Object
     *                      |     |  |  ├─ line: 1
     *                      |     |  |  ├─ column: 5
     *                      |     |  |  └─ offset: 4
     *                      |     |  └─ end: Object
     *                      |     |     ├─ line: 1
     *                      |     |     ├─ column: 6
     *                      |     |     └─ offset: 5
     *                      |     └─ value: " "
     *                      ├─ 2: Object
     *                      |     ├─ type: "WordNode"
     *                      |     ├─ position: Object
     *                      |     |  └─ start: Object
     *                      |     |  |  ├─ line: 1
     *                      |     |  |  ├─ column: 7
     *                      |     |  |  └─ offset: 6
     *                      |     |  └─ end: Object
     *                      |     |     ├─ line: 1
     *                      |     |     ├─ column: 18
     *                      |     |     └─ offset: 17
     *                      |     └─ children: Array[4]
     *                      |        ├─ 0: Object
     *                      |        |     ├─ type: "TextNode"
     *                      |        |     ├─ position: Object
     *                      |        |     |  └─ start: Object
     *                      |        |     |  |  ├─ line: 1
     *                      |        |     |  |  ├─ column: 7
     *                      |        |     |  |  └─ offset: 6
     *                      |        |     |  └─ end: Object
     *                      |        |     |     ├─ line: 1
     *                      |        |     |     ├─ column: 10
     *                      |        |     |     └─ offset: 9
     *                      |        |     └─ value: "foo"
     *                      |        ├─ 1: Object
     *                      |        |     ├─ type: "TextNode"
     *                      |        |     ├─ position: Object
     *                      |        |     |  └─ start: Object
     *                      |        |     |  |  ├─ line: 1
     *                      |        |     |  |  ├─ column: 11
     *                      |        |     |  |  └─ offset: 10
     *                      |        |     |  └─ end: Object
     *                      |        |     |     ├─ line: 1
     *                      |        |     |     ├─ column: 12
     *                      |        |     |     └─ offset: 11
     *                      |        |     └─ value: "s"
     *                      |        ├─ 2: Object
     *                      |        |     ├─ type: "PunctuationNode"
     *                      |        |     ├─ position: Object
     *                      |        |     |  └─ start: Object
     *                      |        |     |  |  ├─ line: 1
     *                      |        |     |  |  ├─ column: 12
     *                      |        |     |  |  └─ offset: 11
     *                      |        |     |  └─ end: Object
     *                      |        |     |     ├─ line: 1
     *                      |        |     |     ├─ column: 13
     *                      |        |     |     └─ offset: 12
     *                      |        |     └─ value: "-"
     *                      |        └─ 3: Object
     *                      |              ├─ type: "TextNode"
     *                      |              ├─ position: Object
     *                      |              |  └─ start: Object
     *                      |              |  |  ├─ line: 1
     *                      |              |  |  ├─ column: 14
     *                      |              |  |  └─ offset: 13
     *                      |              |  └─ end: Object
     *                      |              |     ├─ line: 1
     *                      |              |     ├─ column: 18
     *                      |              |     └─ offset: 17
     *                      |              └─ value: "ball"
     *                      └─ 3: Object
     *                            ├─ type: "PunctuationNode"
     *                            ├─ position: Object
     *                            |  └─ start: Object
     *                            |  |  ├─ line: 1
     *                            |  |  ├─ column: 19
     *                            |  |  └─ offset: 18
     *                            |  └─ end: Object
     *                            |     ├─ line: 1
     *                            |     ├─ column: 20
     *                            |     └─ offset: 19
     *                            └─ value: "."
     */
});
```

## API

### toNLCST(file\[, Parser | parser\])

Transform a by [**mdast**](https://github.com/wooorm/mdast) processed
[**virtual file**](https://github.com/wooorm/vfile) into an file ready
for processing by [**retext**](https://github.com/wooorm/retext).

Parameters:

*   `file` (`File`)
    — [Virtual file](https://github.com/wooorm/vfile), must be passed through
    [`parse()`](https://github.com/wooorm/mdast/blob/master/doc/mdast.3.md#mdastparsefile-options).

*   `parser` (`Function` or `Parser`, default: `new ParseLatin()`, optional)
    — You can pass the (constructor of) an NLCST parser, such as
    [**parse-english**](https://github.com/wooorm/parse-english) or
    [**parse-dutch**](https://github.com/wooorm/parse-dutch), the default is
    [**parse-latin**](https://github.com/wooorm/parse-latin).

Returns:

[`NLCSTNode`](https://github.com/wooorm/nlcst).

## License

[MIT](LICENSE) © [Titus Wormer](http://wooorm.com)
