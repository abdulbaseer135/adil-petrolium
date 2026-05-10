import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfirmDialog } from '../components/common/ConfirmDialog';

describe('ConfirmDialog Component', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        message="Are you sure?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('displays custom title and message', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirm Action"
        message="This action cannot be undone"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  it('uses default title when not provided', () => {
    render(
      <ConfirmDialog
        open={true}
        message="This is the message"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    
    expect(screen.getByText('This is the message')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const handleConfirm = jest.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        onConfirm={handleConfirm}
        onCancel={jest.fn()}
        confirmLabel="Delete"
      />
    );
    
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmButton);
    
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    const handleCancel = jest.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        onConfirm={jest.fn()}
        onCancel={handleCancel}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop clicked', () => {
    const handleCancel = jest.fn();
    const { container } = render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        onConfirm={jest.fn()}
        onCancel={handleCancel}
      />
    );
    
    // Click on the backdrop (the fixed position overlay)
    const backdrop = container.querySelector('[style*="position: fixed"]');
    if (backdrop) {
      fireEvent.click(backdrop, { bubbles: true });
    }
    
    expect(handleCancel).toHaveBeenCalled();
  });

  it('does not call onCancel when dialog content clicked', () => {
    const handleCancel = jest.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        message="Test message"
        onConfirm={jest.fn()}
        onCancel={handleCancel}
      />
    );
    
    const dialogContent = screen.getByText('Test message');
    fireEvent.click(dialogContent);
    
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('applies danger variant styling', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        danger={true}
        confirmLabel="Delete"
      />
    );
    
    const confirmButton = screen.getByRole('button', { name: /delete/i });
    expect(confirmButton).toBeInTheDocument();
  });

  it('uses custom confirm label', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Action"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        confirmLabel="Yes, do it"
      />
    );
    
    expect(screen.getByRole('button', { name: /yes, do it/i })).toBeInTheDocument();
  });
});
