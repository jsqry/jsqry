# jsqry
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/xonixx/jsqry/master/LICENSE)
[![npm](https://img.shields.io/npm/v/jsqry.svg)](https://www.npmjs.com/package/jsqry)

Simple lib to query JS objects/arrays.

This tiny lib allows to query JS object/arrays in one-liner fashion instead of writing loops (possibly nested).

Before:

```javascript
var name;
for (var i = 0; i < users.length; i++) {
    if (users[i].id == 123) {
        name = users[i].name;
        break;
    }
}
```

After:

```javascript
var name = first(users, '[_.id==?].name', 123);
```

Features include:

* Filtering
* Mapping
* Python-style array indexing & slicing
* lot more!

## Documentation

For docs and examples please visit [jsqry.github.io](https://jsqry.github.io/).

## Install

#### Nodejs
```bash
npm install jsqry
```

or

```bash
yarn add jsqry
```

#### Web

```html
<script src="https://cdn.jsdelivr.net/gh/jsqry/jsqry@1.2.0/jsqry.js"></script>
```
