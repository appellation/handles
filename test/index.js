const { Registry } = require('../dist');
const client = new Registry();
(async () => {
  await client.load('./test/commands');

  console.log(await client.handle({
    id: 'xd',
    body: 'add 1 xd',
  }));
})();
