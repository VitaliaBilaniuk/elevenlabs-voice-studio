import axe from 'axe-core';
import { expect } from 'vitest';

/**
 * Run axe-core against a rendered container and assert zero violations.
 *
 * `color-contrast` is disabled: jsdom does no layout/paint, so axe cannot
 * compute rendered colors reliably there (it flags false positives and
 * false negatives alike). Contrast is verified by hand against the actual
 * CSS custom properties instead — see the `--border-strong` comment in
 * index.css for the token this rule would otherwise be checking.
 */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const results = await axe.run(container, {
    preload: false, // jsdom has nothing for axe to preload; skip the wait
    rules: { 'color-contrast': { enabled: false } },
  });

  if (results.violations.length > 0) {
    const report = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
      .join('\n\n');
    console.error(report);
  }

  expect(results.violations).toEqual([]);
}
