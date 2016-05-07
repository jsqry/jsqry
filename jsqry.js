jsqry = (function () {
    var jsqry = {
        cache: true,
        ast_cache: {}
    };

    var TYPE_PATH = 'p';
    var TYPE_FILTER = 'f';
    var TYPE_MAP = 'm';

    var SUB_TYPE_FUNC = 'func';
    var SUB_TYPE_INDEX = 'index';

    function defined(v) {
        return v !== undefined;
    }

    function is_arr(obj) {
        if (obj == null) return false;
        return defined(obj.length) && typeof obj != 'string';
    }

    function func_token(token) {
        token.sub_type = SUB_TYPE_FUNC;
        token.func = Function('_,i,args', 'return ' + token.val);
    }

    function tokenize(expr, args) {
        var cached;
        if (jsqry.cache && (cached = jsqry.ast_cache[expr]))
            return cached;

        var expr0 = expr;
        var parts = expr.split('?');// TODO escaped '?'
        if (args.length + 1 != parts.length)
            throw 'Wrong args count!';
        var r = [];
        for (var j = 0; j < parts.length; j++) {
            r.push(parts[j]);
            if (j < parts.length - 1)
                r.push('args[' + j + ']')
        }
        expr = r.join('');

        var ast = [];
        var token = {type: TYPE_PATH, val: ''};

        var filter_depth = 0; // nesting of []
        var map_depth = 0; // nesting of {}

        function start_new_tok(tok_type) {
            var val = token.val;
            if (val) {
                ast.push(token);
                if (token.type == TYPE_FILTER) {
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
                } else if (token.type == TYPE_MAP) {
                    func_token(token);
                }
            }
            token = {type: tok_type, val: ''};
        }

        for (var i = 0; i < expr.length; i++) {
            var l = expr[i];
            if (l == '.') {
                if (token.type == TYPE_PATH) {
                    start_new_tok(TYPE_PATH);
                } else {
                    token.val += l;
                }
            } else if (l == '[') {
                if (filter_depth == 0 && token.type == TYPE_PATH) {
                    start_new_tok(TYPE_FILTER);
                } else {
                    token.val += l;
                }
                filter_depth++;
            } else if (l == ']') {
                filter_depth--;
                if (filter_depth == 0) {
                    start_new_tok(TYPE_PATH);
                } else {
                    token.val += l;
                }
            } else if (l == '{') {
                if (map_depth == 0 && token.type == TYPE_PATH) {
                    start_new_tok(TYPE_MAP);
                } else {
                    token.val += l;
                }
                map_depth++;
            } else if (l == '}') {
                map_depth--;
                if (map_depth == 0) {
                    start_new_tok(TYPE_PATH);
                } else {
                    token.val += l;
                }
            } else {
                token.val += l;
            }
        }
        start_new_tok(null);//close
        if (jsqry.cache)
            jsqry.ast_cache[expr0] = ast;
        return ast;
    }

    function one(obj, expr) {
        var res = query.apply(null, arguments);
        return res.length ? res[0] : null;
    }

    function query(obj, expr) {
        if (!obj)
            return [];
        if (!is_arr(obj))
            obj = [obj];

        var args = Array.prototype.slice.call(arguments, 2);
        var ast = tokenize(expr, args);
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
        if (idx < 0) idx += len;
        // if (idx < 0) throw 'Index out of range';
        // TODO: idx >= len?
        return idx;
    }

    function calc_index(list, index) {
        // console.info('idx', list, index)
        var res = [];
        var idx_cnt = index.length;
        var len = list.length;
        if (idx_cnt == 1) {
            var val = list[norm_idx(1, index[0], len)];
            if (defined(val))
                res.push(val);
        } else if (idx_cnt >= 2) {
            var step = idx_cnt == 3 ? index[2] : 1;
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

    function exec(data, token, args) {
        // console.log('Exec', data, token);
        var res = [];
        if (token.type == TYPE_PATH) {
            for (var i = 0; i < data.length; i++) {
                var v = (data[i] || {})[token.val];
                if (!defined(v) && 'it' == token.val)
                    v = data[i];
                if (is_arr(v)) {
                    for (var j = 0; j < v.length; j++) {
                        res.push(v[j]);
                    }
                } else if (defined(v))
                    res.push(v);
            }
        } else if (token.type == TYPE_FILTER) {
            if (token.sub_type == SUB_TYPE_FUNC) {
                for (i = 0; i < data.length; i++) {
                    v = data[i];
                    if (token.func(v, i, args)) {
                        res.push(v);
                    }
                }
            } else if (token.sub_type == SUB_TYPE_INDEX) {
                res = calc_index(data, token.index);
            }
        } else if (token.type == TYPE_MAP) {
            for (i = 0; i < data.length; i++) {
                v = data[i];
                res.push(token.func(v, i, args));
            }
        }

        return res;
    }

    // Usage: https://github.com/xonixx/jsqry/blob/master/spec/spec.js
    jsqry.one = one;
    jsqry.query = query;
    return jsqry;
})();
