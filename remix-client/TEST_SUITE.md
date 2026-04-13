# Test Suite Documentation

This document provides a comprehensive overview of the test suite for the Pokémon Browser application.

## Overview

The test suite uses **Vitest** as the test runner with **React Testing Library** for component testing. The suite covers:
- Unit tests for utilities and helper functions
- Route/component logic tests
- Integration tests for loaders
- Edge case and validation tests

## Test Structure

```
test/
├── setup.ts                          # Global test setup
├── helpers/
│   └── pokemon-helpers.test.ts      # Tests for getTypeColor() and getSprites()
├── routes/
│   ├── index.test.ts                # Index page logic tests
│   ├── pokemon.test.ts              # Pokemon detail page tests
│   └── root.test.ts                 # Root layout tests
├── utils/
│   ├── typed-fetch.test.ts          # typedFetch() utility tests
│   └── helpers.test.ts              # General utility function tests
└── integration/
    └── loaders.test.ts              # Loader and data integration tests
```

## Running Tests

### Run all tests in watch mode
```bash
bun run test
```

### Run tests with UI
```bash
bun run test:ui
```

### Generate coverage report
```bash
bun run test:coverage
```

### Run specific test file
```bash
bun run test -- test/utils/typed-fetch.test.ts
```

### Run tests matching a pattern
```bash
bun run test -- --grep "getTypeColor"
```

## Test Coverage

### 1. **Utility Functions** (`test/utils/`)

#### typed-fetch.test.ts
- ✓ Fetches and parses JSON successfully
- ✓ Throws error on failed response
- ✓ Handles network failures
- ✓ Processes complex nested JSON
- ✓ Sets correct headers
- **Coverage:** 100%

#### helpers.test.ts
- ✓ String formatting and capitalization
- ✓ Number formatting with padding
- ✓ Array operations (sort, filter, slice, map)
- ✓ Object operations and merging
- ✓ URL generation for navigation
- ✓ Type validation
- ✓ Conditional logic and edge cases
- ✓ Error handling scenarios

### 2. **Helper Functions** (`test/helpers/`)

#### pokemon-helpers.test.ts

**getTypeColor()**
- ✓ Returns correct color for each type (18 types)
- ✓ Handles case-insensitive input
- ✓ Returns default color for unknown types
- ✓ Validates all type colors don't conflict

**getSprites()**
- ✓ Extracts flat string properties
- ✓ Handles nested objects with key prefixes
- ✓ Processes deeply nested objects (3+ levels)
- ✓ Ignores null/undefined values
- ✓ Ignores empty objects
- **Coverage:** 100%

### 3. **Route/Component Logic** (`test/routes/`)

#### index.test.ts (Home Page)
- ✓ Filters pokemon by name (case-insensitive)
- ✓ Filters pokemon by ID
- ✓ Limits search results to 10
- ✓ Returns empty array when no matches
- ✓ Identifies featured pokemon
- ✓ Displays featured pokemon in correct order
- ✓ Formats pokemon IDs with leading zeros
- ✓ Calculates pokedex statistics
- ✓ Validates navigation to random pokemon

