describe('jsqry tests', function () {
    it('should pass basic tests', function () {
        var o1 = [
            {id: 1, name: 'Alexander'},
            {id: 2, name: 'Serg'},
            {id: 3, name: 'Vlad'},
            {id: 4, name: 'Zachary'},
            {id: 5, name: 'Mihael'}
        ];

        expect(query({ll: o1}, 'll.name{_.toUpperCase()}{_.length}[_>=5][1]')).toEqual([7]);

        expect(one(o1, '[_.id>=2].name[_.toLowerCase()[0]==?]', 's')).toEqual('Serg');
        expect(one(o1, '[_.id>=2].name[_.toLowerCase()[0]==?].length', 's')).toEqual(4);

        expect(query([{a: 1}, {a: 2}, {a: 3}], 'a[_>=2]{_+100}')).toEqual([102, 103])
    });

    it('should pass array & list comprehensions', function () {
        var l = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

        expect(one([], '')).toEqual(null);
        expect(one([], '[0]')).toEqual(null);
        expect(one([], '[2]')).toEqual(null);
        expect(one([], '[-1]')).toEqual(null);
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
        // expect(query(l, '[::-1]')).toEqual(['g', 'f', 'e', 'd', 'c', 'b', 'a']);
    });

    it('should flat', function () {
        expect(query([{it: [{a: 1}, {a: 2}]}, {it: [{a: 3}]}], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[{a: 1}, {a: 2}], [{a: 3}]], 'it.a')).toEqual([1, 2, 3]);
        expect(query([[1, 2, 3], [4, 5], [6]], 'it.it')).toEqual([1, 2, 3, 4, 5, 6]);
    })
});