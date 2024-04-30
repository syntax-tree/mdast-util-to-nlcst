# mdast-util-to-nlcst

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

[mdast][] utility to transform to [nlcst][].

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`toNlcst(tree, file, Parser[, options])`](#tonlcsttree-file-parser-options)
  * [`Options`](#options)
  * [`ParserConstructor`](#parserconstructor)
  * [`ParserInstance`](#parserinstance)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Related](#related)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a utility that takes an [mdast][] (markdown) syntax tree as
input and turns it into [nlcst][] (natural language).

## When should I use this?

This project is useful when you want to deal with ASTs and inspect the natural
language inside markdown.
Unfortunately, there is no way yet to apply changes to the nlcst back into
mdast.

The hast utility [`hast-util-to-nlcst`][hast-util-to-nlcst] does the same but
uses an HTML tree as input.

The remark plugin [`remark-retext`][remark-retext] wraps this utility to do the
same at a higher-level (easier) abstraction.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install mdast-util-to-nlcst
```

In Deno with [`esm.sh`][esmsh]:

```js
import {toNlcst} from 'https://esm.sh/mdast-util-to-nlcst@7'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {toNlcst} from 'https://esm.sh/mdast-util-to-nlcst@7?bundle'
</script>
```

## Use

Say we have the following `example.md`:

```markdown
Some *foo*sball.
```

…and next to it a module `example.js`:

```js
import {fromMarkdown} from 'mdast-util-from-markdown'
import {toNlcst} from 'mdast-util-to-nlcst'
import {ParseEnglish} from 'parse-english'
import {read} from 'to-vfile'
import {inspect} from 'unist-util-inspect'

const file = await read('example.md')
const mdast = fromMarkdown(file)
const nlcst = toNlcst(mdast, file, ParseEnglish)

console.log(inspect(nlcst))
```

Yields:

```txt
RootNode[1] (1:1-1:17, 0-16)
└─0 ParagraphNode[1] (1:1-1:17, 0-16)
    └─0 SentenceNode[4] (1:1-1:17, 0-16)
        ├─0 WordNode[1] (1:1-1:5, 0-4)
        │   └─0 TextNode "Some" (1:1-1:5, 0-4)
        ├─1 WhiteSpaceNode " " (1:5-1:6, 4-5)
        ├─2 WordNode[2] (1:7-1:16, 6-15)
        │   ├─0 TextNode "foo" (1:7-1:10, 6-9)
        │   └─1 TextNode "sball" (1:11-1:16, 10-15)
        └─3 PunctuationNode "." (1:16-1:17, 15-16)
```

## API

This package exports the identifier [`toNlcst`][api-to-nlcst].
There is no default export.

### `toNlcst(tree, file, Parser[, options])`

Turn an mdast tree into an nlcst tree.

> 👉 **Note**: `tree` must have positional info and `file` must be a `VFile`
> corresponding to `tree`.

###### Parameters

* `tree` ([`MdastNode`][mdast-node])
  — mdast tree to transform
* `file` ([`VFile`][vfile])
  — virtual file
* `Parser` ([`ParserConstructor`][api-parser-constructor] or
  [`ParserInstance`][api-parser-instance])
  — parser to use
* `options` ([`Options`][api-options], optional)
  — configuration

###### Returns

nlcst tree ([`NlcstNode`][nlcst-node]).

### `Options`

Configuration (TypeScript type).

##### Fields

###### `ignore`

List of [mdast][] node types to ignore (`Array<string>`, optional).

The types `'table'`, `'tableRow'`, and `'tableCell'` are always ignored.

<details><summary>Show example</summary>

Say we have the following file `example.md`:

```md
A paragraph.

> A paragraph in a block quote.
```

…and if we now transform with `ignore: ['blockquote']`, we get:

```txt
RootNode[2] (1:1-3:1, 0-14)
├─0 ParagraphNode[1] (1:1-1:13, 0-12)
│   └─0 SentenceNode[4] (1:1-1:13, 0-12)
│       ├─0 WordNode[1] (1:1-1:2, 0-1)
│       │   └─0 TextNode "A" (1:1-1:2, 0-1)
│       ├─1 WhiteSpaceNode " " (1:2-1:3, 1-2)
│       ├─2 WordNode[1] (1:3-1:12, 2-11)
│       │   └─0 TextNode "paragraph" (1:3-1:12, 2-11)
│       └─3 PunctuationNode "." (1:12-1:13, 11-12)
└─1 WhiteSpaceNode "\n\n" (1:13-3:1, 12-14)
```

</details>

###### `source`

List of [mdast][] node types to mark as [nlcst][] source nodes
(`Array<string>`, optional).

The type `'inlineCode'` is always marked as source.

<details><summary>Show example</summary>

Say we have the following file `example.md`:

```md
A paragraph.

> A paragraph in a block quote.
```

…and if we now transform with `source: ['blockquote']`, we get:

```txt
RootNode[3] (1:1-3:32, 0-45)
├─0 ParagraphNode[1] (1:1-1:13, 0-12)
│   └─0 SentenceNode[4] (1:1-1:13, 0-12)
│       ├─0 WordNode[1] (1:1-1:2, 0-1)
│       │   └─0 TextNode "A" (1:1-1:2, 0-1)
│       ├─1 WhiteSpaceNode " " (1:2-1:3, 1-2)
│       ├─2 WordNode[1] (1:3-1:12, 2-11)
│       │   └─0 TextNode "paragraph" (1:3-1:12, 2-11)
│       └─3 PunctuationNode "." (1:12-1:13, 11-12)
├─1 WhiteSpaceNode "\n\n" (1:13-3:1, 12-14)
└─2 ParagraphNode[1] (3:1-3:32, 14-45)
    └─0 SentenceNode[1] (3:1-3:32, 14-45)
        └─0 SourceNode "> A paragraph in a block quote." (3:1-3:32, 14-45)
```

</details>

### `ParserConstructor`

Create a new parser (TypeScript type).

###### Type

```ts
type ParserConstructor = new () => ParserInstance
```

### `ParserInstance`

nlcst parser (TypeScript type).

For example, [`parse-dutch`][parse-dutch], [`parse-english`][parse-english], or
[`parse-latin`][parse-latin].

###### Type

```ts
type ParserInstance = {
  tokenizeSentencePlugins: ((node: NlcstSentence) => undefined)[]
  tokenizeParagraphPlugins: ((node: NlcstParagraph) => undefined)[]
  tokenizeRootPlugins: ((node: NlcstRoot) => undefined)[]
  parse(value: string | null | undefined): NlcstRoot
  tokenize(value: string | null | undefined): Array<NlcstSentenceContent>
}
```

## Types

This package is fully typed with [TypeScript][].
It exports the types [`Options`][api-options],
[`ParserConstructor`][api-parser-constructor], and
[`ParserInstance`][api-parser-instance].

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `mdast-util-to-nlcst@^7`,
compatible with Node.js 16.

## Security

Use of `mdast-util-to-nlcst` does not involve [**hast**][hast] so there are no
openings for [cross-site scripting (XSS)][xss] attacks.

## Related

* [`mdast-util-to-hast`](https://github.com/syntax-tree/mdast-util-to-hast)
  — transform mdast to hast
* [`hast-util-to-nlcst`](https://github.com/syntax-tree/hast-util-to-nlcst)
  — transform hast to nlcst
* [`hast-util-to-mdast`](https://github.com/syntax-tree/hast-util-to-mdast)
  — transform hast to mdast
* [`hast-util-to-xast`](https://github.com/syntax-tree/hast-util-to-xast)
  — transform hast to xast
* [`hast-util-sanitize`](https://github.com/syntax-tree/hast-util-sanitize)
  — sanitize hast nodes

## Contribute

See [`contributing.md`][contributing] in [`syntax-tree/.github`][health] for
ways to get started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/syntax-tree/mdast-util-to-nlcst/workflows/main/badge.svg

[build]: https://github.com/syntax-tree/mdast-util-to-nlcst/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/syntax-tree/mdast-util-to-nlcst.svg

[coverage]: https://codecov.io/github/syntax-tree/mdast-util-to-nlcst

[downloads-badge]: https://img.shields.io/npm/dm/mdast-util-to-nlcst.svg

[downloads]: https://www.npmjs.com/package/mdast-util-to-nlcst

[size-badge]: https://img.shields.io/badge/dynamic/json?label=minzipped%20size&query=$.size.compressedSize&url=https://deno.bundlejs.com/?q=mdast-util-to-nlcst

[size]: https://bundlejs.com/?q=mdast-util-to-nlcst

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/syntax-tree/unist/discussions

[npm]: https://docs.npmjs.com/cli/install

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[typescript]: https://www.typescriptlang.org

[license]: license

[author]: https://wooorm.com

[health]: https://github.com/syntax-tree/.github

[contributing]: https://github.com/syntax-tree/.github/blob/main/contributing.md

[support]: https://github.com/syntax-tree/.github/blob/main/support.md

[coc]: https://github.com/syntax-tree/.github/blob/main/code-of-conduct.md

[xss]: https://en.wikipedia.org/wiki/Cross-site_scripting

[mdast]: https://github.com/syntax-tree/mdast

[mdast-node]: https://github.com/syntax-tree/mdast#nodes

[nlcst]: https://github.com/syntax-tree/nlcst

[nlcst-node]: https://github.com/syntax-tree/nlcst#node

[hast]: https://github.com/syntax-tree/hast

[hast-util-to-nlcst]: https://github.com/syntax-tree/hast-util-to-nlcst

[remark-retext]: https://github.com/remarkjs/remark-retext

[vfile]: https://github.com/vfile/vfile

[parse-english]: https://github.com/wooorm/parse-english

[parse-latin]: https://github.com/wooorm/parse-latin

[parse-dutch]: https://github.com/wooorm/parse-dutch

[api-to-nlcst]: #tonlcsttree-file-parser-options

[api-options]: #options

[api-parser-constructor]: #parserconstructor

[api-parser-instance]: #parserinstance
