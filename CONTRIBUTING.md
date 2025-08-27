# Contributing to Slack Status Scheduler

Thank you for your interest in contributing to Slack Status Scheduler! This document outlines the process for contributing to this project and helps ensure a smooth collaboration experience.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js 18+** - for the headless runner and CLI
- **macOS 12+** - for macOS app development (optional)
- **Xcode 14+** - for Swift/SwiftUI development (optional)
- **Git** - for version control

### Initial Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/thesammykins/slackstatus.git
   cd slackstatus
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up pre-commit hooks**:
   ```bash
   npm run prepare
   ```
5. **Create a test Slack app** for development:
   - Go to [Slack API: Your Apps](https://api.slack.com/apps)
   - Create a new app for testing
   - Add `users.profile:write` scope
   - Install to a test workspace
   - Copy the User OAuth Token

### Environment Setup

Create a `.env` file for local development:

```bash
# .env (never commit this file)
SLACK_TOKEN=xoxp-your-test-token-here
TEST_WORKSPACE_ID=T1234567890
```

## Development Workflow

### Branch Strategy

- `main` - production-ready code
- `develop` - integration branch for features
- `feature/feature-name` - individual features
- `fix/bug-description` - bug fixes
- `docs/update-description` - documentation updates

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Project Structure

```
slack_status/
├── src/                    # Core scheduling engine
│   ├── scheduler/          # Rule matching and evaluation
│   ├── slack/              # Slack API integration
│   ├── timezone/           # Timezone and DST handling
│   └── utils/              # Shared utilities
├── cli/                    # Command-line interface
├── macos/                  # macOS SwiftUI app
├── docs/                   # Documentation
├── examples/               # Example configurations
├── tests/                  # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── fixtures/           # Test data
└── exports/                # Generated export templates
```

### Key Components

- **Scheduler Engine** (`src/scheduler/`) - Core rule evaluation logic
- **Slack Integration** (`src/slack/`) - API calls and error handling
- **Timezone Handling** (`src/timezone/`) - DST-aware date/time operations
- **CLI** (`cli/`) - Command-line interface and validation
- **macOS App** (`macos/`) - Native SwiftUI menu bar application

## Coding Standards

### JavaScript/Node.js

- **ES Modules** - Use `import`/`export` syntax
- **Modern JavaScript** - Target Node.js 18+ features
- **ESLint + Prettier** - Enforced via pre-commit hooks
- **JSDoc** - Document public APIs
- **Error Handling** - Use structured error objects

#### Code Style

```javascript
// ✅ Good
import { DateTime } from 'luxon';
import { WebClient } from '@slack/web-api';

/**
 * Evaluates scheduling rules for a given date
 * @param {Object} schedule - The schedule configuration
 * @param {DateTime} targetDate - Date to evaluate
 * @returns {Object|null} Matching rule or null
 */
export function evaluateRules(schedule, targetDate) {
  if (!schedule?.rules?.length) {
    throw new Error('Schedule must contain at least one rule');
  }
  
  for (const rule of schedule.rules) {
    if (matchesRule(rule, targetDate)) {
      return rule;
    }
  }
  
  return null;
}

// ❌ Avoid
function eval_rules(sched, date) {
  // missing validation, unclear parameter types
  for (var i = 0; i < sched.rules.length; i++) {
    // use const/let, prefer for...of
  }
}
```

### Swift/SwiftUI (macOS App)

- **Swift 5.7+** - Use modern Swift features
- **SwiftUI** - Declarative UI patterns
- **MVVM Architecture** - Clear separation of concerns
- **SwiftLint** - Code style enforcement
- **Documentation** - Use Swift documentation comments

#### Code Style

```swift
// ✅ Good
import SwiftUI
import Foundation

/// Main view model for the menu bar application
@MainActor
final class MenuBarViewModel: ObservableObject {
    @Published private(set) var scheduleStatus: ScheduleStatus = .inactive
    
    private let scheduler: SchedulerService
    private let keychain: KeychainService
    
    init(scheduler: SchedulerService, keychain: KeychainService) {
        self.scheduler = scheduler
        self.keychain = keychain
    }
    
    func loadSchedule() async throws {
        // Implementation
    }
}
```

### File Naming

- **JavaScript**: `kebab-case.js` (e.g., `schedule-evaluator.js`)
- **Swift**: `PascalCase.swift` (e.g., `MenuBarView.swift`)
- **Documentation**: `kebab-case.md` (e.g., `github-actions.md`)
- **Examples**: `descriptive-name.json` (e.g., `weekly-schedule.json`)

## Testing

### Test Structure

- **Unit Tests** - Test individual functions and components
- **Integration Tests** - Test component interactions
- **End-to-End Tests** - Test complete user workflows

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --testNamePattern="scheduler"

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

```javascript
// tests/unit/scheduler.test.js
import { describe, test, expect } from '@jest/globals';
import { DateTime } from 'luxon';
import { evaluateRules } from '../../src/scheduler/index.js';

describe('Schedule Evaluator', () => {
  test('should match weekly rule on correct day', () => {
    const schedule = {
      timezone: 'America/Los_Angeles',
      rules: [{
        type: 'weekly',
        days: ['mon', 'tue'],
        time: '09:00',
        status: { text: 'Working', emoji: ':computer:' }
      }]
    };
    
    const monday = DateTime.fromISO('2024-01-08T10:00:00', { 
      zone: 'America/Los_Angeles' 
    }); // Monday
    
    const result = evaluateRules(schedule, monday);
    expect(result).not.toBeNull();
    expect(result.status.text).toBe('Working');
  });
  
  test('should not match weekly rule on wrong day', () => {
    // Test implementation
  });
});
```

### Test Data

Use fixtures for consistent test data:

```javascript
// tests/fixtures/schedules.js
export const weeklySchedule = {
  timezone: 'America/Los_Angeles',
  rules: [
    // Standard test schedule
  ]
};
```

## Submitting Changes

### Pull Request Process

1. **Ensure your branch is up to date**:
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run the full test suite**:
   ```bash
   npm test
   npm run lint
   npm run format:check
   ```

3. **Update documentation** if needed

4. **Write a clear PR description**:
   - What changes were made
   - Why the changes were necessary
   - How to test the changes
   - Any breaking changes

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/modifications
- `chore:` - Maintenance tasks

Examples:
```bash
feat(scheduler): add support for monthly recurrence rules
fix(timezone): handle DST transitions correctly
docs(api): update schedule.json schema documentation
test(slack): add integration tests for API error handling
```

### PR Review Criteria

Your PR will be reviewed for:

- **Functionality** - Does it work as intended?
- **Code Quality** - Is it readable and maintainable?
- **Tests** - Are there adequate tests?
- **Documentation** - Are docs updated if needed?
- **Performance** - Any performance implications?
- **Security** - No security vulnerabilities?
- **Breaking Changes** - Are they necessary and documented?

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Steps

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with new features/fixes
3. **Create release PR** to `main`
4. **Tag release** after merge
5. **Publish packages** (automated via CI)
6. **Update documentation** if needed

## Getting Help

- **Questions**: Open a [Discussion](https://github.com/thesammykins/slackstatus/discussions)
- **Bugs**: Create an [Issue](https://github.com/thesammykins/slackstatus/issues)
- **Feature Requests**: Create an [Issue](https://github.com/thesammykins/slackstatus/issues) with the "enhancement" label

## Recognition

Contributors will be recognized in:
- README.md acknowledgments
- Release notes
- GitHub contributors page

Thank you for contributing to Slack Status Scheduler! 🎉