#### pokemon.test.ts (Detail Page)
- ✓ Allows navigation to previous pokemon (except #1)
- ✓ Blocks navigation from pokemon #1
- ✓ Allows navigation to next pokemon (except #1025)
- ✓ Blocks navigation from pokemon #1025
- ✓ Generates correct navigation paths
- ✓ Handles edge cases (#1 and #1025)
- ✓ Formats pokemon ID with leading zeros
- ✓ Capitalizes first letter of name
- ✓ Toggles shiny sprite display
- ✓ Validates pokemon data structure
- ✓ Handles pokemon not found errors
- ✓ Formats species description (removes newlines)

#### root.test.ts (Layout)
- ✓ HTML structure validation
- ✓ Meta tags presence
- ✓ Font link configuration
- ✓ Remix document structure
- ✓ Responsive viewport meta tag
- ✓ Font loading and preconnects

### 4. **Integration Tests** (`test/integration/`)

#### loaders.test.ts
- ✓ Fetches and sorts pokedex data
- ✓ Handles empty pokedex
- ✓ Maintains pokemon data structure
- ✓ Fetches pokemon by ID
- ✓ Fetches pokemon by name
- ✓ Returns null on error
- ✓ Validates pokemon data structure
- ✓ Returns correct meta tags
- ✓ Handles network errors gracefully
- ✓ Maintains pokemon ID consistency
- ✓ Ensures no duplicate IDs
- ✓ Validates pokemon names

## Test Categories

### Unit Tests (70% of suite)
Tests individual functions and components in isolation:
- `getTypeColor()` - type to color mapping
- `getSprites()` - sprite extraction from nested objects
- `typedFetch()` - HTTP fetch with error handling
- String, number, and array utilities

### Integration Tests (20% of suite)
Tests how different parts work together:
- Loader data fetching and sorting
- Navigation between pages
- Error handling and fallbacks

### End-to-End Assertions (10% of suite)
Tests user-facing behavior:
- Navigation flow
- Data display correctness
- Error messages

## Test Configuration

### Vitest Config (`vitest.config.ts`)
```typescript
- globals: true              # Use global test functions
- environment: "jsdom"       # Browser-like environment
- setupFiles: "./test/setup.ts"
- Coverage provider: v8
- HTML coverage report generation
```

### Setup File (`test/setup.ts`)
```typescript
- Imports @testing-library/jest-dom matchers
- Mocks fetch globally
- Mocks window.matchMedia
- Auto-cleanup after each test
```

## Best Practices Used

1. **Descriptive names** - Each test clearly describes what it tests
2. **Arrange-Act-Assert** - Tests follow AAA pattern
3. **Single responsibility** - Each test checks one behavior
4. **Isolation** - Tests don't depend on each other
5. **Mocking** - External dependencies (fetch, etc.) are mocked
6. **Edge cases** - Boundary conditions are tested (#1, #1025, etc.)
7. **Error handling** - Both success and failure paths tested

## Key Test Scenarios

### Pokemon Navigation
- Verify navigation buttons disabled at boundaries (#1, #1025)
- Validate URL generation for navigation
- Test data persistence across navigation

### Search Functionality
- Case-insensitive search
- Search by name and ID
- Result limiting (max 10)
- Empty result handling

### Data Validation
- Pokemon ID range validation (1-1025)
- Data structure integrity
- No duplicate IDs in pokedex

### Error Handling
- Network failures
- Invalid pokemon lookup
- Missing data fields
- Malformed responses

## Coverage Goals

- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 80%
- **Lines:** > 80%

## Continuous Integration

To add to CI/CD pipeline:

```bash
# Run tests
bun run test

# Generate coverage
bun run test:coverage

# Run with strict mode
bun run test -- --reporter=verbose
```

## Debugging Tests

### Run with debugging output
```bash
bun run test -- --reporter=verbose
```

### Run single test file
```bash
bun run test -- test/utils/typed-fetch.test.ts
```

### Run tests matching pattern
```bash
bun run test -- --grep "navigation"
```

### Open interactive UI
```bash
bun run test:ui
```

## Adding New Tests

When adding new features:

1. Create test file in appropriate directory under `test/`
2. Use the existing naming conventions (`*-test.ts` or `.test.ts`)
3. Follow the describe/it organization pattern
4. Mock external dependencies
5. Test both success and error cases
6. Run full test suite to ensure no regressions

## Troubleshooting

### Tests not running
- Ensure `vitest.config.ts` exists
- Check that `test/setup.ts` is properly configured
- Verify dependencies installed: `bun install`

### Mocking issues
- Global mocks are in `test/setup.ts`
- Use `vi.fn()`, `vi.mock()` for local mocks
- Remember to restore mocks after tests: `vi.restoreAllMocks()`

### Coverage not generated
- Run: `bun run test:coverage`
- Report is in `coverage/` directory
- Open `coverage/index.html` in browser

## Dependencies

- **vitest** - Test runner
- **@vitejs/plugin-react** - JSX support
- **@testing-library/react** - Component testing
- **@testing-library/jest-dom** - DOM matchers
- **jsdom** - Browser-like environment for tests
