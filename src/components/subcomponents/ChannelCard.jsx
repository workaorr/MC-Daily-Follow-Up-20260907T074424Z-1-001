import React from 'react';
import { useApp } from '../../context/AppContext';
import { getChannelIcon } from '../../constants/channels';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { Clock, User, Trash2 } from 'lucide-react';

export const ChannelCard = ({ channel, index, details, onDelete }) => {
    const { lang } = useApp();
    const isDefault = details?.isDefault;
    const custCount = details?.custCount || 0;
    const createdAtText = details?.createdAtText || '-';
    const createdByText = details?.createdByText || '-';

    return (
        <tr>
            <td className="mc-channel-num" style={{ textAlign: 'center', padding: '10px 8px' }}>
                {index + 1}
            </td>
            <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{getChannelIcon(channel)}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="mc-channel-name" style={{ fontWeight: 600 }}>
                            {formatChannelDisplayName(channel, lang)}
                        </span>
                        {lang === 'EN' && (channel === 'ค้นหาหน้า google' || channel === 'เพื่อนแนะนำ' || channel === 'เซียน') && (
                            <span className="mc-channel-subtext" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                ({channel})
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                {isDefault ? (
                    <span className="mc-badge-default" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700, padding: '3.5px 10px', borderRadius: '14px', lineHeight: 1.3 }}>
                        ⭐ {lang === 'TH' ? 'ช่องทางหลัก' : 'Default'}
                    </span>
                ) : (
                    <span className="mc-badge-custom" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: 700, padding: '3.5px 10px', borderRadius: '14px', lineHeight: 1.3 }}>
                        🏷️ {lang === 'TH' ? 'ช่องทางเพิ่มเติม' : 'Custom'}
                    </span>
                )}
            </td>
            <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                <span
                    className={custCount > 0 ? "mc-badge-leads-active" : "mc-badge-leads-zero"}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, padding: '3.5px 10px', borderRadius: '14px', lineHeight: 1.3 }}
                    title={lang === 'TH' ? `มีลูกค้าสมัครผ่านช่องทางนี้ ${custCount} คน` : `${custCount} customers from this channel`}
                >
                    👥 {custCount} {lang === 'TH' ? 'คน' : 'leads'}
                </span>
            </td>
            <td style={{ padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{createdAtText}</span>
                </div>
            </td>
            <td style={{ padding: '10px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{createdByText}</span>
                </div>
            </td>
            <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                {isDefault ? (
                    <span className="mc-channel-locked" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, padding: '3.5px 10px', borderRadius: '14px', lineHeight: 1.3 }} title={lang === 'TH' ? 'ช่องทางหลักของระบบ ไม่สามารถลบได้' : 'System default channel cannot be deleted'}>
                        🔒 {lang === 'TH' ? 'ล็อก' : 'Locked'}
                    </span>
                ) : (
                    <button
                        type="button"
                        onClick={() => onDelete(channel)}
                        className="mc-channel-del-btn btn-danger"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3.5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', lineHeight: 1.3, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)' }}
                        title={lang === 'TH' ? `ลบช่องทาง "${channel}"` : `Delete channel "${channel}"`}
                    >
                        <Trash2 size={12} />
                        <span>{lang === 'TH' ? 'ลบ' : 'Del'}</span>
                    </button>
                )}
            </td>
        </tr>
    );
};
