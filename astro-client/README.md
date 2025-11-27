# Pokemon Astro-Client
This is a all in one pokemon solution as opposed to the other folders in this repo. To load the pokemon you will first need to run:
```bash
yarn run sync:pokemon
```

this will fetch all 1025 pokemon from the pokenode api and store the relevant data in json files in `src/content/pokemon/{id}.json`.

The section bellow details how to run the astro commands.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `yarn install`             | Installs dependencies                            |
| `yarn dev`             | Starts local dev server at `localhost:4321`      |
| `yarn build`           | Build your production site to `./dist/`          |
| `yarn preview`         | Preview your build locally, before deploying     |
| `yarn astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `yarn astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
