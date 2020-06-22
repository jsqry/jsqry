#!/usr/bin/env bash

node -i -e '
const jsqry=require("./jsqry");
const { query, first } = jsqry;
const parse = jsqry.parse;
jsqry.parse = function (expr) {
    const res = parse(expr);
    console.info("PARSE: " + expr + " --> " + jsqry.printAst(res));
    return res;
};
'