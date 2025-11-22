# Contribute to Slot Engine

Thanks for your interest in contributing to Slot Engine! We welcome contributions from the community to help improve this project.

Contributions are not limited to code changes. You can also contribute by:

- Reporting bugs
- Suggesting new features
- Improving documentation

## Development Setup

### Prequisites

- [Node.js](https://nodejs.org/) (23.8.0 or higher)
- [pnpm](https://pnpm.io/) (10.18.0 or higher)

### Setup Instructions

Clone the repository:

```sh
git clone git@github.com:slot-engine/slot-engine.git
```

Install dependencies:

```sh
cd slot-engine
pnpm install
```

## Code Structure

- The documentation is a [Next.js](https://nextjs.org) + [Fumadocs](https://fumadocs.dev/) project located in the `docs` folder.
- All source code for the libraries is located in the `packages` folder.
- Example projects can be found in the `examples` folder.

## Building Packages

You will need to build the packages before running examples.

To build all packages, run:

```sh
pnpm build
```

To watch for changes and rebuild packages automatically, run:

```sh
pnpm dev
```

## Running the Docs

To run the documentation site locally, run the following command in the root directory:

```sh
pnpm docs:dev
```

You could also navigate to the `docs` folder and run `pnpm dev` there.

## Running Examples

Navigate to the desired example folder in the `examples` directory and run:

```sh
pnpm install
pnpm build
```

## Running Tests

To run tests for all packages, use the following command:

```sh
pnpm test
```

## Contribution Guidelines

- Follow the existing code style and conventions
- Write clear and concise commit messages
- Ensure all tests pass before submitting a pull request
- Add a [changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md) (`pnpm changeset`) for any changes to the packages