import { render, screen, fireEvent } from '@testing-library/react';
import { DishGuesser } from '../components/DishGuesser';

const ingredients = ['idli rice', 'urad dal', 'salt', 'water'];

describe('DishGuesser', () => {
  test('renders all ingredient chips', () => {
    render(<DishGuesser ingredients={ingredients} onSubmit={() => {}} disabled={false} />);
    for (const ing of ingredients) {
      expect(screen.getByText(ing)).toBeInTheDocument();
    }
  });

  test('submit button is disabled when input is empty', () => {
    render(<DishGuesser ingredients={ingredients} onSubmit={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: /guess/i })).toBeDisabled();
  });

  test('submit button enables when user types', () => {
    render(<DishGuesser ingredients={ingredients} onSubmit={() => {}} disabled={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Idli' } });
    expect(screen.getByRole('button', { name: /guess/i })).not.toBeDisabled();
  });

  test('calls onSubmit with trimmed English input', () => {
    const onSubmit = vi.fn();
    const { container } = render(<DishGuesser ingredients={ingredients} onSubmit={onSubmit} disabled={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Idli  ' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalledWith('Idli');
  });

  test('calls onSubmit with Tamil script input', () => {
    const onSubmit = vi.fn();
    const { container } = render(<DishGuesser ingredients={ingredients} onSubmit={onSubmit} disabled={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'இட்லி' } });
    fireEvent.submit(container.querySelector('form')!);
    expect(onSubmit).toHaveBeenCalledWith('இட்லி');
  });

  test('input is disabled when disabled prop is true', () => {
    render(<DishGuesser ingredients={ingredients} onSubmit={() => {}} disabled={true} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /guess/i })).toBeDisabled();
  });

  test('submit button disabled for whitespace-only input', () => {
    render(<DishGuesser ingredients={ingredients} onSubmit={() => {}} disabled={false} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /guess/i })).toBeDisabled();
  });
});
