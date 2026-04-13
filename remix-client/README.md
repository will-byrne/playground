# TODO

- [*] Add ui for pokemon route
  - ~~[] port ux from react-client ~~
  - [*] if that is too much effore get gopilot to make one (ux unimportant for this repo)
- [*] Add Error handling for pokemon search
- [*] Add cached dex display
- [*] Load pokemon from cached display click
- [*] Add route for random pokemon
- [*] Add navigation to move to next / previous pokemon
- [] Add ai tests and evaluate
  - [*] Add ai tests
  - [*] Evaluate the tests
  - [] Generate test cases with ai and write tests manually.

## Test evaluation

What a pointless bunch of junk those test are. I found only one test file that actually imported my code, I am very dissapointed in how badly that went and definately will not be generating tests with ai again any time soon.
I would like to in the future test to see how it deals with generating empty test cases using `it.todo` or similar, that way I can at least grok whether it understands what needs to be tested.
Here is the coverage report:

```
$ vitest --coverage

 DEV  v1.6.1 /home/luna/git/playground/remix-client
      Coverage enabled with v8

stderr | test/integration/loaders.test.ts > Loader Integration Tests > Error Handling in Loaders > should log errors to console
Error fetching Pokemon: test error

 ✓ test/utils/helpers.test.ts (33)
 ✓ test/routes/pokemon.test.ts (19)
 ✓ test/helpers/pokemon-helpers.test.ts (11)
 ✓ test/integration/loaders.test.ts (15)
 ✓ test/routes/index.test.ts (12)
 ✓ test/routes/root.test.ts (13)
 ✓ test/utils/typed-fetch.test.ts (5)

 Test Files  7 passed (7)
      Tests  108 passed (108)
   Start at  00:22:56
   Duration  10.93s (transform 5.74s, setup 60.20s, collect 3.10s, tests 74ms, environment 4.82s, prepare 2.99s)

 % Coverage report from v8
-------------------------------|---------|----------|---------|---------|-------------------
File                           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------------------|---------|----------|---------|---------|-------------------
All files                      |    1.43 |    33.33 |   11.11 |    1.43 |
 remix-client                  |       0 |        0 |       0 |       0 |
  .eslintrc.cjs                |       0 |        0 |       0 |       0 | 1-84
  tailwind.config.ts           |       0 |        0 |       0 |       0 | 1-22
 remix-client/app              |       0 |        0 |       0 |       0 |
  catppuccinTheme.macchiato.ts |       0 |        0 |       0 |       0 | 1-3
  entry.client.tsx             |       0 |        0 |       0 |       0 | 1-18
  entry.server.tsx             |       0 |        0 |       0 |       0 | 1-140
  root.tsx                     |       0 |        0 |       0 |       0 | 1-45
 remix-client/app/routes       |       0 |        0 |       0 |       0 |
  _index.tsx                   |       0 |        0 |       0 |       0 | 1-239
  pokemon.$idOrName.tsx        |       0 |        0 |       0 |       0 | 1-275
 remix-client/utils            |     100 |      100 |     100 |     100 |
  typed-fetch.ts               |     100 |      100 |     100 |     100 |
-------------------------------|---------|----------|---------|---------|-------------------
```

# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```sh
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
