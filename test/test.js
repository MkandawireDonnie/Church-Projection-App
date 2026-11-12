const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const { Store, parseBibleText, searchBible, splitSlides, parseRef } = require('../lib');
const f = path.join(os.tmpdir(), 'cp-test-' + Date.now() + '.json');
let s = new Store(f); s.set('songs', [{ id: '1', title: 'Amazing Grace', lyrics: 'a\nb' }]);
s = new Store(f); assert.equal(s.data.songs[0].title, 'Amazing Grace'); // persistence round-trip
fs.writeFileSync(f, '{broken'); s = new Store(f); assert.deepEqual(s.data.songs, []); // corrupt file is backed up, app still starts
const txt = 'John 3:16 For God so loved the world\n1 John 4:8 God is love\nPsalms 23:1 The Lord is my shepherd\nbad line\nJohn 3:17 God sent not his Son to condemn';
const v = parseBibleText(txt, 'KJV'); assert.equal(v.length, 4);
assert.deepEqual(searchBible(v, 'John 3:16-17', 'KJV').map(x => x.v), [16, 17]);
assert.equal(searchBible(v, 'jn 3:16')[0].t.startsWith('For God'), true);
assert.equal(searchBible(v, '1 John 4:8')[0].b, '1 John');
assert.equal(searchBible(v, 'ps 23')[0].b, 'Psalms');
assert.equal(searchBible(v, 'shepherd lord').length, 1);
assert.equal(searchBible(v, 'zzz').length, 0);
assert.equal(parseRef('John 3:16').v1, 16);
const sl = splitSlides('l1\nl2\nl3\nl4\nl5\n\nchorus1\nchorus2', 4); assert.equal(sl.length, 3); assert.equal(sl[1].text, 'l5');
console.log('All tests passed');
