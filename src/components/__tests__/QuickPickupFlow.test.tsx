import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickPickupModal from '../QuickPickupModal';

const mockUser = {
  _id: 'user123',
  name: 'John Doe',
  phone: '1234567890',
  email: 'john@example.com'
};

const mockOnClose = jest.fn();

beforeEach(() => {
  mockOnClose.mockClear();
});

describe('QuickPickupModal', () => {
  it('renders correctly when open', () => {
    render(
      <QuickPickupModal
        isOpen={true}
        onClose={mockOnClose}
        currentUser={mockUser}
      />
    );

    expect(screen.getByText('Quick Pickup')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows login message when no user', () => {
    render(
      <QuickPickupModal
        isOpen={true}
        onClose={mockOnClose}
        currentUser={null}
      />
    );

    expect(screen.getByText('Login Required')).toBeInTheDocument();
    expect(screen.getByText('Please log in to use the Quick Pickup feature')).toBeInTheDocument();
  });

  it('renders form fields correctly', () => {
    render(
      <QuickPickupModal
        isOpen={true}
        onClose={mockOnClose}
        currentUser={mockUser}
      />
    );

    expect(screen.getByLabelText(/pickup date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pickup time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pickup address/i)).toBeInTheDocument();
    expect(screen.getByText('Confirm Quick Pickup')).toBeInTheDocument();
  });

  it('handles form submission', () => {
    render(
      <QuickPickupModal
        isOpen={true}
        onClose={mockOnClose}
        currentUser={mockUser}
      />
    );

    const submitButton = screen.getByText('Confirm Quick Pickup');
    fireEvent.click(submitButton);

    // Add specific assertions based on your implementation
  });
});

// Test component to verify the flow works
export const QuickPickupFlowTest = () => {
  const [user, setUser] = React.useState(null);
  const [showModal, setShowModal] = React.useState(false);

  return (
    <div className="p-4">
      <h2>Quick Pickup Flow Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={() => setUser(mockUser)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Login
        </button>
        
        <button
          onClick={() => setUser(null)}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Quick Pickup
        </button>
      </div>

      <QuickPickupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentUser={user}
      />
    </div>
  );
};
