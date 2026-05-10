import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

describe('Badge Component', () => {
  it('renders with text content', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders with default neutral variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders error variant', () => {
    render(<Badge variant="error">Error</Badge>);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('renders primary variant', () => {
    render(<Badge variant="primary">Primary</Badge>);
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('renders with dot indicator', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    const dotElement = container.querySelector('span');
    expect(dotElement).toBeInTheDocument();
  });

  it('renders uppercase text', () => {
    render(<Badge>pending</Badge>);
    const badge = screen.getByText('pending');
    expect(badge).toHaveStyle('textTransform: uppercase');
  });

  it('renders inline-flex container', () => {
    const { container } = render(<Badge>Test</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveStyle('display: inline-flex');
  });
});

describe('Input Component', () => {
  it('renders input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders required indicator', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('handles value changes', () => {
    render(<Input defaultValue="" />);
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 'test input' } });
    expect(input.value).toBe('test input');
  });

  it('displays error message', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('displays hint text', () => {
    render(<Input hint="Enter a valid email" />);
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
  });

  it('has error indicator when error prop is set', () => {
    render(<Input error="Invalid input" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('changes focus state', () => {
    const { container } = render(<Input />);
    const input = screen.getByRole('textbox');
    
    fireEvent.focus(input);
    // Component should update focus state
    
    fireEvent.blur(input);
    // Component should update blur state
    
    expect(input).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('applies generated id if not provided', () => {
    const { container } = render(<Input label="Test" />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Test');
    
    // Check if input has an id
    expect(input.id).toBeTruthy();
    // Check if label is connected to input
    expect(label.htmlFor).toBe(input.id);
  });

  it('uses custom id if provided', () => {
    render(<Input id="custom-id" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('passes through additional props', () => {
    render(
      <Input
        data-testid="custom-input"
        disabled
      />
    );
    
    const input = screen.getByTestId('custom-input');
    expect(input).toBeDisabled();
  });
});
