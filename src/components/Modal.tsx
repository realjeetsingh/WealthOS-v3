import React from 'react';
import ModalShell from './ModalShell';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string; // Standardized string input
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  // Convert Tailwind max-w-X classes to ModalShell enum if possible, or use 'full'
  let shellMaxWidth: any = 'md';
  if (maxWidth.includes('max-w-sm')) shellMaxWidth = 'sm';
  if (maxWidth.includes('max-w-md')) shellMaxWidth = 'md';
  if (maxWidth.includes('max-w-lg')) shellMaxWidth = 'lg';
  if (maxWidth.includes('max-w-xl')) shellMaxWidth = 'xl';
  if (maxWidth.includes('max-w-2xl')) shellMaxWidth = '2xl';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth={shellMaxWidth}
    >
      {children}
    </ModalShell>
  );
};

export default Modal;
