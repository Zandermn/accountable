import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
test('opens the Dashboard and exposes all five sales sections', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(
    screen.getByRole('navigation', { name: 'Main sections' }).querySelectorAll('a'),
  ).toHaveLength(5);
});
