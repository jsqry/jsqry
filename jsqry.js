(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node
        module.exports = factory();
    } else {
        // Browser
        root.jsqry = factory();
    }
}(this, function (undefined) {
    var fn = {};
    var jsqry = {
        first: first,
        query: query,
        cache: true,
        ast_cache: {},
        fn: fn,
        parse: parse,
        printAst: printAst
    };

    var TYPE_PATH = 1;
    var TYPE_CALL = 2;
    var TYPE_FILTER = 3;
    var TYPE_NESTED_FILTER = 4;
    var TYPE_MAP = 5;

    var SUB_TYPE_FUNC = 1;
    var SUB_TYPE_INDEX = 2;

    function printAst(ast) {
        var res = [];
        for (var i = 0; i < ast.length; i++) {
            var e = ast[i];
            var t = e.type;
            var v = e.val;
            if (t === TYPE_CALL)
                v = e.call + ',' + v;
            res.push((t === TYPE_PATH ? 'p' : t === TYPE_FILTER ? 'f' : t === TYPE_NESTED_FILTER ? 'F' : t === TYPE_MAP ? 'm' : 'c') + '(' + v + ')')
        }
        return res.join(' ');
    }

    function defined(v) {
        return v !== undefined;
    }

    function isArr(obj) {
        if (obj == null) return false;
        return defined(obj.length) && typeof obj !== 'string';
    }

    function funcToken(token) {
        token.sub_type = SUB_TYPE_FUNC;
        token.func = Function('_,i,args', 'return ' + token.val);
    }

    var goodPathRe = /^[A-Za-z0-9_]*$/;

    function parse(expr, arg_idx0) {
        var cached;
        if (jsqry.cache && (cached = jsqry.ast_cache[expr]))
            return cached;

        var expr0 = expr;
        arg_idx0 = arg_idx0 || 0;
        var arg_idx = arg_idx0;
        var ast = [];
        var token = {type: TYPE_PATH, val: ''};
        var depth_filter = 0; // nesting of []
        var depth_nested_filter = 0; // nesting of <<>>
        var depth_map = 0; // nesting of {}
        var depth_call = 0; // nesting of ()
        var prevType = null;

        function startNewTok(type) {
            var val = token.val = token.val.trim();
            var prevPrevType = prevType;
            prevType = token.type;
            if (token.call)
                token.call = token.call.trim();
            if (type === null && (prevType === TYPE_FILTER || prevType === TYPE_MAP || prevType === TYPE_CALL))
                throw 'Not closed ' + (prevType === TYPE_FILTER ? '[' : prevType === TYPE_MAP ? '{' : prevType === TYPE_CALL ? '(' : 'wtf');
            if (!val && prevType === TYPE_CALL) // handle 's()'
                val = token.val = '_';
            if (prevType === TYPE_PATH && (prevPrevType === TYPE_PATH && !val || val !== '*' && !goodPathRe.test(val)))
                throw 'Illegal path element "' + val + '" at pos ' + i;
            if (val) { // handle prev token
                ast.push(token);
                if (prevType === TYPE_FILTER) {
                    if (val.indexOf('_') >= 0 || val.indexOf('i') >= 0) { // function
                        funcToken(token)
                    } else { // index/slice
                        token.sub_type = SUB_TYPE_INDEX;
                        var idx = val.split(':');
                        token.index = idx;
                        for (var j = 0; j < idx.length; j++) {
                            idx[j] = parseInt(idx[j])
                        }
                    }
                } else if (prevType === TYPE_NESTED_FILTER) {
                    var _ast = jsqry.parse(val, arg_idx);
                    arg_idx += _ast.args_count;
                    token.func = function (e, i, args) {
                        var res = _queryAst(e, _ast, args);
                        for (var j=0; j<res.length;j++)
                            if (res[j])
                                return true;
                        return false;
                    };
                } else if (prevType === TYPE_MAP || prevType === TYPE_CALL && token.call) {
                    funcToken(token);
                }
            }
            token = {type: type, val: ''};
        }

        for (var i = 0; i < expr.length; i++) {
            var l = expr[i], next = expr[i + 1];
            if (l === '.') {
                if (token.type === TYPE_PATH)
                    startNewTok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '?' && token.type !== TYPE_PATH) {
                if (next === '?') {
                    token.val += l;
                    i++;
                } else
                    token.val += 'args[' + arg_idx++ + ']';
            } else if (l === '[') {
                if (depth_filter === 0 && token.type === TYPE_PATH)
                    startNewTok(TYPE_FILTER);
                else
                    token.val += l;
                depth_filter++;
            } else if (l === ']') {
                if (token.type === TYPE_PATH)
                    throw '] without [';
                if (token.type === TYPE_FILTER && --depth_filter === 0)
                    startNewTok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '<' && next === '<') {
                i++;
                if (depth_nested_filter === 0 && token.type === TYPE_PATH)
                    startNewTok(TYPE_NESTED_FILTER);
                else
                    token.val += l;
                depth_nested_filter++;
            } else if (l === '>' && next === '>') {
                i++;
                if (token.type === TYPE_PATH)
                    throw '>> without <<';
                if (token.type === TYPE_NESTED_FILTER && --depth_nested_filter === 0)
                    startNewTok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '{') {
                if (depth_map === 0 && token.type === TYPE_PATH)
                    startNewTok(TYPE_MAP);
                else
                    token.val += l;
                depth_map++;
            } else if (l === '}') {
                if (token.type === TYPE_PATH)
                    throw '} without {';
                if (token.type === TYPE_MAP && --depth_map === 0)
                    startNewTok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '(') {
                if (depth_call === 0 && token.type === TYPE_PATH) {
                    token.call = token.val;
                    token.val = '';
                    token.type = TYPE_CALL
                } else
                    token.val += l;
                depth_call++;
            } else if (l === ')') {
                if (token.type === TYPE_PATH)
                    throw ') without (';
                if (token.type === TYPE_CALL && --depth_call === 0)
                    startNewTok(TYPE_PATH);
                else
                    token.val += l;
            } else
                token.val += l;
        }

        startNewTok(null); // close

        ast.args_count = arg_idx - arg_idx0;

        if (jsqry.cache)
            jsqry.ast_cache[expr0] = ast;
        return ast;
    }

    function first(obj, expr) {
        var res = query.apply(null, arguments);
        return res.length ? res[0] : null;
    }

    function query(obj, expr) {
        var args = Array.prototype.slice.call(arguments, 2);
        var ast = jsqry.parse(expr);
        if (args.length !== ast.args_count)
            throw 'Wrong args count';
        return _queryAst(obj, ast, args);
    }

    function _queryAst(obj, ast, args) {
        if (!obj)
            return [];
        if (!isArr(obj))
            obj = [obj];

        for (var i = 0; i < ast.length; i++) {
            obj = exec(obj, ast[i], args)
        }

        return obj;
    }

    function normIdx(is_from, idx, len, step) {
        if (isNaN(idx))
            idx = is_from
                ? (step > 0 ? 0 : -1)
                : (step > 0 ? len : -len - 1);
        if (idx < 0)
            idx += len;
        return idx;
    }

    function calcIndex(list, index) {
        // console.info('idx', list, index)
        var res = [];
        var idx_cnt = index.length;
        var len = list.length;
        if (idx_cnt === 1) {
            var val = list[normIdx(1, index[0], len)];
            if (defined(val))
                res.push(val);
        } else if (idx_cnt >= 2) {
            var step = idx_cnt === 3 ? index[2] : 1;
            if (isNaN(step)) step = 1;
            var from = normIdx(1, index[0], len, step);
            var to = normIdx(0, index[1], len, step);
            for (var i = from; step > 0 ? i < to : i > to; i += step) {
                val = list[i];
                if (defined(val))
                    res.push(val);
            }
        }
        return res;
    }

    function sortFn(a, b) {
        return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0
    }

    fn.s = function (pairs, res) {
        pairs.sort(sortFn);
        for (var i = 0; i < pairs.length; i++) {
            res.push(pairs[i][0]);
        }
    };
    fn.u = function (pairs, res) {
        var exists = {};
        for (var i = 0; i < pairs.length; i++) {
            var p = pairs[i];
            if (!exists[p[1]]) {
                exists[p[1]] = 1;
                res.push(p[0]);
            }
        }
    };
    fn.g = function (pairs, res) {
        var groups = {};
        for (var i = 0; i < pairs.length; i++) {
            var p = pairs[i];
            var group = groups[p[1]];
            if (!group)
                group = groups[p[1]] = [p[1], []];
            group[1].push(p[0])
        }
        for (var k in groups) {
            var g = groups[k];
            res.push([g[0], g[1]]);
        }
    };
    function exec(data, token, args) {
        // console.log('Exec', data, token);
        var res = [];

        function _applyFunc() {
            for (i = 0; i < data.length; i++) {
                v = data[i];
                if (token.func(v, i, args)) {
                    res.push(v);
                }
            }
        }

        if (token.type === TYPE_PATH) {
            for (var i = 0; i < data.length; i++) {
                var v = (data[i] || {})[token.val];
                if (!defined(v) && '*' === token.val)
                    v = data[i];
                if (isArr(v)) {
                    for (var j = 0; j < v.length; j++) {
                        res.push(v[j]);
                    }
                } else if (defined(v) && v !== null)
                    res.push(v);
            }
        } else if (token.type === TYPE_FILTER) {
            if (token.sub_type === SUB_TYPE_FUNC)
                _applyFunc();
            else if (token.sub_type === SUB_TYPE_INDEX)
                res = calcIndex(data, token.index);
        } else if (token.type === TYPE_NESTED_FILTER) {
            _applyFunc();
        } else if (token.type === TYPE_MAP) {
            for (i = 0; i < data.length; i++) {
                res.push(token.func(data[i], i, args));
            }
        } else if (token.type === TYPE_CALL) {
            var fname = token.call;
            var f = fn[fname];
            if (!f)
                throw 'not valid call: "' + fname + '"';
            var pairs = [];
            for (i = 0; i < data.length; i++) {
                v = data[i];
                pairs.push([v, token.func ? token.func(v, i, args) : v]);
            }
            f(pairs, res);
        }

        return res;
    }

    return jsqry;
}));
