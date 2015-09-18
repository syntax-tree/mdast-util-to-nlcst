'use strict';

/* eslint-env node, mocha */

/*
 * Dependencies.
 */

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var mdast = require('mdast');
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

describe('mdast-util-to-nlcst', function () {
    it('should fail when not given a file', function () {
        assert.throws(function () {
            toNLCST();
        }, /mdast-util-to-nlcst expected file/);

        assert.throws(function () {
            toNLCST({});
        }, /mdast-util-to-nlcst expected file/);
    });

    it('should fail when not given an AST', function () {
        assert.throws(function () {
            toNLCST(toFile());
        }, /mdast-util-to-nlcst expected node/);

        assert.throws(function () {
            toNLCST(toFile({}));
        }, /mdast-util-to-nlcst expected node/);
    });

    it('should fail when not given a file', function () {
        var node = {
            'type': 'text',
            'value': 'foo'
        };

        assert.throws(function () {
            toNLCST(node);
        }, /mdast-util-to-nlcst expected file/);

        assert.throws(function () {
            toNLCST(node, {
                'foo': 'bar'
            });
        }, /mdast-util-to-nlcst expected file/);
    });

    it('should fail when not given positional information', function () {
        assert.throws(function () {
            toNLCST(toFile({
                'type': 'text',
                'value': 'foo'
            }));
        }, /mdast-util-to-nlcst expected position on nodes/);

        assert.throws(function () {
            toNLCST(toFile({
                'type': 'text',
                'value': 'foo',
                'position': {
                    'start': {},
                    'end': {}
                }
            }));
        }, /mdast-util-to-nlcst expected position on nodes/);
    });

    it('should accept nodes without offsets', function () {
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

        assert.equal(node.position.start.offset, 0);
        assert.equal(node.position.end.offset, 3);
    });

    it('should accept a parser', function () {
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

        assert.throws(function () {
            toNLCST(toFile(node));
        }, /mdast-util-to-nlcst expected parser/);

        assert.doesNotThrow(function () {
            toNLCST(toFile(node), English);
        });

        assert.doesNotThrow(function () {
            toNLCST(toFile(node), Dutch);
        });

        assert.doesNotThrow(function () {
            toNLCST(toFile(node), new English());
        });

        assert.doesNotThrow(function () {
            toNLCST(toFile(node), new Dutch());
        });
    });
});

/**
 * Describe a fixture.
 *
 * @param {string} fixture - Name of fixture.
 */
function describeFixture(fixture) {
    it('should work on `' + fixture + '`', function (done) {
        var filepath = join(ROOT, fixture);
        var output = read(join(filepath, 'output.json'), 'utf-8');
        var input = read(join(filepath, 'input.md'), 'utf-8');

        mdast().process(input, function (err, file) {
            assert.deepEqual(toNLCST(file, Latin), JSON.parse(output));
            done(err);
        });
    });
}

/*
 * Skip hidden files.
 */

fixtures = fixtures.filter(function (filepath) {
    return filepath.indexOf('.') !== 0;
});

/*
 * Assert fixtures.
 */

describe('Fixtures', function () {
    fixtures.forEach(describeFixture);
});
