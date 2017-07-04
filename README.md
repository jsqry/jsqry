# jsqry
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/xonixx/jsqry/master/LICENSE)
[![npm](https://img.shields.io/npm/v/jsqry.svg)](https://www.npmjs.com/package/jsqry)

Simple lib to query JS objects/arrays.

Before:
```js
var name;
for (var i = 0; i < users.length; i++) {
    if (users[i].id == 123) {
        name = users[i].name;
        break;
    }
}

```
After:
```js
var name = one(users, '[_.id==?].name', 123);
```

This tiny lib allows to query JS object/arrays in one-liner fashion instead of writing (nested) loops.

Features include:

1. Filtering
1. Mapping
1. Python-style array indexing & slicing

More examples of usage: [spec.js](/spec.js)

## Install

```
npm install jsqry
```
