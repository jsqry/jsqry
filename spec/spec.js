describe('jsqry tests', function () {
    var query = jsqry.query;
    var one = jsqry.one;

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

    it('should handle placeholders', function () {
        expect(one(people, '{[?,?,?,?,?]}', 1, 2, 'a', 'b', 'c')).toEqual([1, 2, 'a', 'b', 'c']);
        expect(one(people, '{?}', 1)).toEqual(1);
        expect(one(people, '{?+?+?}', 1, 2, 4)).toEqual(7);
        expect(one(people, '[0]{?+?+?}', 1, 2, 4)).toEqual(7);
        expect(query(people, '{[?,?,?,?,?][i]}', 1, 2, 'a', 'b', 'c')).toEqual([1, 2, 'a', 'b', 'c']);
    });

    function basicTests () {
        expect(query({ll: people}, 'll.name{_.toUpperCase()}{_.length}[_>=5][1]')).toEqual([7]);
        expect(one(people, '[_.id>=2].name[_.toLowerCase()[0]==?]', 's')).toEqual('Serg');
        expect(query(people, 'name[_[0]==? || _[0]==?]', 'S', 'Z')).toEqual(['Serg','Zachary']);
        expect(one(people, '[_.id>=2].name[_.toLowerCase()[0]==?].length', 's')).toEqual(4);

        expect(query([{a: 1}, {a: 2}, {a: 3}], 'a[_>=2]{_+100}')).toEqual([102, 103]);

        expect(query(hotel, 'facilities[_.services]').length).toEqual(2);
        expect(query(hotel, 'facilities[_.services].name')).toEqual(['Fac 1', 'Fac 2']);
        expect(query(hotel, 'facilities.services').length).toEqual(5);
        expect(query(hotel, 'facilities.services.name')).toEqual(['Service 1', 'Service 2', 'Service 3', 'Service 4', 'Service 5']);
        expect(query(hotel, 'facilities.services[_.visible!==false].name')).toEqual(['Service 2', 'Service 3', 'Service 5']);
    }
    it('should pass basic tests (1st pass)', basicTests);
    it('should pass basic tests (test caching)', basicTests);

    it('should pass array indexing & slicing', function () {
        var l = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

        expect(one([], '')).toEqual(null);
        expect(one([], '[0]')).toEqual(null);
        expect(one([], '[2]')).toEqual(null);
        expect(one([], '[-1]')).toEqual(null);
        expect(query([], '')).toEqual([]);
        expect(query([], '[0]')).toEqual([]);
        expect(query([], '[2]')).toEqual([]);
        expect(query([], '[-1]')).toEqual([]);
        expect(one(l, '[4]')).toEqual('e');
        expect(one(l, '[-1]')).toEqual('g');
        expect(one(l, '[4]{_.toUpperCase()}')).toEqual('E');
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

    it('should support flatting', function () {
        expect(query([{it: [{a: 1}, {a: 2}]}, {it: [{a: 3}]}], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[{a: 1}, {a: 2}], [{a: 3}]], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[1, 2, 3], [4, 5], [6]], 'it.it')).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should support index parameter', function () {
        expect(query([0, 0, 0, 0, 0], '{i}')).toEqual([0, 1, 2, 3, 4]);
        expect(query(['a', 'b', 'c', 'd', 'e'], '[i%2==0]')).toEqual(['a', 'c', 'e']);
    });

    it("should correctly handle '?'", function () {
        expect(query(Array(20),
            '{ i % 15 == 0 ?? "FizzBuzz" : i % 3 == 0 ?? "Fizz" : i % 5 == 0 ?? "Buzz" : i }')).toEqual(
            [ 'FizzBuzz', 1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz', 16, 17, 'Fizz', 19 ]);
        expect(query(Array(20),
            '{ i % 15 == 0 ?? ? : i % 3 == 0 ?? ? : i % 5 == 0 ?? ? : i }', 'FizzBuzz', 'Fizz', 'Buzz')).toEqual(
            [ 'FizzBuzz', 1, 2, 'Fizz', 4, 'Buzz', 'Fizz', 7, 8, 'Fizz', 'Buzz', 11, 'Fizz', 13, 14, 'FizzBuzz', 16, 17, 'Fizz', 19 ]);

        expect(one(1, '{ "??" + _ + "??" }')).toEqual('?1?');
        expect(one('How are you', '{ _ + ", " + ? + "??" }', 'Peter')).toEqual('How are you, Peter?');

        expect(query(100, '{?+?+?+?}', 1, 2, 3, 4)).toEqual([10]);
        expect(function () {query(100, '{?+?+?+?}', 1, 2)}).toThrow('Wrong args count!');
        expect(function () {one(100, '{?+?+?+?}', 1, 2, 3, 4, 5)}).toThrow('Wrong args count!');
        expect(function () {query(100, 'a.?.b')}).toThrow('? at wrong position');
        expect(function () {one(100, 'a.b[0].c?', 1, 2)}).toThrow('? at wrong position');
    })
});