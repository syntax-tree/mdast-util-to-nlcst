// Dependencies:
var toNLCST = require('./index.js');
var inspect = require('unist-util-inspect');
var English = require('parse-english');
var remark = require('remark');
var vfile = require('vfile');

// Process:
var file = vfile('Some *foo*sball.');
var tree = remark().parse(file);

// Stringify:
var nlcst = toNLCST(tree, file, English);

// Which, when inspecting, yields:
console.log('txt', inspect.noColor(nlcst));
