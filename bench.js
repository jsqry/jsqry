var jsqry = require('./jsqry');

var N = 100000;

var o1 = [
    {id: 1, name: 'Alexander'},
    {id: 2, name: 'Serg'},
    {id: 3, name: 'Vlad'},
    {id: 4, name: 'Zachary'},
    {id: 5, name: 'Mihael'}
];

function doWork(N) {
    var v = 0;
    for (var i=0; i<N; i++)
        v += jsqry.one(o1, '[_.id>=2].name[_.toLowerCase()[0]==?].length', 's');// +=4
    return v;
}

console.time('cached');
console.log(doWork(N));
console.timeEnd('cached');

jsqry.cache = false;
console.time('not-cached');
console.log(doWork(N));
console.timeEnd('not-cached');