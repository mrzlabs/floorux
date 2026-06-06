'use client';
import { Icon } from './Icon';

interface ModalProps {
  title: React.ReactNode;
  icon?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export function Modal({ title, icon, onClose, children, footer, wide }: ModalProps) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className={'modal' + (wide ? ' wide' : '')} onClick={e => e.stopPropagation()}>
        <div className="modal-h">
          {icon && <span style={{ color: 'var(--accent)' }}><Icon name={icon} /></span>}
          <h3>{title}</h3>
          <button className="x" onClick={onClose}><Icon name="close" s={18} /></button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}
