import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * Universal Search Input Primitive
 * @param {Object} props
 * @param {string} props.value
 * @param {Function} props.onChange
 * @param {string} [props.placeholder='ค้นหา...']
 * @param {string} [props.width='240px']
 * @param {React.CSSProperties} [props.style]
 */
export const SearchInput = ({
    value = '',
    onChange,
    placeholder = 'ค้นหา...',
    width = '240px',
    style = {}
}) => {
    return (
        <div style={{ position: 'relative', width, ...style }}>
            <Search 
                size={14} 
                style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)',
                    pointerEvents: 'none'
                }} 
            />
            <input
                type="text"
                className="search-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%',
                    padding: '8px 32px 8px 34px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                }}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
};

export default SearchInput;
