describe('Jsqry tests', function () {
    var query = jsqry.query;
    var first = jsqry.first;

    var people = [
        {id: 1, name: 'Alex'},
        {id: 2, name: 'Serg'},
        {id: 3, name: 'Vlad'},
        {id: 4, name: 'Zachary'},
        {id: 5, name: 'Michael'}
    ];

    var hotel = {
        name: 'Name',
        facilities: [
            {name:'Fac 1',
                services: [
                    {name:'Service 1', visible:false},
                    {name:'Service 2'}
                ]},
            {name:'Fac 2',
                services: [
                    {name:'Service 3'},
                    {name:'Service 4', visible:false},
                    {name:'Service 5', visible:true}
                ]},
            {name:'Fac 3', services: null},
            {name:'Fac 4'}
        ]
    };
    var data = [{id:1,val:'B'}, {id:2,val:'A'}, {id:3,val:'B'}, {id:2,val:'C'}, {id:1,val:'D'}];

    it('Should handle placeholders', function () {
        expect(first(people, '{[?,?,?,?,?]}', 1, 2, 'a', 'b', 'c')).toEqual([1, 2, 'a', 'b', 'c']);
        expect(first(people, '{?}', 1)).toEqual(1);
        expect(first(people, '{?+?+?}', 1, 2, 4)).toEqual(7);
        expect(first(people, '[0]{?+?+?}', 1, 2, 4)).toEqual(7);
        expect(query(people, '{[?,?,?,?,?][i]}', 1, 2, 'a', 'b', 'c')).toEqual([1, 2, 'a', 'b', 'c']);

        expect(query(100, '{?+?+?+?}', 1, 2, 3, 4)).toEqual([10]);
        expect(function () {query(100, '{?+?+?+?}', 1, 2)}).toThrow('Wrong args count');
        expect(function () {first(100, '{?+?+?+?}', 1, 2, 3, 4, 5)}).toThrow('Wrong args count');
        expect(function () {query(100, 'a.?.b')}).toThrow('? at wrong position');
        expect(function () {first(100, 'a.b[0].c?', 1, 2)}).toThrow('? at wrong position');

        function f1(elt) { return elt > 2 }
        function f2(elt) { return elt + 10 }
        expect(jsqry.query([1, 2, 3, 4, 5], '[ ?(_) ]{ ?(_) }', f1, f2)).toEqual([13, 14, 15]);
    });

    it("Should correctly handle '?'", function () {
        expect(query(Array(20),
            '{ i % 15 == 0 ?? "FizzBuzz" : i % 3 == 0 ?? "Fizz" : i % 5 == 0 ?? "Buzz" : i }')).toEqual(
            [ 'FizzBuzz', 1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz', 16, 17, 'Fizz', 19 ]);
        expect(query(Array(20),
            '{ i % 15 == 0 ?? ? : i % 3 == 0 ?? ? : i % 5 == 0 ?? ? : i }', 'FizzBuzz', 'Fizz', 'Buzz')).toEqual(
            [ 'FizzBuzz', 1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz', 16, 17, 'Fizz', 19 ]);

        expect(first(1, '{ "??" + _ + "??" }')).toEqual('?1?');
        expect(first('How are you', '{ _ + ", " + ? + "??" }', 'Peter')).toEqual('How are you, Peter?');
    });

    function basicTests () {
        expect(query({ll: people}, 'll.name{_.toUpperCase()}{_.length}[_>=5][1]')).toEqual([7]);
        expect(first(people, '[_.id>=2].name[_.toLowerCase()[0]==?]', 's')).toEqual('Serg');
        expect(query(people, 'name[_[0]==? || _[0]==?]', 'S', 'Z')).toEqual(['Serg','Zachary']);
        expect(first(people, '[_.id>=2].name[_.toLowerCase()[0]==?].length', 's')).toEqual(4);

        expect(query([{a: 1}, {a: 2}, {a: 3}], 'a[_>=2]{_+100}')).toEqual([102, 103]);

        expect(query(hotel, 'facilities[_.services]').length).toEqual(2);
        expect(query(hotel, 'facilities[_.services].name')).toEqual(['Fac 1', 'Fac 2']);
        expect(query(hotel, 'facilities.services').length).toEqual(5);
        expect(query(hotel, 'facilities.services.name')).toEqual(['Service 1', 'Service 2', 'Service 3', 'Service 4', 'Service 5']);
        expect(query(hotel, 'facilities.services[_.visible!==false].name')).toEqual(['Service 2', 'Service 3', 'Service 5']);
    }
    it('Should pass basic tests (1st pass)', basicTests);
    it('Should pass basic tests (test caching)', basicTests);

    it('Should pass array indexing & slicing', function () {
        var l = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

        expect(first([], '')).toEqual(null);
        expect(first([], '[0]')).toEqual(null);
        expect(first([], '[2]')).toEqual(null);
        expect(first([], '[-1]')).toEqual(null);
        expect(query([], '')).toEqual([]);
        expect(query([], '[0]')).toEqual([]);
        expect(query([], '[2]')).toEqual([]);
        expect(query([], '[-1]')).toEqual([]);
        expect(first(l, '[4]')).toEqual('e');
        expect(first(l, '[-1]')).toEqual('g');
        expect(first(l, '[4]{_.toUpperCase()}')).toEqual('E');
        expect(query(l, '[0:7]')).toEqual(l);
        expect(query(l, '[:]')).toEqual(l);
        expect(query(l, '[::]')).toEqual(l);
        expect(query(l, '[:2]')).toEqual(['a', 'b']);
        expect(query(l, '[2:]')).toEqual(['c', 'd', 'e', 'f', 'g']);
        expect(query(l, '[2:-2]')).toEqual(['c', 'd', 'e']);
        expect(query(l, '[0:7:2]')).toEqual(['a', 'c', 'e', 'g']);
        expect(query(l, '[::-1]')).toEqual(['g', 'f', 'e', 'd', 'c', 'b', 'a']);
        expect(query(l, '[::2]')).toEqual(['a', 'c', 'e', 'g']);
        expect(query(l, '[::-2]')).toEqual(['g', 'e', 'c', 'a']);
        expect(query(l, '[::2][::-1]')).toEqual(['g', 'e', 'c', 'a']);
    });

    it('Should support flatting', function () {
        expect(query([{it: [{a: 1}, {a: 2}]}, {it: [{a: 3}]}], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[{a: 1}, {a: 2}], [{a: 3}]], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[1, 2, 3], [4, 5], [6]], 'it.it')).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('Should support index parameter', function () {
        expect(query([0, 0, 0, 0, 0], '{i}')).toEqual([0, 1, 2, 3, 4]);
        expect(query(['a', 'b', 'c', 'd', 'e'], '[i%2==0]')).toEqual(['a', 'c', 'e']);
    });

    it('Should support sorting', function () {
        expect(query([2, 4, 1, 5, 3], 's(_)')).toEqual([1, 2, 3, 4, 5]);
        expect(query([2, 4, 1, 5, 3], '.s()')).toEqual([1, 2, 3, 4, 5]);
        expect(query([2, 4, 1, 5, 3], 's(-_)')).toEqual([5, 4, 3, 2, 1]);
        expect(query([{id:2,val:22}, {id:4,val:44}, {id:1,val:11}, {id:5,val:55}, {id:3,val:33}],
            's(-_.id).val')).toEqual([55, 44, 33, 22, 11]);
    });
    it('Should support unique', function () {
        expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], '.u(_)')).toEqual([2, 4, 1, 5, 3]);
        expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], 'u()')).toEqual([2, 4, 1, 5, 3]);
        expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], 'u()s()')).toEqual([1, 2, 3, 4, 5]);
        expect(query([[2], [4], [1], [4], [5], [3], [3], [1], [4], [2], [5]], 'it.u(_)')).toEqual([2, 4, 1, 5, 3]);
        expect(query(data, 'u(_.id)s(_.val)u(_.val).val')).toEqual(['A','B']);
        expect(query(data, '.u(_.id).u(_.val).s(_.val).val')).toEqual(['A','B']);
        expect(query(data, '{ {a:_} }.a.u(_.id)u(_.val)s(_.val).val')).toEqual(['A','B']);
    });
    it('Should support grouping', function () {
        expect(query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], 'g()'))
            .toEqual([[1, [1]], [2, [2, 2, 2, 2]], [3, [3, 3]], [4, [4, 4, 4]], [5, [5, 5]]]);
        expect(query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], 'g(){ [_[0], _[1].length] }'))
            .toEqual([[1, 1], [2, 4], [3, 2], [4, 3], [5, 2]]);
        expect(query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], 'g(){ [_[0], _[1].length] }s(-_[1]){_[0]}'))
            .toEqual([2, 4, 3, 5, 1]); // sorted by popularity
        expect(query([1.3, 2.1, 2.4], 'g(Math.floor(_))'))
            .toEqual([[1, [1.3]], [2, [2.1, 2.4]]]);
        expect(query(['one', 'two', 'three'], 'g(_.length){_[1]}'))
            .toEqual([['one', 'two'], ['three']]);
        expect(query(['one', 'two', 'three'], 'g(_.length){_[1]}.length'))
            .toEqual([2, 1]);
        expect(query([[1, 1], [2, 2], [1, 3], [3, 4], [1, 5], [2, 6]], 'g(_[0])'))
            .toEqual([[1, [[1, 1], [1, 3], [1, 5]]], [2, [[2, 2], [2, 6]]], [3, [[3, 4]]]]);
        expect(query([{id:1, val:1}, {id:2, val:2}, {id:1, val:3}, {id:3, val:4}, {id:1, val:5}, {id:2, val:6}], 'g(_.id)'))
            .toEqual([[1, [{id:1, val:1}, {id:1, val:3},  {id:1, val:5}]], [2, [{id:2, val:2}, {id:2, val:6}]], [3, [{id:3, val:4}]]]);
    });
    it('Should fail on incorrect input', function () {
        expect(function () {query(1, 'a[id==1')}).toThrow('Not closed [');
        expect(function () {query(1, '.a(id==1')}).toThrow('Not closed (');
        expect(function () {query(1, 'a{id==1')}).toThrow('Not closed {');

        expect(function () {query(1, 'a(_)')}).toThrow('not valid call: "a"');

        expect(function () {query(1, 'a)')}).toThrow(') without (');
        expect(function () {query(1, '.a)')}).toThrow(') without (');
        expect(function () {query(1, ']')}).toThrow('] without [');
        expect(function () {query(1, 'b{_+1}}')}).toThrow('} without {');

        expect(function () {query(1, '.............')}).toThrow('. at wrong position');
        expect(function () {query(1, 'a.')}).toThrow('. at wrong position');
    });
    it('Should tolerate spaces', function () {
        expect(query(data, 'u(_.id) s(_.val) u( _.val ) .val')).toEqual(['A','B']);
        expect(query([2, 4, 1, 4, 5, 3, 3, 1, 4, 2, 5], ' u( ) ')).toEqual([2, 4, 1, 5, 3]);
        expect(query([1, 2, 3, 2, 2, 3, 4, 4, 2, 4, 5, 5], 'g()  { [_[0], _[1].length] }    s(-_[1])   {_[0]}'))
            .toEqual([2, 4, 3, 5, 1]); // sorted by popularity
        expect(first({a:{b:{c:{d:{e:123}}}}}, ' a.b  .c   .   d.  e ')).toEqual(123)
    });
    it('Should support tricks', function () {
        // zip
        expect(query(['a', 'b', 'c', 'd'], '{[_,?[i]]}', ['A', 'B', 'C', 'D'])).toEqual([['a','A'],['b', 'B'],['c', 'C'],['d', 'D']]);
        expect(query(['a', 'b', 'c', 'd'], '{ [_, ?[i], ?[i]] }', ['A', 'B', 'C', 'D'],['AA', 'BB', 'CC', 'DD']))
            .toEqual([['a','A', 'AA'],['b', 'B', 'BB'],['c', 'C', 'CC'],['d', 'D', 'DD']]);
        // enumerate
        expect(query(['a', 'b', 'c', 'd'], '{[i,_]}')).toEqual([[0, 'a'], [1, 'b'], [2, 'c'], [3, 'd']]);
        expect(query(Array(26), '{String.fromCharCode(i+97)}').join('')).toEqual('abcdefghijklmnopqrstuvwxyz')
    })
});