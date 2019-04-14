const File = require('..');
const tape = require('tape');
tape('Fileable Component Test: File', async ({deepEqual, end}) => {
    const iterator = File({});
    deepEqual(
        (await iterator.next()).value
        , {
            directive: 'FILE'
            , append: false
            , content: Buffer.from('')
            , mode: 0o666
            , name: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
            , folder_context: ''
        },
        'default should be created')
    end();
});
