(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
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
    var TYPE_SUPER_FILTER = 4;
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
            res.push((t === TYPE_PATH ? 'p' : t === TYPE_FILTER ? 'f' : t === TYPE_SUPER_FILTER ? 'F' : t === TYPE_MAP ? 'm' : 'c') + '(' + v + ')')
        }
        return res.join(' ');
    }

    function defined(v) {
        return v !== undefined;
    }

    function is_arr(obj) {
        if (obj == null) return false;
        return defined(obj.length) && typeof obj !== 'string';
    }

    function func_token(token) {
        token.sub_type = SUB_TYPE_FUNC;
        token.func = Function('_,i,args', 'return ' + token.val);
    }

    var allowedPathLetter = /[A-Za-z0-9_]/;
    function parse(expr) {
        var cached;
        if (jsqry.cache && (cached = jsqry.ast_cache[expr]))
            return cached;

        var expr0 = expr;
        var arg_idx = 0;
        var ast = [];
        var token = {type: TYPE_PATH, val: ''};
        var depth_filter = 0; // nesting of []
        var depth_super_filter = 0; // nesting of [[]]
        var depth_map = 0; // nesting of {}
        var depth_call = 0; // nesting of ()

        function start_new_tok(tok_type) {
            var val = token.val = token.val.trim();
            if (token.call)
                token.call = token.call.trim();
            var type = token.type;
            if (tok_type === null && (type === TYPE_FILTER || type === TYPE_MAP || type === TYPE_CALL))
                throw 'Not closed ' + (type === TYPE_FILTER ? '[' : type === TYPE_MAP ? '{' : type === TYPE_CALL ? '(' : 'wtf');
            if (!val && type === TYPE_CALL) // handle 's()'
                val = token.val = '_';
            if (val) { // handle prev token
                ast.push(token);
                if (type === TYPE_FILTER) {
                    if (val.indexOf('_') >= 0 || val.indexOf('i') >= 0) { // function
                        func_token(token)
                    } else { // index/slice
                        token.sub_type = SUB_TYPE_INDEX;
                        var idx = val.split(':');
                        token.index = idx;
                        for (var j = 0; j < idx.length; j++) {
                            idx[j] = parseInt(idx[j])
                        }
                    }
                } else if (type === TYPE_MAP || type === TYPE_CALL && token.call) {
                    func_token(token);
                }
            }
            token = {type: tok_type, val: ''};
        }

        for (var i = 0; i < expr.length; i++) {
            var l = expr[i], next = expr[i + 1];
            if (l === '.') {
                if (token.type === TYPE_PATH) {
                    if (next === '.' || !defined(next))
                        throw '. at wrong position';
                    start_new_tok(TYPE_PATH);
                } else
                    token.val += l;
            } else if (l === '?') {
                if (token.type !== TYPE_FILTER && token.type !== TYPE_SUPER_FILTER && token.type !== TYPE_MAP)
                    throw '? at wrong position';
                if (next === '?') {
                    token.val += l;
                    i++;
                } else
                    token.val += 'args[' + arg_idx++ + ']';
            } else if (l === '[') {
                var is_dbl = false;
                if (next === '[') {
                    i++;
                    is_dbl = true;
                }
                if (token.type === TYPE_PATH) {
                    if (is_dbl && depth_super_filter === 0) {
                        start_new_tok(TYPE_SUPER_FILTER);
                        i++;
                    } else if (depth_filter === 0)
                        start_new_tok(TYPE_FILTER);
                } else
                    token.val += l;
                if (is_dbl)
                    depth_super_filter++;
                else
                    depth_filter++;
            } else if (l === ']') {
                console.info(111,i,token.type, depth_super_filter, depth_filter)
                if (token.type === TYPE_PATH)
                    throw '] without [';
                else if (next === ']' && token.type === TYPE_SUPER_FILTER && --depth_super_filter === 0) {
                    console.info(22)
                    start_new_tok(TYPE_PATH);
                    i++;
                } else if (token.type === TYPE_FILTER && --depth_filter === 0)
                    start_new_tok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '{') {
                if (depth_map === 0 && token.type === TYPE_PATH)
                    start_new_tok(TYPE_MAP);
                else
                    token.val += l;
                depth_map++;
            } else if (l === '}') {
                if (token.type === TYPE_PATH)
                    throw '} without {';
                if (token.type === TYPE_MAP && --depth_map === 0)
                    start_new_tok(TYPE_PATH);
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
                    start_new_tok(TYPE_PATH);
                else
                    token.val += l;
            } else {
                if (token.type === TYPE_PATH && !allowedPathLetter.test(l))
                    throw 'disallowed letter in path';
                token.val += l;
            }
        }

        start_new_tok(null);//close

        ast.args_count = arg_idx;

        if (jsqry.cache)
            jsqry.ast_cache[expr0] = ast;
        return ast;
    }

    function first(obj, expr) {
        var res = query.apply(null, arguments);
        return res.length ? res[0] : null;
    }

    function query(obj, expr) {
        if (!obj)
            return [];
        if (!is_arr(obj))
            obj = [obj];

        var args = Array.prototype.slice.call(arguments, 2);
        var ast = jsqry.parse(expr);
        if (args.length !== ast.args_count)
            throw 'Wrong args count';
        for (var i = 0; i < ast.length; i++) {
            obj = exec(obj, ast[i], args)
        }

        return obj;
    }

    function norm_idx(is_from, idx, len, step) {
        if (isNaN(idx))
            idx = is_from
                ? (step > 0 ? 0 : -1)
                : (step > 0 ? len : -len - 1);
        if (idx < 0)
            idx += len;
        return idx;
    }

    function calc_index(list, index) {
        // console.info('idx', list, index)
        var res = [];
        var idx_cnt = index.length;
        var len = list.length;
        if (idx_cnt === 1) {
            var val = list[norm_idx(1, index[0], len)];
            if (defined(val))
                res.push(val);
        } else if (idx_cnt >= 2) {
            var step = idx_cnt === 3 ? index[2] : 1;
            if (isNaN(step)) step = 1;
            var from = norm_idx(1, index[0], len, step);
            var to = norm_idx(0, index[1], len, step);
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
        if (token.type === TYPE_PATH) {
            for (var i = 0; i < data.length; i++) {
                var v = (data[i] || {})[token.val];
                if (!defined(v) && 'it' === token.val)
                    v = data[i];
                if (is_arr(v)) {
                    for (var j = 0; j < v.length; j++) {
                        res.push(v[j]);
                    }
                } else if (defined(v) && v !== null)
                    res.push(v);
            }
        } else if (token.type === TYPE_FILTER) {
            if (token.sub_type === SUB_TYPE_FUNC) {
                for (i = 0; i < data.length; i++) {
                    v = data[i];
                    if (token.func(v, i, args)) {
                        res.push(v);
                    }
                }
            } else if (token.sub_type === SUB_TYPE_INDEX) {
                res = calc_index(data, token.index);
            }
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
