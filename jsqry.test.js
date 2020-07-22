const jsqry = require(`./jsqry${process.env.MINIFY ? ".min" : ""}`);

describe("Jsqry tests", function () {
  const query = jsqry.query;
  const first = jsqry.first;

  const parse = jsqry.parse;
  jsqry.parse = function (expr) {
    const res = parse(expr);
    console.info("PARSE: " + expr + " --> " + jsqry.printAst(res));
    return res;
  };

  const PEOPLE = [
    { id: 1, name: "Alex" },
    { id: 2, name: "Serge" },
    { id: 3, name: "Vlad" },
    { id: 4, name: "Zachary" },
    { id: 5, name: "Michael" },
  ];

  const HOTEL = {
    name: "Name",
    facilities: [
      {
        name: "Fac 1",
        services: [
          { name: "Service 1", visible: false },
          { name: "Service 2" },
        ],
      },
      {
        name: "Fac 2",
        services: [
          { name: "Service 3" },
          { name: "Service 4", visible: false },
          { name: "Service 5", visible: true },
        ],
      },
      { name: "Fac 3", services: null },
      { name: "Fac 4" },
    ],
  };
  const DATA = [
    { id: 1, val: "B" },
    { id: 2, val: "A" },
    { id: 3, val: "B" },
    { id: 2, val: "C" },
    { id: 1, val: "D" },
  ];

  const _invalidPathElt = /Illegal path element.+/;

  it("Should handle placeholders", function () {
    expect(first(PEOPLE, "{[?,?,?,?,?]}", 1, 2, "a", "b", "c")).toEqual([
      1,
      2,
      "a",
      "b",
      "c",
    ]);
    expect(first(PEOPLE, "{?}", 1)).toEqual(1);
    expect(first(PEOPLE, "{?+?+?}", 1, 2, 4)).toEqual(7);
    expect(first(PEOPLE, "[0]{?+?+?}", 1, 2, 4)).toEqual(7);
    expect(query(PEOPLE, "{[?,?,?,?,?][i]}", 1, 2, "a", "b", "c")).toEqual([
      1,
      2,
      "a",
      "b",
      "c",
    ]);

    expect(query(100, "{?+?+?+?}", 1, 2, 3, 4)).toEqual([10]);
    expect(function () {
      query(100, "{?+?+?+?}", 1, 2);
    }).toThrow("Wrong args count");
    expect(function () {
      first(100, "{?+?+?+?}", 1, 2, 3, 4, 5);
    }).toThrow("Wrong args count");
    expectException(function () {
      query(100, "a.?.b");
    }, _invalidPathElt);
    expectException(function () {
      first(100, "a.b[0].c?", 1, 2);
    }, _invalidPathElt);

    function f1(elt) {
      return elt > 2;
    }

    function f2(elt) {
      return elt + 10;
    }

    expect(query([1, 2, 3, 4, 5], "[ ?(_) ]{ ?(_) }", f1, f2)).toEqual([
      13,
      14,
      15,
    ]);

    expect(
      query([{ age: 5 }, { age: 1 }, { age: 3 }], "s( ?(_) )", function (e) {
        return e.age;
      })
    ).toEqual([{ age: 1 }, { age: 3 }, { age: 5 }]);
  });

  it("Should correctly handle '?'", function () {
    expect(
      query(
        Array(20),
        '{ i % 15 == 0 ?? "FizzBuzz" : i % 3 == 0 ?? "Fizz" : i % 5 == 0 ?? "Buzz" : i }'
      )
    ).toEqual([
      "FizzBuzz",
      1,
      2,
      "Fizz",
      4,
      "Buzz",
      "Fizz",
      7,
      8,
      "Fizz",
      "Buzz",
      11,
      "Fizz",
      13,
      14,
      "FizzBuzz",
      16,
      17,
      "Fizz",
      19,
    ]);
    expect(
      query(
        Array(20),
        "{ i % 15 == 0 ?? ? : i % 3 == 0 ?? ? : i % 5 == 0 ?? ? : i }",
        "FizzBuzz",
        "Fizz",
        "Buzz"
      )
    ).toEqual([
      "FizzBuzz",
      1,
      2,
      "Fizz",
      4,
      "Buzz",
      "Fizz",
      7,
      8,
      "Fizz",
      "Buzz",
      11,
      "Fizz",
      13,
      14,
      "FizzBuzz",
      16,
      17,
      "Fizz",
      19,
    ]);

    expect(first(1, '{ "?" + _ + "?" }')).toEqual("?1?");
    expect(first("How are you", '{ _ + ", " + ? + "?" }', "Peter")).toEqual(
      "How are you, Peter?"
    );
  });

  function basicTests() {
    expect(query(null, "a")).toEqual([]);
    expect(query(undefined, "a[_>7]")).toEqual([]);
    expect(first(null, "a")).toEqual(null);
    expect(first(undefined, "a[_>7]")).toEqual(null);
    expect(
      query({ ll: PEOPLE }, "ll.name{_.toUpperCase()}{_.length}[_>=5][1]")
    ).toEqual([7]);
    expect(first(PEOPLE, "[_.id>=2].name[_.toLowerCase()[0]==?]", "s")).toEqual(
      "Serge"
    );
    expect(query(PEOPLE, "name[_[0]==? || _[0]==?]", "S", "Z")).toEqual([
      "Serge",
      "Zachary",
    ]);
    expect(
      first(PEOPLE, "[_.id>=2].name[_.toLowerCase()[0]==?].length", "s")
    ).toEqual(5);

    expect(query([{ a: 1 }, { a: 2 }, { a: 3 }], "a[_>=2]{_+100}")).toEqual([
      102,
      103,
    ]);

    expect(query(HOTEL, "facilities[_.services]").length).toEqual(2);
    expect(query(HOTEL, "facilities[_.services].name")).toEqual([
      "Fac 1",
      "Fac 2",
    ]);
    expect(query(HOTEL, "facilities.services").length).toEqual(5);
    expect(query(HOTEL, "facilities.services.name")).toEqual([
      "Service 1",
      "Service 2",
      "Service 3",
      "Service 4",
      "Service 5",
    ]);
    expect(
      query(HOTEL, "facilities.services[_.visible!==false].name")
    ).toEqual(["Service 2", "Service 3", "Service 5"]);

    expect(query(["a", "bb", "cCc", "DDdD"], "length")).toEqual([1, 2, 3, 4]);
    expect(query(PEOPLE, "name.length")).toEqual([4, 5, 4, 7, 7]);
  }

  it("Should pass basic tests (1st pass)", basicTests);
  it("Should pass basic tests (test caching)", basicTests);
  it("Should pass basic tests (caching = off)", () => {
    jsqry.cache = false;
    basicTests();
    jsqry.cache = true;
  });

  it("Should pass array indexing & slicing", function () {
    const l = ["a", "b", "c", "d", "e", "f", "g"];

    expect(first([], "")).toEqual(null);
    expect(first([], "[0]")).toEqual(null);
    expect(first([], "[2]")).toEqual(null);
    expect(first([], "[-1]")).toEqual(null);
    expect(query([], "")).toEqual([]);
    expect(query([], "[0]")).toEqual([]);
    expect(query([], "[2]")).toEqual([]);
    expect(query([], "[-1]")).toEqual([]);
    expect(first(l, "[4]")).toEqual("e");
    expect(first(l, "[-1]")).toEqual("g");
    expect(first(l, "[4]{_.toUpperCase()}")).toEqual("E");
    expect(query(l, "[0:7]")).toEqual(l);
    expect(query(l, "[:]")).toEqual(l);
    expect(query(l, "[::]")).toEqual(l);
    expect(query(l, "[:2]")).toEqual(["a", "b"]);
    expect(query(l, "[2:]")).toEqual(["c", "d", "e", "f", "g"]);
    expect(query(l, "[2:-2]")).toEqual(["c", "d", "e"]);
    expect(query(l, "[0:7:2]")).toEqual(["a", "c", "e", "g"]);
    expect(query(l, "[::-1]")).toEqual(["g", "f", "e", "d", "c", "b", "a"]);
    expect(query(l, "[::2]")).toEqual(["a", "c", "e", "g"]);
    expect(query(l, "[::-2]")).toEqual(["g", "e", "c", "a"]);
    expect(query(l, "[::2][::-1]")).toEqual(["g", "e", "c", "a"]);

    expect(query(l, "[100]")).toEqual([]);
    expect(query([1, undefined], "[:]")).toEqual([1]);
    expect(query([1, null], "[:]")).toEqual([1, null]);
  });

  it("Should support super filtering", function () {
    expect(query(HOTEL, "facilities<<services[_.visible]>>.name")).toEqual([
      "Fac 2",
    ]);
    expect(query(HOTEL, "facilities<<services.visible>>.name")).toEqual([
      "Fac 2",
    ]);
    const data = [
      { id: 1, arr: [{ val: 2 }, { val: 3 }] },
      { id: 2, arr: [{ val: 5 }] },
      { id: 3, arr: [{ val: 7 }, { val: 8 }, { val: 9 }] },
    ];
    expect(query(data, "<<arr[_.val>4]>>.id")).toEqual([2, 3]);
    expect(query(data, "<<arr[_.val>?]>>.id", 4)).toEqual([2, 3]);
    expect(query(data, "<<arr[_.val<?]>>.id", 4)).toEqual([1]);
    expect(query(data, "<<arr[_.val<?]>>.arr.val", 6)).toEqual([2, 3, 5]);
    expect(query(data, "<<arr[_.val>?]>>.arr.val", 6)).toEqual([7, 8, 9]);
    expect(query(data, "<<arr[_.val>?]>><<arr[_.val<?]>>.id", 4, 6)).toEqual([
      2,
    ]);
    expect(
      query(data, "<<arr[_.val>?]>><<arr[_.val<?]>>.arr.val", 4, 6)
    ).toEqual([5]);
  });

  it("Should support flatting", function () {
    expect(
      query([{ k: [{ a: 1 }, { a: 2 }] }, { k: [{ a: 3 }] }], "k.*.a")
    ).toEqual([1, 2, 3]);
    expect(query([[{ a: 1 }, { a: 2 }], [{ a: 3 }]], "*.a")).toEqual([1, 2, 3]);
    expect(query([[1, 2, 3], [4, 5], [6]], "*")).toEqual([1, 2, 3, 4, 5, 6]);
    expect(
      query(
        [
          ["a", "bb"],
          ["cccc", ["dd"]],
        ],
        "*"
      )
    ).toEqual(["a", "bb", "cccc", ["dd"]]);
    expect(
      query(
        [
          ["a", "bb"],
          ["cccc", ["dd"]],
        ],
        "*.*"
      )
    ).toEqual(["a", "bb", "cccc", "dd"]);
  });

  it("Should support index parameter", function () {
    expect(query([0, 0, 0, 0, 0], "{i}")).toEqual([0, 1, 2, 3, 4]);
    expect(query(["a", "b", "c", "d", "e"], "[i>0]")).toEqual([
      "b",
      "c",
      "d",
      "e",
    ]);
    expect(query(["a", "b", "c", "d", "e"], "[i%2==0]")).toEqual([
      "a",
      "c",
      "e",
    ]);
  });

  it("Should handle blank values properly", function () {
    expect(query([{ a: 1 }, { a: 2 }, null], "a")).toEqual([1, 2]);
    expect(query([{ a: 1 }, { a: 2 }, undefined], "a")).toEqual([1, 2]);
    expect(query([{ a: 1 }, undefined, { a: 2 }], "a")).toEqual([1, 2]);
    expect(query([{ a: 1 }, { a: 2 }, {}], "a")).toEqual([1, 2]);
    expect(query([{ a: 1 }, { a: 2 }, 7], "a")).toEqual([1, 2]);
    expect(
      query([{ a: { b: 1 } }, { a: { b: 2 } }, { a: {} }], "a.b")
    ).toEqual([1, 2]);
    expect(query([{ a: { b: 1 } }, { a: { b: 2 } }, {}], "a.b")).toEqual([
      1,
      2,
    ]);
    expect(
      query([{ a: { b: 1 } }, { a: { b: 2 } }, undefined], "a.b")
    ).toEqual([1, 2]);
  });

  it("Should support sorting", function () {
    expect(query([2, 4, 1, 5, 3], "s(_)")).toEqual([1, 2, 3, 4, 5]);
    expect(query([2, 4, 1, 5, 3], ".s()")).toEqual([1, 2, 3, 4, 5]);
    expect(query([2, 4, 1, 5, 3], "s(-_)")).toEqual([5, 4, 3, 2, 1]);
    expect(
      query(
        [
          { id: 2, val: 22 },
          { id: 4, val: 44 },
          { id: 1, val: 11 },
          { id: 5, val: 55 },
          { id: 3, val: 33 },
        ],
        "s(-_.id).val"
      )
    ).toEqual([55, 44, 33, 22, 11]);
  });

  it("Should support unique", function () {
    expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], ".u(_)")).toEqual([
      2,
      4,
      1,
      5,
      3,
    ]);
    expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], "u()")).toEqual([
      2,
      4,
      1,
      5,
      3,
    ]);
    expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], "u()s()")).toEqual([
      1,
      2,
      3,
      4,
      5,
    ]);
    expect(
      query([[2], [4], [1], [4], [5], [3], [3], [1], [4], [2], [5]], "*.u(_)")
    ).toEqual([2, 4, 1, 5, 3]);
    expect(query(DATA, "u(_.id)s(_.val)u(_.val).val")).toEqual(["A", "B"]);
    expect(query(DATA, ".u(_.id).u(_.val).s(_.val).val")).toEqual(["A", "B"]);
    expect(query(DATA, "{ {a:_} }.a.u(_.id)u(_.val)s(_.val).val")).toEqual([
      "A",
      "B",
    ]);
  });

  it("Should support grouping", function () {
    expect(query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], "g()")).toEqual([
      [1, [1]],
      [2, [2, 2, 2, 2]],
      [3, [3, 3]],
      [4, [4, 4, 4]],
      [5, [5, 5]],
    ]);
    expect(
      query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], "g(){ [_[0], _[1].length] }")
    ).toEqual([
      [1, 1],
      [2, 4],
      [3, 2],
      [4, 3],
      [5, 2],
    ]);
    expect(
      query(
        [1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5],
        "g(){ [_[0], _[1].length] }s(-_[1]){_[0]}"
      )
    ).toEqual([2, 4, 3, 5, 1]); // sorted by popularity
    expect(query([1.3, 2.1, 2.4], "g(Math.floor(_))")).toEqual([
      [1, [1.3]],
      [2, [2.1, 2.4]],
    ]);
    expect(query(["one", "two", "three"], "g(_.length){_[1]}")).toEqual([
      ["one", "two"],
      ["three"],
    ]);
    expect(query(["one", "two", "three"], "g(_.length){_[1]}.length")).toEqual([
      2,
      1,
    ]);
    expect(
      query(
        [
          [1, 1],
          [2, 2],
          [1, 3],
          [3, 4],
          [1, 5],
          [2, 6],
        ],
        "g(_[0])"
      )
    ).toEqual([
      [
        1,
        [
          [1, 1],
          [1, 3],
          [1, 5],
        ],
      ],
      [
        2,
        [
          [2, 2],
          [2, 6],
        ],
      ],
      [3, [[3, 4]]],
    ]);
    expect(
      query(
        [
          { id: 1, val: 1 },
          { id: 2, val: 2 },
          { id: 1, val: 3 },
          { id: 3, val: 4 },
          { id: 1, val: 5 },
          { id: 2, val: 6 },
        ],
        "g(_.id)"
      )
    ).toEqual([
      [
        1,
        [
          { id: 1, val: 1 },
          { id: 1, val: 3 },
          { id: 1, val: 5 },
        ],
      ],
      [
        2,
        [
          { id: 2, val: 2 },
          { id: 2, val: 6 },
        ],
      ],
      [3, [{ id: 3, val: 4 }]],
    ]);
  });

  it("Should fail on incorrect input", function () {
    expect(function () {
      query(1, "a[id==1");
    }).toThrow("Not closed [");
    expect(function () {
      query(1, "a[_.id==");
    }).toThrow("Not closed [");
    expect(function () {
      query(1, ".a(id==1");
    }).toThrow("Not closed (");
    expect(function () {
      query(1, "a{id==1");
    }).toThrow("Not closed {");

    expect(function () {
      query(1, "a(_)");
    }).toThrow('not valid call: "a"');

    expect(function () {
      query(1, "a)");
    }).toThrow(") without (");
    expect(function () {
      query(1, ".a)");
    }).toThrow(") without (");
    expect(function () {
      query(1, "]");
    }).toThrow("] without [");
    expect(function () {
      query(1, "b{_+1}}");
    }).toThrow("} without {");
    expect(function () {
      query(1, "<_>>");
    }).toThrow(">> without <<");

    expectException(function () {
      query(1, ". .  .");
    }, _invalidPathElt);
    expectException(function () {
      query(1, ".............");
    }, _invalidPathElt);
    expectException(function () {
      query(1, "a.");
    }, _invalidPathElt);
    expectException(function () {
      query(1, "id==?");
    }, _invalidPathElt);

    const l = ["a", "b", "c", "d", "e", "f", "g"];

    expect(() => query(l, "[]")).toThrow("Empty []");
    expect(() => query(l, "a[ ]")).toThrow("Empty []");
    expect(() => query(l, "{}")).toThrow("Empty {}");
    expect(() => query(l, "a{ }")).toThrow("Empty {}");
    expect(() => query(l, "<<>>")).toThrow("Empty <<>>");
    expect(() => query(l, "a<< >>")).toThrow("Empty <<>>");
    expect(() => query(l, "[zzz]")).toThrow('Not an int slice index: "zzz"');
    expect(() => query(l, "[:zzz1]")).toThrow('Not an int slice index: "zzz1"');
    expect(() => query(l, "[::zzz2]")).toThrow(
      'Not an int slice index: "zzz2"'
    );
  });

  function expectException(testFunc, regex) {
    try {
      testFunc();
      fail("Expected exception " + regex + " was not thrown");
    } catch (s) {
      if (!regex.test(s))
        fail("Expected exception " + regex + ' but "' + s + '" was thrown');
      expect(1).toEqual(1);
    }
  }

  it("Should tolerate spaces", function () {
    expect(query(DATA, "u(_.id)s(_.val)u( _.val ).val")).toEqual(["A", "B"]);
    expect(query(DATA, "u(_.id) s(_.val) u( _.val ) .val")).toEqual(["A", "B"]);
    expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], "u( )")).toEqual([
      2,
      4,
      1,
      5,
      3,
    ]);
    expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], " u( ) ")).toEqual([
      2,
      4,
      1,
      5,
      3,
    ]);
    expect(
      query(
        [1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5],
        "g(){ [_[0], _[1].length] }s(-_[1]){_[0]}"
      )
    ).toEqual([2, 4, 3, 5, 1]); // sorted by popularity
    expect(
      query(
        [1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5],
        "g()  { [_[0], _[1].length] }    s(-_[1])   {_[0]}"
      )
    ).toEqual([2, 4, 3, 5, 1]);
    expect(first({ a: { b: { c: { d: { e: 123 } } } } }, "a.b.c.d.e")).toEqual(
      123
    );
    expect(
      first({ a: { b: { c: { d: { e: 123 } } } } }, " a.b  .c   .   d.  e ")
    ).toEqual(123);
  });

  it("Should support custom functions", function () {
    jsqry.fn.uc = function (pairs, res) {
      for (let i = 0; i < pairs.length; i++) {
        const v = pairs[i][0];
        res.push(v ? v.toUpperCase() : null);
      }
    };
    expect(query(["a", "bB", "cCccC"], "uc()")).toEqual(["A", "BB", "CCCCC"]);
    jsqry.fn.partition = function (pairs, res) {
      const trueElts = [];
      const falseElts = [];
      res.push(trueElts, falseElts);
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const e = pair[0]; // input element
        const v = pair[1]; // function result for it
        if (v) trueElts.push(e);
        else falseElts.push(e);
      }
    };
    expect(query([1, 2, 3, 4], "partition( _ % 2 )")).toEqual([
      [1, 3],
      [2, 4],
    ]);
  });

  it("Should not handle placeholders in string literals", function () {
    expect(query(1, "{ ? }", 2)).toEqual([2]);
    expect(query(1, "{ '?' + ? }", 2)).toEqual(["?2"]);
    expect(query(1, '{ "?" }')).toEqual(["?"]);
    expect(query(1, "{ '?' }")).toEqual(["?"]);
    expect(query(1, "{ `?` }")).toEqual(["?"]);
    expect(query(1, "{ `? \"?\" '?' \\`?\\`` }")).toEqual(["? \"?\" '?' `?`"]);
  });

  it("Should support embedded queries", function () {
    const input = [
      {
        name: "Alice",
        props: [
          { key: "age", val: 30 },
          { key: "car", val: "Volvo" },
        ],
      },
      { name: "Bob", props: [{ key: "age", val: 40 }] },
      { name: "John", props: [] },
    ];

    const expected = ["Alice : 30", "Bob : 40", "John : "];

    expect(
      query(
        input,
        '{ _.name + " : " + (_.props.filter(p => p.key === "age")[0]||{val:""}).val }'
      )
    ).toEqual(expected);

    expect(
      query(
        input,
        '{ _.name + " : " + (f(_.props,"[_.key===`age`].val")||"") }'
      )
    ).toEqual(expected);

    expect(
      query(
        input,
        '{ _.name + " : " + (f(_.props,"[_.key===?].val", "age")||"") }'
      )
    ).toEqual(expected);

    expect(
      query(
        input,
        '{ [_.name, f(_.props,"[_.key===?].val", "age") || ""].join(" : ") }'
      )
    ).toEqual(expected);

    expect(
      query(
        input,
        '{ _.name + " : " + (f(_.props,"[_.key===?].val", ?)||?) }',
        "age",
        ""
      )
    ).toEqual(expected);

    expect(
      query(input, '{ { name:_.name, car: q(_.props,"[_.key===`car`].val") } }')
    ).toEqual([
      {
        car: ["Volvo"],
        name: "Alice",
      },
      {
        car: [],
        name: "Bob",
      },
      {
        car: [],
        name: "John",
      },
    ]);
  });

  it("Should support tricks", function () {
    // zip
    expect(
      query(["a", "b", "c", "d"], "{[_,?[i]]}", ["A", "B", "C", "D"])
    ).toEqual([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
      ["d", "D"],
    ]);
    expect(
      query(
        ["a", "b", "c", "d"],
        "{ [_, ?[i], ?[i]] }",
        ["A", "B", "C", "D"],
        ["AA", "BB", "CC", "DD"]
      )
    ).toEqual([
      ["a", "A", "AA"],
      ["b", "B", "BB"],
      ["c", "C", "CC"],
      ["d", "D", "DD"],
    ]);
    // enumerate
    expect(query(["a", "b", "c", "d"], "{[i,_]}")).toEqual([
      [0, "a"],
      [1, "b"],
      [2, "c"],
      [3, "d"],
    ]);
    expect(query(Array(26), "{String.fromCharCode(i+97)}").join("")).toEqual(
      "abcdefghijklmnopqrstuvwxyz"
    );
    // difference
    expect(query([1, 2, 1, 0, 3, 1, 4], "[?.indexOf(_)<0]", [0, 1])).toEqual([
      2,
      3,
      4,
    ]);
    // union
    expect(
      query(
        [
          [1, 2, 3],
          [101, 2, 1, 10],
          [2, 1],
        ],
        "*.u()"
      )
    ).toEqual([1, 2, 3, 101, 10]);
  });

  it("https://github.com/jsqry/jsqry/issues/12", () => {
    expect(query([1], "{[_]}[0]")).toEqual([[1]]);
    expect(query([1], "{ [_] }[0]")).toEqual([[1]]);

    expect(query([1, 2], "[ {1:false,2:true}[_] ]{ _+1 }")).toEqual([3]);

    expect(query([1.1, 2.2], "s( -Math.floor(_) )")).toEqual([2.2, 1.1]);
    expect(query([1.1, 2.2], "[  _  > 0 ]     s( -Math.floor(_) )")).toEqual([
      2.2,
      1.1,
    ]);
    expect(query([1.1, 2.2], "[ (_) > 0 ]     s( -Math.floor(_) )")).toEqual([
      2.2,
      1.1,
    ]);

    const inp1 = [
      { id: 1, vals: [3, 4] },
      { id: 2, vals: [1, 2, 10] },
    ];
    expect(query(inp1, "<<vals[_>5]>>.id")).toEqual([2]);
    expect(query(inp1, "[ _.id<<2 ]  <<vals[_>5]>>.id")).toEqual([2]);
  });

  it("https://github.com/jsqry/jsqry/issues/13", () => {
    expect(query([1, 2], "{ _ << 2 }")).toEqual([4, 8]);
    expect(query([2, 4, 8], "{ _ >> 2 }")).toEqual([0, 1, 2]);
  });
});
