'use strict';

/* eslint-env node */

/*
 * Dependencies.
 */

var fs = require('fs');
var path = require('path');
var test = require('tape');
var remark = require('remark');
var VFile = require('vfile');
var Latin = require('parse-latin');
var Dutch = require('parse-dutch');
var English = require('parse-english');
var toNLCST = require('..');

/*
 * Methods.
 */

var read = fs.readFileSync;
var join = path.join;

/*
 * Constants.
 */

var ROOT = join(__dirname, 'fixtures');

/*
 * Fixtures.
 */

var fixtures = fs.readdirSync(ROOT);

/**
 * Helper to create a new file from a given cst.
 */
function toFile(tree) {
    var file = new VFile();

    file.namespace('mdast').tree = tree;

    return file;
}

/*
 * Tests.
 */

test('mdast-util-to-nlcst', function (t) {
    t.throws(
        function () {
            toNLCST();
        },
        /mdast-util-to-nlcst expected file/,
        'should fail when not given a file'
    );

    t.throws(
        function () {
            toNLCST({});
        },
        /mdast-util-to-nlcst expected file/,
        'should fail when not given a file (#2)'
    );

    t.throws(
        function () {
            toNLCST(toFile());
        },
        /mdast-util-to-nlcst expected node/,
        'should fail when not given an AST'
    );

    t.throws(
        function () {
            toNLCST(toFile({}));
        },
        /mdast-util-to-nlcst expected node/,
        'should fail when not given an AST (#2)'
    );

    t.throws(
        function () {
            toNLCST({
                'type': 'text',
                'value': 'foo'
            });
        },
        /mdast-util-to-nlcst expected file/,
        'should fail when not given a file'
    );

    t.throws(
        function () {
            toNLCST({
                'type': 'text',
                'value': 'foo'
            }, {
                'foo': 'bar'
            });
        },
        /mdast-util-to-nlcst expected file/,
        'should fail when not given a file (#2)'
    );

    t.throws(
        function () {
            toNLCST(toFile({
                'type': 'text',
                'value': 'foo'
            }));
        },
        /mdast-util-to-nlcst expected position on nodes/,
        'should fail when not given positional information'
    );

    t.throws(
        function () {
            toNLCST(toFile({
                'type': 'text',
                'value': 'foo',
                'position': {
                    'start': {},
                    'end': {}
                }
            }));
        },
        /mdast-util-to-nlcst expected position on nodes/,
        'should fail when not given positional information (#2)'
    );

    t.test('should accept nodes without offsets', function (st) {
        var node = {
            'type': 'text',
            'value': 'foo',
            'position': {
                'start': {
                    'line': 1,
                    'column': 1
                },
                'end': {
                    'line': 1,
                    'column': 4
                }
            }
        };

        toNLCST(toFile(node), Latin);

        st.equal(node.position.start.offset, 0);
        st.equal(node.position.end.offset, 3);

        st.end();
    });

    t.test('should accept a parser', function (st) {
        var node = {
            'type': 'text',
            'value': 'foo',
            'position': {
                'start': {
                    'line': 1,
                    'column': 1
                },
                'end': {
                    'line': 1,
                    'column': 4
                }
            }
        };

        st.throws(function () {
            toNLCST(toFile(node));
        }, /mdast-util-to-nlcst expected parser/);

        st.doesNotThrow(function () {
            toNLCST(toFile(node), English);
        });

        st.doesNotThrow(function () {
            toNLCST(toFile(node), Dutch);
        });

        st.doesNotThrow(function () {
            toNLCST(toFile(node), new English());
        });

        st.doesNotThrow(function () {
            toNLCST(toFile(node), new Dutch());
        });

        st.end();
    });
});

/*
 * Assert fixtures.
 */

test('Fixtures', function (t) {
    fixtures
        .filter(function (filepath) {
            return filepath.indexOf('.') !== 0;
        })
        .forEach(function (fixture) {
            var filepath = join(ROOT, fixture);
            var output = read(join(filepath, 'output.json'), 'utf-8');
            var input = read(join(filepath, 'input.md'), 'utf-8');

            remark().process(input, function (err, file) {
                t.ifError(err, 'shouldn’t fail');

                t.deepEqual(
                    toNLCST(file, Latin),
                    JSON.parse(output),
                    'should work on `' + fixture + '`'
                );
            });
        });

    t.end();
});
