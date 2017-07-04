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
    // Usage: https://github.com/xonixx/jsqry/blob/master/spec.js
    var jsqry = {
        first: first,
        query: query,
        cache: true,
        ast_cache: {},
        fn: fn,
        parse: parse
    };

    var TYPE_PATH = 'p';
    var TYPE_CALL = 'c';
    var TYPE_FILTER = 'f';
    var TYPE_MAP = 'm';

    var SUB_TYPE_FUNC = 'func';
    var SUB_TYPE_INDEX = 'index';

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

    function parse(expr) {
        var cached;
        if (jsqry.cache && (cached = jsqry.ast_cache[expr]))
            return cached;

        var expr0 = expr;
        var arg_idx = 0;
        var ast = [];
        var token = {type: TYPE_PATH, val: ''};
        var filter_depth = 0; // nesting of []
        var map_depth = 0; // nesting of {}
        var call_depth = 0; // nesting of ()

        function start_new_tok(tok_type) {
            var val = token.val = token.val.trim();
            if (token.call)
                token.call = token.call.trim();
            var type = token.type;
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
            if (tok_type == null && (type === TYPE_FILTER || type === TYPE_MAP || type === TYPE_CALL))
                throw 'Not closed ' + (type === TYPE_FILTER ? '[' : type === TYPE_MAP ? '{' : type === TYPE_CALL ? '(' : 'wtf');
            token = {type: tok_type, val: ''};
        }

        for (var i = 0; i < expr.length; i++) {
            var l = expr[i], next = expr[i+1];
            if (l === '.') {
                if (token.type === TYPE_PATH) {
                    if (next === '.' || !defined(next))
                        throw '. at wrong position';
                    start_new_tok(TYPE_PATH);
                } else
                    token.val += l;
            } else if (l === '?') {
                if (token.type !== TYPE_FILTER && token.type !== TYPE_MAP)
                    throw '? at wrong position';
                if (next === '?') {
                    token.val += l;
                    i++;
                } else
                    token.val += 'args[' + arg_idx++ + ']';
            } else if (l === '[') {
                if (filter_depth === 0 && token.type === TYPE_PATH)
                    start_new_tok(TYPE_FILTER);
                else
                    token.val += l;
                filter_depth++;
            } else if (l === ']') {
                if (token.type === TYPE_PATH)
                    throw '] without [';
                if (token.type === TYPE_FILTER && --filter_depth === 0)
                    start_new_tok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '{') {
                if (map_depth === 0 && token.type === TYPE_PATH)
                    start_new_tok(TYPE_MAP);
                else
                    token.val += l;
                map_depth++;
            } else if (l === '}') {
                if (token.type === TYPE_PATH)
                    throw '} without {';
                if (token.type === TYPE_MAP && --map_depth === 0)
                    start_new_tok(TYPE_PATH);
                else
                    token.val += l;
            } else if (l === '(') {
                if (call_depth === 0 && token.type === TYPE_PATH) {
                    token.call = token.val;
                    token.val = '';
                    token.type = TYPE_CALL
                } else
                    token.val += l;
                call_depth++;
            } else if (l === ')') {
                if (token.type === TYPE_PATH)
                    throw ') without (';
                if (token.type === TYPE_CALL && --call_depth === 0)
                    start_new_tok(TYPE_PATH);
                else
                    token.val += l;
            } else
                token.val += l;
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
        var ast = parse(expr);
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

    function sortFn(a,b) { return a[1] > b[1] ? 1 : a[1] == b[1] ? 0 : -1 }
    var fn = {
        s: function (pairs, res) {
            pairs.sort(sortFn);
            for (var i = 0; i < pairs.length; i++) {
                res.push(pairs[i][0]);
            }
        },
        u: function (pairs, res) {
            var exists = {};
            for (var i = 0; i < pairs.length; i++) {
                var p = pairs[i];
                if (!exists[p[1]]){
                    exists[p[1]] = 1;
                    res.push(p[0]);
                }
            }
        },
        g: function (pairs, res) {
            var groups = {};
            for (var i = 0; i < pairs.length; i++) {
                var p = pairs[i];
                var group = groups[p[1]];
                if (!group)
                    group = groups[p[1]] = [p[1],[]];
                group[1].push(p[0])
            }
            for (var k in groups) {
                var g = groups[k];
                res.push([g[0], g[1]]);
            }
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
