# E2E Tests for Rework Dashboard

This directory contains end-to-end tests for the Jira Rework Dashboard using Playwright.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

## Running Tests

### Run all tests (headless mode)
```bash
npm run test:e2e
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test rework-dashboard.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should display rework metrics"
```

## Test Coverage

### rework-dashboard.spec.ts

Tests for the core rework dashboard functionality:

1. **Rework metrics display after board selection**
   - Verifies that metrics are loaded and displayed when a board is selected
   - Checks all metric values (ratio, stories, bugs, points)

2. **Time range switching updates metrics**
   - Tests switching between 30, 60, and 90 day views
   - Verifies metrics update correctly for each time range

3. **Loading state shows during API call**
   - Tests loading skeleton appears during data fetching
   - Verifies loading state disappears when data is loaded

4. **Missing data warning appears when items excluded**
   - Tests warning banner displays when items are excluded
   - Verifies warning message and accessibility attributes

5. **Error message displays on API failure**
   - Tests error handling when API returns 500 error
   - Verifies error message styling and content

6. **Session expiry redirects to landing page**
   - Tests that 401 responses trigger redirect to landing page
   - Verifies session expiry is handled gracefully

7. **Multiple board selections**
   - Tests switching between different boards
   - Verifies metrics update for each board

8. **Accessibility standards**
   - Tests keyboard navigation
   - Verifies ARIA labels and roles
   - Checks screen reader support

9. **No boards available scenario**
   - Tests display when no boards are available
   - Verifies appropriate message is shown

10. **Time range persistence when switching boards**
    - Tests that selected time range is maintained when switching boards
    - Verifies UI state consistency

## Test Architecture

### API Mocking

All tests use Playwright's route interception to mock API responses. This allows us to:
- Test various scenarios without depending on backend state
- Simulate error conditions
- Test loading states with controlled delays
- Ensure consistent, repeatable test results

### Helper Functions

The test file includes several helper functions for common operations:
- `mockAuthentication()` - Mocks successful authentication
- `mockBoardsAPI()` - Mocks the boards list endpoint
- `mockReworkMetricsAPI()` - Mocks the rework metrics endpoint
- `mockReworkMetricsAPIWithDelay()` - Adds delay for loading state testing
- `mockReworkMetricsAPIWithError()` - Simulates API errors
- `mockSessionExpiry()` - Simulates session expiration

## Best Practices

1. **Use data-testid for stable selectors** - Consider adding data-testid attributes to components for more reliable selectors

2. **Keep tests independent** - Each test should be self-contained and not depend on other tests

3. **Use proper waits** - Always wait for elements to be visible/loaded before interacting

4. **Test user flows, not implementation** - Focus on what users do, not how it's implemented

5. **Mock external dependencies** - Use route interception to mock all API calls

## Debugging Failed Tests

1. **View test reports**:
   ```bash
   npx playwright show-report
   ```

2. **Check screenshots**: Failed tests automatically capture screenshots in `test-results/`

3. **Watch videos**: Failed tests record videos in `test-results/`

4. **Use debug mode**: Run tests with `--debug` flag to step through tests

5. **Use trace viewer**:
   ```bash
   npx playwright show-trace test-results/trace.zip
   ```

## CI/CD Integration

The tests are configured to run in CI environments with:
- 2 retries on failure
- Single worker (no parallel execution)
- HTML and list reporters
- Automatic screenshots and videos on failure

## Browser Coverage

Tests run on:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

You can run tests for a specific browser:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Updating Tests

When updating the dashboard functionality:

1. Update test expectations if UI changes
2. Add new tests for new features
3. Update mock data if API contracts change
4. Keep README updated with new test coverage

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
