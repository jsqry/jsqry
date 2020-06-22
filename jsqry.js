(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    // Node
    module.exports = factory();
  } else {
    // Browser
    root.jsqry = factory();
  }
})(this, function (undefined) {
  const fn = {};
  const jsqry = {
    first: first,
    query: query,
    cache: true,
    ast_cache: {},
    fn: fn,
    parse: parse,
    printAst: printAst,
  };

  const TYPE_PATH = 1;
  const TYPE_CALL = 2;
  const TYPE_FILTER = 3;
  const TYPE_NESTED_FILTER = 4;
  const TYPE_MAP = 5;
  const TYPE2STR = {
    [TYPE_PATH]: "p",
    [TYPE_FILTER]: "f",
    [TYPE_NESTED_FILTER]: "F",
    [TYPE_MAP]: "m",
    [TYPE_CALL]: "c",
  };

  const SUB_TYPE_FUNC = 1;
  const SUB_TYPE_INDEX = 2;

  function printAst(ast) {
    const res = [];
    for (let i = 0; i < ast.length; i++) {
      const e = ast[i];
      const t = e.type;
      let v = e.val;
      if (t === TYPE_CALL) {
        v = e.call + "," + v;
      }
      res.push(TYPE2STR[t] + "(" + v + ")");
    }
    return res.join(" ");
  }

  function defined(v) {
    return v !== undefined;
  }

  function isArr(obj) {
    if (obj == null) return false;
    return defined(obj.length) && typeof obj !== "string";
  }

  function funcToken(token) {
    token.sub_type = SUB_TYPE_FUNC;
    token.func = Function("_,i,args", "return " + token.val);
  }

  const goodPathRe = /^[A-Za-z0-9_]*$/;

  function parse(expr, arg_idx0) {
    let cached;
    if (jsqry.cache && (cached = jsqry.ast_cache[expr])) {
      return cached;
    }

    const expr0 = expr;
    arg_idx0 = arg_idx0 || 0;
    let arg_idx = arg_idx0;
    const ast = [];
    let token = { type: TYPE_PATH, val: "" };
    let depth_filter = 0; // nesting of []
    let depth_nested_filter = 0; // nesting of <<>>
    let depth_map = 0; // nesting of {}
    let depth_call = 0; // nesting of ()
    let prevType = null;
    let i; // pos

    function startNewTok(type) {
      let val = (token.val = token.val.trim());
      // console.info(
      //   `startNewTok ${TYPE2STR[type]} i=${i} "${expr.substr(i)}" val="${val}"`
      // );
      const prevPrevType = prevType;
      prevType = token.type;
      if (token.call) {
        token.call = token.call.trim();
      }
      if (
        type === null &&
        (prevType === TYPE_FILTER ||
          prevType === TYPE_MAP ||
          prevType === TYPE_CALL)
      ) {
        throw (
          "Not closed " +
          (prevType === TYPE_FILTER
            ? "["
            : prevType === TYPE_MAP
            ? "{"
            : prevType === TYPE_CALL
            ? "("
            : "wtf")
        );
      }
      if (!val && prevType === TYPE_CALL) {
        // handle 's()'
        val = token.val = "_";
      }
      if (
        prevType === TYPE_PATH &&
        ((prevPrevType === TYPE_PATH && !val) ||
          (val !== "*" && !goodPathRe.test(val)))
      ) {
        throw 'Illegal path element "' + val + '" at pos ' + i;
      }
      if (val) {
        // handle prev token
        ast.push(token);
        if (prevType === TYPE_FILTER) {
          if (val.indexOf("_") >= 0 || val.indexOf("i") >= 0) {
            // function
            funcToken(token);
          } else {
            // index/slice
            token.sub_type = SUB_TYPE_INDEX;
            const idx = val.split(":");
            token.index = idx;
            for (let j = 0; j < idx.length; j++) {
              const v = idx[j].trim();
              const vI = parseInt(v);
              if (v && isNaN(vI)) {
                throw 'Not an int slice index: "' + v + '"';
              }
              idx[j] = vI;
            }
          }
        } else if (prevType === TYPE_NESTED_FILTER) {
          const _ast = jsqry.parse(val, arg_idx);
          arg_idx += _ast.args_count;
          token.func = function (e, i, args) {
            const res = _queryAst(e, _ast, args);
            for (let j = 0; j < res.length; j++) {
              if (res[j]) {
                return true;
              }
            }
            return false;
          };
        } else if (
          prevType === TYPE_MAP ||
          (prevType === TYPE_CALL && token.call)
        ) {
          funcToken(token);
        }
      }
      token = { type: type, val: "" };
    }

    for (i = 0; i < expr.length; i++) {
      const l = expr[i],
        next = expr[i + 1];
      if (l === ".") {
        if (token.type === TYPE_PATH) {
          startNewTok(TYPE_PATH);
        } else {
          token.val += l;
        }
      } else if (l === "?" && token.type !== TYPE_PATH) {
        if (next === "?") {
          token.val += l;
          i++;
        } else {
          token.val += "args[" + arg_idx++ + "]";
        }
      } else if (l === "[") {
        if (depth_filter === 0 && token.type === TYPE_PATH) {
          startNewTok(TYPE_FILTER);
        } else {
          token.val += l;
        }
        if (token.type === TYPE_FILTER) {
          depth_filter++;
        }
      } else if (l === "]") {
        if (token.type === TYPE_PATH) {
          throw "] without [";
        }
        if (token.type === TYPE_FILTER && --depth_filter === 0) {
          if (!token.val.trim()) {
            throw "Empty []";
          }
          startNewTok(TYPE_PATH);
        } else {
          token.val += l;
        }
      } else if (l === "<" && next === "<") {
        i++;
        if (depth_nested_filter === 0 && token.type === TYPE_PATH) {
          startNewTok(TYPE_NESTED_FILTER);
        } else {
          token.val += '<<';
        }
        if (token.type === TYPE_NESTED_FILTER) {
          depth_nested_filter++;
        }
      } else if (l === ">" && next === ">") {
        i++;
        if (token.type === TYPE_PATH) {
          throw ">> without <<";
        }
        if (token.type === TYPE_NESTED_FILTER && --depth_nested_filter === 0) {
          if (!token.val.trim()) {
            throw "Empty <<>>";
          }
          startNewTok(TYPE_PATH);
        } else {
          token.val += '>>';
        }
      } else if (l === "{") {
        if (depth_map === 0 && token.type === TYPE_PATH) {
          startNewTok(TYPE_MAP);
        } else {
          token.val += l;
        }
        if (token.type === TYPE_MAP) {
          depth_map++;
        }
      } else if (l === "}") {
        if (token.type === TYPE_PATH) {
          throw "} without {";
        }
        if (token.type === TYPE_MAP && --depth_map === 0) {
          if (!token.val.trim()) {
            throw "Empty {}";
          }
          startNewTok(TYPE_PATH);
        } else {
          token.val += l;
        }
      } else if (l === "(") {
        if (depth_call === 0 && token.type === TYPE_PATH) {
          token.call = token.val;
          token.val = "";
          token.type = TYPE_CALL;
        } else {
          token.val += l;
        }
        if (token.type === TYPE_CALL) {
          depth_call++;
        }
      } else if (l === ")") {
        if (token.type === TYPE_PATH) {
          throw ") without (";
        }
        if (token.type === TYPE_CALL && --depth_call === 0) {
          startNewTok(TYPE_PATH);
        } else {
          token.val += l;
        }
      } else {
        token.val += l;
      }
    }

    startNewTok(null); // close

    ast.args_count = arg_idx - arg_idx0;

    if (jsqry.cache) {
      jsqry.ast_cache[expr0] = ast;
    }
    return ast;
  }

  function first(obj, expr) {
    const res = query.apply(null, arguments);
    return res.length ? res[0] : null;
  }

  function query(obj, expr) {
    const args = Array.prototype.slice.call(arguments, 2);
    const ast = jsqry.parse(expr);
    if (args.length !== ast.args_count) throw "Wrong args count";
    return _queryAst(obj, ast, args);
  }

  function _queryAst(obj, ast, args) {
    if (!obj) return [];
    if (!isArr(obj)) obj = [obj];

    for (let i = 0; i < ast.length; i++) {
      obj = exec(obj, ast[i], args);
    }

    return obj;
  }

  function normIdx(is_from, idx, len, step) {
    if (isNaN(idx))
      idx = is_from ? (step > 0 ? 0 : -1) : step > 0 ? len : -len - 1;
    if (idx < 0) idx += len;
    return idx;
  }

  function calcIndex(list, index) {
    // console.info('idx', list, index)
    const res = [];
    const idx_cnt = index.length;
    const len = list.length;
    if (idx_cnt === 1) {
      const val = list[normIdx(1, index[0], len)];
      if (defined(val)) res.push(val);
    } else if (idx_cnt >= 2) {
      let step = idx_cnt === 3 ? index[2] : 1;
      if (isNaN(step)) step = 1;
      const from = normIdx(1, index[0], len, step);
      const to = normIdx(0, index[1], len, step);
      for (let i = from; step > 0 ? i < to : i > to; i += step) {
        const val = list[i];
        if (defined(val)) res.push(val);
      }
    }
    return res;
  }

  function sortFn(a, b) {
    return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
  }

  fn.s = function (pairs, res) {
    pairs.sort(sortFn);
    for (let i = 0; i < pairs.length; i++) {
      res.push(pairs[i][0]);
    }
  };
  fn.u = function (pairs, res) {
    const exists = {};
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      if (!exists[p[1]]) {
        exists[p[1]] = 1;
        res.push(p[0]);
      }
    }
  };
  fn.g = function (pairs, res) {
    const groups = {};
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i];
      let group = groups[p[1]];
      if (!group) group = groups[p[1]] = [p[1], []];
      group[1].push(p[0]);
    }
    for (let k in groups) {
      const g = groups[k];
      res.push([g[0], g[1]]);
    }
  };
  function exec(data, token, args) {
    // console.log('Exec', data, token);
    let res = [];

    function _applyFunc() {
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        if (token.func(v, i, args)) {
          res.push(v);
        }
      }
    }

    if (token.type === TYPE_PATH) {
      for (let i = 0; i < data.length; i++) {
        let v = (data[i] || {})[token.val];
        if (!defined(v) && "*" === token.val) {
          v = data[i];
        }
        if (isArr(v)) {
          for (let j = 0; j < v.length; j++) {
            res.push(v[j]);
          }
        } else if (defined(v) && v !== null) {
          res.push(v);
        }
      }
    } else if (token.type === TYPE_FILTER) {
      if (token.sub_type === SUB_TYPE_FUNC) _applyFunc();
      else if (token.sub_type === SUB_TYPE_INDEX)
        res = calcIndex(data, token.index);
    } else if (token.type === TYPE_NESTED_FILTER) {
      _applyFunc();
    } else if (token.type === TYPE_MAP) {
      for (let i = 0; i < data.length; i++) {
        res.push(token.func(data[i], i, args));
      }
    } else if (token.type === TYPE_CALL) {
      const fname = token.call;
      const f = fn[fname];
      if (!f) throw 'not valid call: "' + fname + '"';
      const pairs = [];
      for (let i = 0; i < data.length; i++) {
        const v = data[i];
        pairs.push([v, token.func(v, i, args)]);
      }
      f(pairs, res);
    }

    return res;
  }

  return jsqry;
});
