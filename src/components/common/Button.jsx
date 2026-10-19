import React from 'react';

/**
 * Universal Button Primitive
 * @param {Object} props
 * @param {'primary'|'secondary'|'danger'|'success'|'outline'|'ghost'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {React.ReactNode} [props.icon]
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.className='']
 * @param {React.CSSProperties} [props.style]
 * @param {Function} [props.onClick]
 * @param {React.ReactNode} props.children
 */
export const Button = ({
    variant = 'primary',
    size = 'md',
    icon,
    loading = false,
    disabled = false,
    className = '',
    style = {},
    onClick,
    children,
    ...rest
}) => {
    let btnClass = 'btn ';
    if (variant === 'primary') btnClass += 'btn-primary ';
    else if (variant === 'secondary') btnClass += 'btn-secondary ';
    else if (variant === 'danger') btnClass += 'btn-danger ';
    else if (variant === 'success') btnClass += 'btn-success ';
    else if (variant === 'warning') btnClass += 'btn-warning ';
    else if (variant === 'outline') btnClass += 'btn-outline ';
    else if (variant === 'ghost') btnClass += 'btn-ghost ';

    const sizeStyles = {
        sm: { padding: '6px 12px', fontSize: '12px', borderRadius: '8px' },
        md: { padding: '10px 18px', fontSize: '13.5px', borderRadius: '10px' },
        lg: { padding: '14px 24px', fontSize: '15px', borderRadius: '12px' }
    };

    const combinedStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 600,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.65 : 1,
        transition: 'all 0.15s ease',
        ...sizeStyles[size],
        ...style
    };

    return (
        <button
            className={`${btnClass} ${className}`.trim()}
            style={combinedStyle}
            disabled={disabled || loading}
            onClick={onClick}
            {...rest}
        >
            {loading ? (
                <span className="spinner" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} />
            ) : icon}
            {children}
        </button>
    );
};

export default Button;
