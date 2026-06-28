import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import i18n from 'i18next';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  test('renders a button', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('button shows "தமிழ்" in English locale', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button')).toHaveTextContent('தமிழ்');
  });

  test('clicking toggles language to Tamil', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button'));
    expect(i18n.language).toBe('ta');
  });

  test('clicking again toggles back to English', () => {
    render(<LanguageSwitcher />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(i18n.language).toBe('en');
  });
});
