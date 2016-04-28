(function (window) {
    var type_path_elt = 'p';
    var type_filter_func = 'f';
    var type_map_func = 'm';

    var sub_type_func = 'func';
    var sub_type_index = 'index';

    function is_arr(obj) {
        if (obj == null) return false;
        return obj.length !== undefined && typeof obj != 'string';
    }

    function func_token(token) {
        token.sub_type = sub_type_func;
        token.func = Function('_', 'return ' + token.val);
    }

    function tokenize(expr) {
        var ast = [];
        var token = {type: type_path_elt, val: ''};

        var filter_depth = 0; // nesting of []
        var map_depth = 0; // nesting of {}

        function start_new_tok(tok_type) {
            if (token.val) {
                ast.push(token);
                if (token.type == type_filter_func) {
                    if (token.val.indexOf('_') >= 0) { // function
                        func_token(token)
                    } else {
                        token.sub_type = sub_type_index;
                        var idx = token.val.split(':');
                        token.index = idx;
                        for (var j = 0; j < idx.length; j++) {
                            idx[j] = parseInt(idx[j])
                        }
                    }
                } else if (token.type == type_map_func) {
                    func_token(token);
                }
            }
            token = {type: tok_type, val: ''};
        }

        for (var i = 0; i < expr.length; i++) {
            var l = expr[i];
            if (l == '.') {
                if (token.type == type_path_elt) {
                    start_new_tok(type_path_elt);
                } else {
                    token.val += l;
                }
            } else if (l == '[') {
                if (filter_depth == 0 && token.type == type_path_elt) {
                    start_new_tok(type_filter_func);
                } else {
                    token.val += l;
                }
                filter_depth++;
            } else if (l == ']') {
                filter_depth--;
                if (filter_depth == 0) {
                    start_new_tok(type_path_elt);
                } else {
                    token.val += l;
                }
            } else if (l == '{') {
                if (map_depth == 0 && token.type == type_path_elt) {
                    start_new_tok(type_map_func);
                } else {
                    token.val += l;
                }
                map_depth++;
            } else if (l == '}') {
                map_depth--;
                if (map_depth == 0) {
                    start_new_tok(type_path_elt);
                } else {
                    token.val += l;
                }
            } else {
                token.val += l;
            }
        }
        start_new_tok(null);//close
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

        var args = Array.prototype.slice.call(arguments,2);
        for (var j = 0; j < args.length; j++) {
            var arg = args[j];
            var argS;
            if (typeof arg == 'string')
                argS = "'"+arg+"'";
            else
                argS = '' + arg;
            expr = expr.replace(new RegExp('\\$'+(j+1),'g'),argS);
        }

        var ast = tokenize(expr);
        for (var i = 0; i < ast.length; i++) {
            obj = exec(obj, ast[i])
        }

        return obj;
    }

    function norm_idx(is_from, idx, len) {
        if (isNaN(idx))
            return is_from ? 0 : len;
        while (idx < 0) idx += len;
        // TODO: idx >= len?
        return idx;
    }

    function calc_index(list, index) {
        // console.info('idx', list, index)
        var res = [];
        var idx_cnt = index.length;
        var len = list.length;
        if (idx_cnt == 1) {
            res.push(list[norm_idx(1, index[0], len)]);
        } else if (idx_cnt >= 2) {
            var from = norm_idx(1, index[0], len);
            var to = norm_idx(0, index[1], len);
            var step = idx_cnt == 3 ? index[2] : 1;
            if (isNaN(step)) step = 1;
            for (var i = from; step > 0 ? i < to : i > to; i += step)
                res.push(list[i]);
        }
        return res;
    }

    function exec(data, token) {
        //console.log('Exec', data, token);
        var res = [];
        if (token.type == type_path_elt) {
            for (var i = 0; i < data.length; i++) {
                var v = (data[i]||{})[token.val];
                if (v === undefined && 'it' == token.val)
                    v = data[i];
                if (is_arr(v)) {
                    for (var j = 0; j < v.length; j++) {
                        res.push(v[j]);
                    }
                } else if (v !== undefined)
                    res.push(v);
            }
        } else if (token.type == type_filter_func) {
            if (token.sub_type == sub_type_func) {
                for (i = 0; i < data.length; i++) {
                    v = data[i];
                    if (token.func(v)) {
                        res.push(v);
                    }
                }
            } else if (token.sub_type == sub_type_index) {
                res = calc_index(data, token.index);
            }
        } else if (token.type == type_map_func) {
            for (i = 0; i < data.length; i++) {
                v = data[i];
                res.push(token.func(v));
            }
        }

        return res;
    }

    // Usage: https://github.com/xonixx/jsqry/blob/master/spec/spec.js
    window.one = one;
    window.query = query;
})(window);
