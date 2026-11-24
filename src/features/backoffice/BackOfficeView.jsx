import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { StaffRow } from './StaffRow';
import { ChannelCard } from './ChannelCard';
import { formatKeyedDateTime } from '../../utils/dateFormatters';
import { formatChannelDisplayName } from '../../utils/customerFormatters';
import { hashPasscode } from '../../utils/auth';
import { pushAgentToCloud, pushCustomerToCloud } from '../../services/supabase';
import { exportCustomersToCSV, exportCustomersToExcel } from '../../utils/exportCsv';
import { 
  ShieldAlert, 
  ShieldCheck, 
  LayoutGrid, 
  Users, 
  Tag, 
  Server, 
  Database, 
  Trash2, 
  Plus, 
  Clock, 
  User, 
  DownloadCloud, 
  UploadCloud, 
  CheckCircle, 
  Activity, 
  Search, 
  RotateCcw, 
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Download
} from 'lucide-react';

export default function BackOfficeView() {
  const {
    agents,
    setAgents,
    customers,
    setCustomers,
    sourceChannels,
    setSourceChannels,
    sourceChannelsMeta,
    setSourceChannelsMeta,
    activeAgent,
    activeAgentName,
    isSupervisor,
    lang,
    theme,
    lastKeepAliveTime,
    setSelectedCustForModal,
    setArchiveAgentModalData,
    setViewMode,
    supabaseClient,
    writeLog
  } = useApp();

  const [backOfficeSubTab, setBackOfficeSubTab] = useState('all'); // 'all', 'staff', 'channels', 'customers', 'backup'
  const [editingAgentId, setEditingAgentId] = useState(null);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffLoginUsername, setNewStaffLoginUsername] = useState('');
  const [newStaffPasscode, setNewStaffPasscode] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('AGENT');
  const [showNewStaffForm, setShowNewStaffForm] = useState(false);

  // New channel state
  const [newChannelInput, setNewChannelInput] = useState('');

  // Customer DB filters
  const [boSearchQuery, setBoSearchQuery] = useState('');
  const [boAgentFilter, setBoAgentFilter] = useState('ทั้งหมด');
  const [boChannelFilter, setBoChannelFilter] = useState('ทั้งหมด');
  const [boDepositFilter, setBoDepositFilter] = useState('ทั้งหมด');
  const [boIncompleteFilter, setBoIncompleteFilter] = useState('ทั้งหมด'); // 'ทั้งหมด', 'ANY_INCOMPLETE', 'NO_PHONE', 'NO_LINE', 'NO_USER', 'NO_OWNER'

  // Permission check
  const canBackOffice = isSupervisor || 
                        activeAgent?.username === 'ROOT_ADMIN' || 
                        activeAgent?.permissions?.canBackOffice;

  // Active agents (non-archived)
  const activeStaffList = useMemo(() => {
    return agents.filter(a => !a.isArchived);
  }, [agents]);

  const archivedStaffCount = useMemo(() => {
    return agents.filter(a => a.isArchived).length;
  }, [agents]);

  // Non-deleted customers
  const nonDeletedCustomers = useMemo(() => {
    return customers.filter(c => !c.deletedAt);
  }, [customers]);

  // Helper checks for incomplete customer data
  const isCustMissingPhone = (c) => !c.phone || !String(c.phone).trim() || c.phone === '-';
  const isCustMissingLine = (c) => !c.lineOA || !String(c.lineOA).trim() || c.lineOA === '-';
  const isCustMissingUser = (c) => !c.username || !String(c.username).trim() || c.username === '-' || c.username === 'unregistered';
  const isCustMissingOwner = (c) => !c.createdBy || !String(c.createdBy).trim() || c.createdBy === '-' || c.createdBy === 'ระบบกลาง';
  const isCustAnyIncomplete = (c) => isCustMissingPhone(c) || isCustMissingLine(c) || isCustMissingUser(c);

  // Stats for incomplete data badges
  const incompleteStats = useMemo(() => {
    let countAny = 0;
    let countPhone = 0;
    let countLine = 0;
    let countUser = 0;
    let countOwner = 0;

    nonDeletedCustomers.forEach(c => {
      const missingPhone = isCustMissingPhone(c);
      const missingLine = isCustMissingLine(c);
      const missingUser = isCustMissingUser(c);
      const missingOwner = isCustMissingOwner(c);

      if (missingPhone) countPhone++;
      if (missingLine) countLine++;
      if (missingUser) countUser++;
      if (missingOwner) countOwner++;
      if (missingPhone || missingLine || missingUser) countAny++;
    });

    return { countAny, countPhone, countLine, countUser, countOwner };
  }, [nonDeletedCustomers]);

  // Filtered customers for Database Control Center
  const filteredBoCustomers = useMemo(() => {
    return nonDeletedCustomers.filter(c => {
      if (boAgentFilter !== 'ทั้งหมด' && c.createdBy !== boAgentFilter) return false;
      if (boChannelFilter !== 'ทั้งหมด' && (c.sourceChannel || '').toLowerCase() !== boChannelFilter.toLowerCase()) return false;
      if (boDepositFilter === 'DEPOSITED' && !c.hasDeposited) return false;
      if (boDepositFilter === 'NOT_DEPOSITED' && c.hasDeposited) return false;

      // Incomplete data filters
      if (boIncompleteFilter === 'ANY_INCOMPLETE' && !isCustAnyIncomplete(c)) return false;
      if (boIncompleteFilter === 'NO_PHONE' && !isCustMissingPhone(c)) return false;
      if (boIncompleteFilter === 'NO_LINE' && !isCustMissingLine(c)) return false;
      if (boIncompleteFilter === 'NO_USER' && !isCustMissingUser(c)) return false;
      if (boIncompleteFilter === 'NO_OWNER' && !isCustMissingOwner(c)) return false;

      if (boSearchQuery.trim()) {
        const q = boSearchQuery.trim().toLowerCase();
        const matchName = (c.fullName || '').toLowerCase().includes(q);
        const matchUser = (c.username || '').toLowerCase().includes(q);
        const matchPhone = (c.phone || '').toLowerCase().includes(q);
        const matchLine = (c.lineOA || '').toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchPhone && !matchLine) return false;
      }

      return true;
    });
  }, [nonDeletedCustomers, boAgentFilter, boChannelFilter, boDepositFilter, boIncompleteFilter, boSearchQuery]);

  const isBoFilterActive = boSearchQuery || boAgentFilter !== 'ทั้งหมด' || boChannelFilter !== 'ทั้งหมด' || boDepositFilter !== 'ทั้งหมด' || boIncompleteFilter !== 'ทั้งหมด';

  // Customer DB Sort State
  const [boSortField, setBoSortField] = useState('createdAt'); // 'fullName', 'totalDeposit', 'createdAt', 'sourceChannel', 'createdBy'
  const [boSortDirection, setBoSortDirection] = useState('desc'); // 'asc' or 'desc'

  const handleBoSort = (field) => {
    if (boSortField === field) {
      setBoSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setBoSortField(field);
      if (field === 'totalDeposit' || field === 'createdAt') {
        setBoSortDirection('desc');
      } else {
        setBoSortDirection('asc');
      }
    }
    setBoCurrentPage(1);
  };

  const handleResetBoFilters = () => {
    setBoSearchQuery('');
    setBoAgentFilter('ทั้งหมด');
    setBoChannelFilter('ทั้งหมด');
    setBoDepositFilter('ทั้งหมด');
    setBoIncompleteFilter('ทั้งหมด');
    setBoSortField('createdAt');
    setBoSortDirection('desc');
    setBoCurrentPage(1);
    setSelectedBoCustIds([]);
  };

  // Sorted & Filtered customers for Database Control Center
  const sortedAndFilteredBoCustomers = useMemo(() => {
    const list = [...filteredBoCustomers];
    list.sort((a, b) => {
      let valA, valB;
      if (boSortField === 'totalDeposit') {
        valA = Number(a.totalDeposit) || 0;
        valB = Number(b.totalDeposit) || 0;
        return boSortDirection === 'asc' ? valA - valB : valB - valA;
      }
      if (boSortField === 'createdAt') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0);
        valB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0);
        return boSortDirection === 'asc' ? valA - valB : valB - valA;
      }
      if (boSortField === 'fullName') {
        valA = (a.fullName || a.username || '').toLowerCase();
        valB = (b.fullName || b.username || '').toLowerCase();
        return boSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
      }
      if (boSortField === 'sourceChannel') {
        valA = (a.sourceChannel || '').toLowerCase();
        valB = (b.sourceChannel || '').toLowerCase();
        return boSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
      }
      if (boSortField === 'createdBy') {
        valA = (a.createdBy || '').toLowerCase();
        valB = (b.createdBy || '').toLowerCase();
        return boSortDirection === 'asc' ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
      }
      return 0;
    });
    return list;
  }, [filteredBoCustomers, boSortField, boSortDirection]);

  // Customer DB Pagination State
  const [boPageSize, setBoPageSize] = useState(50); // 25, 50, 100, 'all'
  const [boCurrentPage, setBoCurrentPage] = useState(1);

  // Reset page to 1 whenever filters or page size change
  useEffect(() => {
    setBoCurrentPage(1);
  }, [boSearchQuery, boAgentFilter, boChannelFilter, boDepositFilter, boIncompleteFilter, boPageSize]);

  const totalBoRecords = sortedAndFilteredBoCustomers.length;
  const effectivePageSize = boPageSize === 'all' ? (totalBoRecords || 1) : Number(boPageSize);
  const totalBoPages = boPageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalBoRecords / effectivePageSize));
  const safeBoCurrentPage = Math.min(Math.max(1, boCurrentPage), totalBoPages);

  const paginatedBoCustomers = useMemo(() => {
    if (boPageSize === 'all') return sortedAndFilteredBoCustomers;
    const startIdx = (safeBoCurrentPage - 1) * effectivePageSize;
    return sortedAndFilteredBoCustomers.slice(startIdx, startIdx + effectivePageSize);
  }, [sortedAndFilteredBoCustomers, safeBoCurrentPage, effectivePageSize, boPageSize]);

  const startRecordNum = totalBoRecords === 0 ? 0 : (safeBoCurrentPage - 1) * effectivePageSize + 1;
  const endRecordNum = boPageSize === 'all' ? totalBoRecords : Math.min(safeBoCurrentPage * effectivePageSize, totalBoRecords);

  const formatCustCreatedDate = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '-';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const yr = String(d.getFullYear()).slice(2);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${yr} ${hh}:${mm}`;
    } catch (e) {
      return '-';
    }
  };

  const renderSortableHeader = (field, label, align = 'left') => {
    const isActive = boSortField === field;
    return (
      <div
        onClick={() => handleBoSort(field)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : (align === 'center' ? 'center' : 'flex-start'),
          gap: '5px',
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? '#7c3aed' : 'inherit',
          fontWeight: isActive ? 800 : 700,
          transition: 'all 0.15s'
        }}
        title={lang === 'TH' ? `คลิกเพื่อเรียงลำดับตาม ${label}` : `Click to sort by ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          boSortDirection === 'asc' ? (
            <ArrowUp style={{ width: '13px', height: '13px', color: '#7c3aed' }} />
          ) : (
            <ArrowDown style={{ width: '13px', height: '13px', color: '#7c3aed' }} />
          )
        ) : (
          <ArrowUpDown style={{ width: '11px', height: '11px', opacity: 0.35 }} />
        )}
      </div>
    );
  };

  const getPaginationRange = () => {
    if (totalBoPages <= 7) {
      return Array.from({ length: totalBoPages }, (_, i) => i + 1);
    }
    const range = [];
    const leftSide = Math.max(2, safeBoCurrentPage - 1);
    const rightSide = Math.min(totalBoPages - 1, safeBoCurrentPage + 1);

    range.push(1);
    if (leftSide > 2) range.push('...');
    for (let i = leftSide; i <= rightSide; i++) {
      range.push(i);
    }
    if (rightSide < totalBoPages - 1) range.push('...');
    range.push(totalBoPages);
    return range;
  };

  // Multi-select state for Customer DB
  const [selectedBoCustIds, setSelectedBoCustIds] = useState([]);
  const [isBulkChannelModalOpen, setIsBulkChannelModalOpen] = useState(false);
  const [bulkTargetChannel, setBulkTargetChannel] = useState('');

  // Checkbox selection helpers
  const isAllCurrentPageSelected = paginatedBoCustomers.length > 0 && paginatedBoCustomers.every(c => selectedBoCustIds.includes(c.id));
  const isSomeCurrentPageSelected = paginatedBoCustomers.some(c => selectedBoCustIds.includes(c.id)) && !isAllCurrentPageSelected;

  const handleToggleSelectAllInPage = () => {
    if (isAllCurrentPageSelected) {
      const pageCustIds = new Set(paginatedBoCustomers.map(c => c.id));
      setSelectedBoCustIds(prev => prev.filter(id => !pageCustIds.has(id)));
    } else {
      const newIds = new Set([...selectedBoCustIds, ...paginatedBoCustomers.map(c => c.id)]);
      setSelectedBoCustIds(Array.from(newIds));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedBoCustIds(sortedAndFilteredBoCustomers.map(c => c.id));
  };

  const handleClearSelection = () => {
    setSelectedBoCustIds([]);
  };

  const handleToggleSelectCustomer = (custId) => {
    setSelectedBoCustIds(prev =>
      prev.includes(custId) ? prev.filter(id => id !== custId) : [...prev, custId]
    );
  };

  // Export handlers (Supports both Excel .xlsx and CSV)
  const handleExportFiltered = (format = 'excel') => {
    const listToExport = selectedBoCustIds.length > 0
      ? sortedAndFilteredBoCustomers.filter(c => selectedBoCustIds.includes(c.id))
      : sortedAndFilteredBoCustomers;

    if (listToExport.length === 0) {
      alert(lang === 'TH' ? 'ไม่พบข้อมูลลูกค้าสำหรับส่งออก' : 'No customers to export');
      return;
    }

    const dateStr = new Date().toISOString().substring(0, 10);
    const suffix = selectedBoCustIds.length > 0 ? `Selected_${listToExport.length}` : `Filtered_${listToExport.length}`;
    const filename = `MC_Customers_${suffix}_${dateStr}`;

    if (format === 'excel') {
      exportCustomersToExcel(listToExport, `${filename}.xlsx`, lang);
      writeLog('EXPORT_EXCEL', `ส่งออกข้อมูลลูกค้า (${listToExport.length} คน) เป็นไฟล์ Excel (.xlsx)`, 'info', activeAgentName);
    } else {
      exportCustomersToCSV(listToExport, `${filename}.csv`, lang);
      writeLog('EXPORT_CSV', `ส่งออกข้อมูลลูกค้า (${listToExport.length} คน) เป็นไฟล์ CSV`, 'info', activeAgentName);
    }
  };

  // Bulk Soft Delete Handler (Move selected customers to Recycle Bin)
  const handleBulkDeleteCustomers = async () => {
    if (selectedBoCustIds.length === 0) return;
    const count = selectedBoCustIds.length;

    const confirmMsg = lang === 'TH'
      ? `⚠️ ยืนยันการย้ายลูกค้าที่เลือก (${count} คน) ไปยังถังขยะระบบ (Recycle Bin)?\n\n(คุณสามารถกู้คืนข้อมูลกลับมาได้ตลอดเวลาจากเมนู "ถังขยะระบบ")`
      : `Move selected ${count} customers to Recycle Bin?`;

    if (!window.confirm(confirmMsg)) return;

    const nowIso = new Date().toISOString();
    const targetIdSet = new Set(selectedBoCustIds);

    const updated = customers.map(c => {
      if (!targetIdSet.has(c.id)) return c;
      const softDeleted = {
        ...c,
        deletedAt: nowIso,
        deletedBy: activeAgentName || 'Supervisor',
        isDeleted: true
      };
      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, softDeleted);
      }
      return softDeleted;
    });

    setCustomers(updated);
    localStorage.setItem('mc_customers', JSON.stringify(updated));
    setSelectedBoCustIds([]);

    writeLog(
      'CUSTOMER_DELETE', 
      `🗑️ หัวหน้า [${activeAgentName || 'Supervisor'}] ได้ย้ายลูกค้าแบบกลุ่ม (${count} คน) ไปยังถังขยะระบบ`, 
      'warning', 
      activeAgentName || 'Supervisor'
    );

    alert(lang === 'TH' 
      ? `✅ ย้ายลูกค้า ${count} คนไปยังถังขยะระบบสำเร็จเรียบร้อยแล้ว!` 
      : `✅ Successfully moved ${count} customers to Recycle Bin!`
    );
  };

  // Bulk Channel Change Handler
  const handleExecuteBulkChangeChannel = async () => {
    if (!bulkTargetChannel || selectedBoCustIds.length === 0) return;
    const count = selectedBoCustIds.length;
    const targetIdsSet = new Set(selectedBoCustIds);
    const nowIso = new Date().toISOString();

    const updated = customers.map(c => {
      if (!targetIdsSet.has(c.id)) return c;
      const updatedCust = {
        ...c,
        sourceChannel: bulkTargetChannel,
        updatedBy: activeAgentName || 'Supervisor',
        updatedAt: nowIso
      };
      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, updatedCust);
      }
      return updatedCust;
    });

    setCustomers(updated);
    localStorage.setItem('mc_customers', JSON.stringify(updated));
    setIsBulkChannelModalOpen(false);
    setSelectedBoCustIds([]);

    writeLog(
      'CUSTOMER_UPDATE',
      `🏷️ หัวหน้า [${activeAgentName || 'Supervisor'}] ได้เปลี่ยนช่องทางการตลาดแบบกลุ่ม (${count} คน) เป็น [${formatChannelDisplayName(bulkTargetChannel, lang)}]`,
      'info',
      activeAgentName || 'Supervisor'
    );

    alert(lang === 'TH' 
      ? `✅ เปลี่ยนช่องทางการตลาดเป็น "${formatChannelDisplayName(bulkTargetChannel, lang)}" ให้กับลูกค้า ${count} คน สำเร็จเรียบร้อยแล้ว!` 
      : `✅ Successfully updated channel to "${formatChannelDisplayName(bulkTargetChannel, lang)}" for ${count} customers!`
    );
  };

  // Staff Management Handlers
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    const nameVal = newStaffName.trim();
    const usernameVal = newStaffLoginUsername.trim().toLowerCase();
    const passVal = newStaffPasscode.trim();

    if (!nameVal || !usernameVal || !passVal) {
      alert(lang === 'TH' ? '⚠️ กรุณากรอกข้อมูลพนักงานให้ครบถ้วน' : 'Please fill all fields');
      return;
    }

    if (agents.some(a => a.loginUsername && a.loginUsername.toLowerCase() === usernameVal)) {
      alert(lang === 'TH' ? `⚠️ Login Username "${usernameVal}" ซ้ำกับในระบบ` : `Username "${usernameVal}" already exists`);
      return;
    }

    const hashed = await hashPasscode(passVal);
    const newAgent = {
      id: Date.now(),
      name: nameVal,
      loginUsername: usernameVal,
      passcode: hashed,
      role: newStaffRole,
      isActive: true,
      permissions: {
        canDashboard: true,
        canFollowUp: true,
        canNewCustomer: true,
        canAudit: newStaffRole === 'SUPERVISOR',
        canBackOffice: newStaffRole === 'SUPERVISOR'
      }
    };

    const updated = [...agents, newAgent];
    setAgents(updated);

    if (supabaseClient) {
      pushAgentToCloud(supabaseClient, newAgent);
    }

    writeLog('STAFF_ADD', `เพิ่มพนักงานใหม่ [${nameVal}] (${newStaffRole})`, 'success', activeAgentName);
    setNewStaffName('');
    setNewStaffLoginUsername('');
    setNewStaffPasscode('');
    setShowNewStaffForm(false);
  };

  const handleSaveStaffEdit = (agentId, updatedData) => {
    const updated = agents.map(a => {
      if (a.id !== agentId) return a;
      const merged = { ...a, ...updatedData };
      if (supabaseClient) {
        pushAgentToCloud(supabaseClient, merged);
      }
      return merged;
    });
    setAgents(updated);
    setEditingAgentId(null);
    writeLog('STAFF_UPDATE', `แก้ไขข้อมูลพนักงาน ID: ${agentId}`, 'info', activeAgentName);
  };

  const handleToggleActiveStaff = (agentId) => {
    const updated = agents.map(a => {
      if (a.id !== agentId) return a;
      const newActive = !a.isActive;
      const merged = { ...a, isActive: newActive };
      if (supabaseClient) {
        pushAgentToCloud(supabaseClient, merged);
      }
      return merged;
    });
    setAgents(updated);
    writeLog('STAFF_STATUS', `สลับสถานะพนักงาน ID: ${agentId}`, 'warning', activeAgentName);
  };

  const handleDeleteStaff = (agent) => {
    setArchiveAgentModalData(agent);
  };

  const handleUnlockStaff = async (agent) => {
    const newPass = window.prompt(
      lang === 'TH' 
        ? `👑 ปลดล็อกบัญชี [${agent.name}]\nกรุณากำหนดรหัสผ่านใหม่ (4-6 หลัก):` 
        : `👑 Unlock account [${agent.name}]\nEnter new passcode (4-6 digits):`,
      '1234'
    );
    if (!newPass || !newPass.trim()) return;

    const trimmedPass = newPass.trim();
    if (trimmedPass.length < 4 || trimmedPass.length > 6) {
      alert(lang === 'TH' ? 'รหัสผ่านต้องมีความยาว 4-6 หลัก' : 'Passcode must be 4-6 digits');
      return;
    }

    const hashed = await hashPasscode(trimmedPass);
    const updated = agents.map(a => {
      if (a.id !== agent.id) return a;
      const merged = {
        ...a,
        isLocked: false,
        lockedReason: null,
        lockedAt: null,
        isActive: true,
        passcode: hashed
      };
      if (supabaseClient) {
        pushAgentToCloud(supabaseClient, merged);
      }
      return merged;
    });

    setAgents(updated);
    localStorage.setItem('mc_agents', JSON.stringify(updated));
    writeLog('AUTH', `👑 หัวหน้า [${activeAgentName}] ได้ทำการปลดล็อกบัญชีและตั้งรหัสผ่านใหม่ให้ [${agent.name}] สำเร็จ`, 'success', activeAgentName);
    alert(lang === 'TH' 
      ? `✅ ปลดล็อกบัญชี [${agent.name}] สำเร็จแล้ว!\nรหัสผ่านใหม่คือ: "${trimmedPass}"\nพนักงานสามารถเข้าสู่ระบบด้วยรหัสนี้ได้ทันที` 
      : `✅ Account [${agent.name}] unlocked successfully!\nNew passcode is: "${trimmedPass}"`);
  };

  // Channels Management Handlers
  const handleAddChannel = () => {
    const val = newChannelInput.trim().toLowerCase();
    if (!val) return;
    if (sourceChannels.includes(val)) {
      alert(lang === 'TH' ? 'ช่องทางนี้มีอยู่แล้ว' : 'Channel already exists');
      return;
    }
    const updated = [...sourceChannels, val];
    setSourceChannels(updated);
    localStorage.setItem('mc_source_channels', JSON.stringify(updated));

    const meta = {
      ...(sourceChannelsMeta || {}),
      [val]: {
        createdAt: new Date().toISOString(),
        createdBy: activeAgentName || 'Admin'
      }
    };
    setSourceChannelsMeta(meta);
    localStorage.setItem('mc_source_channels_meta', JSON.stringify(meta));

    writeLog('CHANNEL_ADD', `เพิ่มช่องทางการตลาดใหม่ [${val}]`, 'info', activeAgentName);
    setNewChannelInput('');
  };

  const handleDeleteChannel = (channelName) => {
    if (!window.confirm(lang === 'TH' ? `ยืนยันการลบช่องทาง "${channelName}"?` : `Delete channel "${channelName}"?`)) return;
    const updated = sourceChannels.filter(c => c !== channelName);
    setSourceChannels(updated);
    localStorage.setItem('mc_source_channels', JSON.stringify(updated));
    writeLog('CHANNEL_DELETE', `ลบช่องทางการตลาด [${channelName}]`, 'warning', activeAgentName);
  };

  // Customer Delete Handler (Soft-delete to Recycle Bin)
  const handleDeleteCustomer = (customerId, username) => {
    if (!window.confirm(lang === 'TH' ? `ต้องการย้ายลูกค้า [${username || customerId}] ไปยังถังขยะหรือไม่?` : `Move customer [${username || customerId}] to Recycle Bin?`)) return;

    const nowIso = new Date().toISOString();
    const updated = customers.map(c => {
      if (c.id !== customerId) return c;
      const softDeleted = {
        ...c,
        deletedAt: nowIso,
        deletedBy: activeAgentName || 'Supervisor',
        isDeleted: true
      };
      if (supabaseClient) {
        pushCustomerToCloud(supabaseClient, softDeleted);
      }
      return softDeleted;
    });

    setCustomers(updated);
    writeLog('CUSTOMER_DELETE', `ย้ายลูกค้า [${username || customerId}] ไปยังถังขยะ`, 'warning', activeAgentName);
  };

  // Full System JSON Backup
  const handleFullSystemBackup = () => {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: activeAgentName || 'Supervisor',
      customers: customers,
      agents: agents,
      sourceChannels: sourceChannels,
      sourceChannelsMeta: sourceChannelsMeta
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MC_CRM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    writeLog('BACKUP_EXPORT', 'ดาวน์โหลดไฟล์สำรองข้อมูลระบบแบบสมบูรณ์ (Full JSON Backup)', 'info', activeAgentName);
  };

  // Full System JSON Restore
  const handleFullSystemRestore = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || (!parsed.customers && !parsed.agents)) {
          alert(lang === 'TH' ? '❌ โครงสร้างไฟล์สำรองไม่ถูกต้อง' : 'Invalid backup file structure');
          return;
        }

        if (!window.confirm(lang === 'TH' ? '⚠️ คำเตือน: การกู้คืนระบบจะแทนที่ข้อมูลเดิมทั้งหมด ยืนยันการดำเนินการ?' : 'Warning: Restore will overwrite existing system data. Proceed?')) return;

        if (Array.isArray(parsed.customers)) {
          setCustomers(parsed.customers);
          localStorage.setItem('mc_customers', JSON.stringify(parsed.customers));
        }
        if (Array.isArray(parsed.agents)) {
          setAgents(parsed.agents);
          localStorage.setItem('mc_agents', JSON.stringify(parsed.agents));
        }
        if (Array.isArray(parsed.sourceChannels)) {
          setSourceChannels(parsed.sourceChannels);
          localStorage.setItem('mc_source_channels', JSON.stringify(parsed.sourceChannels));
        }
        if (parsed.sourceChannelsMeta) {
          setSourceChannelsMeta(parsed.sourceChannelsMeta);
          localStorage.setItem('mc_source_channels_meta', JSON.stringify(parsed.sourceChannelsMeta));
        }

        alert(lang === 'TH' ? '✅ กู้คืนระบบสำเร็จสมบูรณ์!' : 'System restore successful!');
        writeLog('BACKUP_RESTORE', `กู้คืนระบบสำเร็จจากไฟล์ ${file.name}`, 'warning', activeAgentName);
      } catch (err) {
        alert(lang === 'TH' ? `❌ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}` : `Error reading file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  if (!canBackOffice) {
    return (
      <div 
        className="restricted-access-card" 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(244, 63, 94, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          textAlign: 'center',
          maxWidth: '560px',
          margin: '40px auto'
        }}
      >
        <div style={{
          padding: '16px',
          borderRadius: '20px',
          background: 'rgba(244, 63, 94, 0.12)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          marginBottom: '16px'
        }}>
          <ShieldAlert style={{ width: '42px', height: '42px' }} />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
          {lang === 'TH' ? '⛔ สิทธิ์การเข้าถึงพื้นที่สงวน (Access Restricted)' : '⛔ Access Restricted'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '24px' }}>
          {lang === 'TH' ? (
            <>บัญชีของคุณ [<strong>{activeAgentName}</strong>] มีระดับสิทธิ์เป็นพนักงาน (MC Agent) ยังไม่ได้รับอนุมัติสิทธิ์ในการเข้าถึงระบบจัดการหลังบ้าน หากต้องการเข้าใช้งาน กรุณาติดต่อหัวหน้า (Supervisor) เพื่อเปิดสิทธิ์การเข้าถึง "⚙️ จัดการหลังบ้าน & Audit Logs"</>
          ) : (
            <>Your account [<strong>{activeAgentName}</strong>] has MC Agent role and is not authorized to access Back Office. Please contact a Supervisor.</>
          )}
        </p>
        <button 
          className="btn btn-secondary"
          onClick={() => setViewMode('agent')}
          style={{ padding: '10px 20px', fontSize: '12px' }}
        >
          {lang === 'TH' ? 'กลับไปยังหน้าการติดตามลูกค้า (MC Agent)' : 'Back to Follow-Up Table (MC Agent)'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Banner & Sub-Tabs Controller */}
      <div id="tour-bo-panel" className="panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 20px',
        background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
        border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(168, 85, 247, 0.25)',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="bo-banner-icon" style={{ padding: '10px', borderRadius: '12px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <ShieldCheck style={{ width: '24px', height: '24px' }} />
            </div>
            <div>
              <h3 className="banner-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                {lang === 'TH' ? 'ระบบจัดการหลังบ้านและสิทธิ์การใช้งาน (Back Office)' : 'Back Office & System Audit Control'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {lang === 'TH' ? 'จัดการพนักงาน MC, กำหนดระดับสิทธิ์การเข้าถึงเมนู, ซิงค์คลาวด์ Supabase' : 'Manage MC Staff, Configure Roles & Permissions, Cloud Database Sync'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="bo-admin-badge" style={{ fontSize: '11.5px', fontWeight: 700, padding: '5px 12px', borderRadius: '20px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              {lang === 'TH' ? `👑 ผู้ดูแลระบบ: ${activeAgentName}` : `👑 Administrator: ${activeAgentName}`}
            </span>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          borderTop: theme === 'light' ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)',
          paddingTop: '12px',
          width: '100%'
        }}>
          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('all')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'all' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <LayoutGrid style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '📑 ทั้งหมด' : '📑 All'}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('staff')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'staff' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Users style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `👥 พนักงาน & สิทธิ์ (${activeStaffList.length})` : `👥 Staff & Roles (${activeStaffList.length})`}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'channels' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('channels')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'channels' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Tag style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? `🏷️ ช่องทางการตลาด (${sourceChannels.length})` : `🏷️ Channels (${sourceChannels.length})`}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'customers' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('customers')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'customers' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Server style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '🗄️ จัดการฐานข้อมูลลูกค้ารวม' : '🗄️ Customer DB'}</span>
          </button>

          <button
            type="button"
            className={`btn ${backOfficeSubTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setBackOfficeSubTab('backup')}
            style={{ flex: '1 1 auto', padding: '7px 12px', fontSize: '12px', fontWeight: backOfficeSubTab === 'backup' ? 700 : 500, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Database style={{ width: '13px', height: '13px' }} />
            <span>{lang === 'TH' ? '💾 สำรองข้อมูลฉุกเฉิน' : '💾 Emergency Backup'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Staff & Role Manager */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'staff') && (
        <div className="panel">
          <h3 className="panel-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users /> {lang === 'TH' ? 'จัดการรายชื่อพนักงาน MC และสิทธิ์การใช้งาน (MC Users & Role Manager)' : 'MC Users & Role Manager'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setViewMode('recycle-bin')}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  background: archivedStaffCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: archivedStaffCount > 0 ? '#ef4444' : 'var(--text-muted)',
                  border: archivedStaffCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Trash2 style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? `ถังขยะพนักงาน (${archivedStaffCount})` : `Trash (${archivedStaffCount})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewStaffForm(!showNewStaffForm)}
                className="btn btn-primary"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? 'เพิ่มพนักงานใหม่' : 'Add Staff'}</span>
              </button>
            </div>
          </h3>

          {/* New Staff Form */}
          {showNewStaffForm && (
            <form onSubmit={handleCreateStaff} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', padding: '12px', background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', borderRadius: '10px', marginBottom: '14px', border: '1px dashed var(--primary)' }}>
              <input
                type="text"
                placeholder={lang === 'TH' ? 'ชื่อพนักงาน...' : 'Staff name...'}
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '130px' }}
                required
              />
              <input
                type="text"
                placeholder={lang === 'TH' ? 'Login Username...' : 'Login Username...'}
                value={newStaffLoginUsername}
                onChange={(e) => setNewStaffLoginUsername(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '130px' }}
                required
              />
              <input
                type="password"
                placeholder={lang === 'TH' ? 'Passcode 4-6 หลัก...' : 'Passcode...'}
                value={newStaffPasscode}
                onChange={(e) => setNewStaffPasscode(e.target.value)}
                className="select-input"
                style={{ flex: 1, minWidth: '120px' }}
                required
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="select-input"
                style={{ minWidth: '120px' }}
              >
                <option value="AGENT">MC Agent</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>
              <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                {lang === 'TH' ? 'บันทึก' : 'Save'}
              </button>
            </form>
          )}

          {/* Staff Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>{lang === 'TH' ? 'ชื่อพนักงาน / บัญชี' : 'Staff / Account'}</th>
                  <th>{lang === 'TH' ? 'บทบาท (Role)' : 'Role'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สถานะ' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สิทธิ์การเข้าถึงเมนู' : 'Permissions'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'เข้าสู่ระบบล่าสุด' : 'Last Login'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {activeStaffList.map(agent => (
                  <StaffRow
                    key={agent.id}
                    agent={agent}
                    isEditing={editingAgentId === agent.id}
                    onStartEdit={() => setEditingAgentId(agent.id)}
                    onCancelEdit={() => setEditingAgentId(null)}
                    onSaveEdit={(data) => handleSaveStaffEdit(agent.id, data)}
                    onToggleActive={() => handleToggleActiveStaff(agent.id)}
                    onDelete={() => handleDeleteStaff(agent)}
                    onUnlock={() => handleUnlockStaff(agent)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2: Marketing Channels */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'channels') && (
        <div className="panel">
          <h3 className="panel-title" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
            <Tag /> {lang === 'TH' ? 'จัดการช่องทางการตลาด (Marketing Channels)' : 'Marketing Channels Manager'}
          </h3>

          <div style={{ display: 'flex', gap: '8px', margin: '14px 0', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={newChannelInput}
              onChange={(e) => setNewChannelInput(e.target.value)}
              placeholder={lang === 'TH' ? 'พิมพ์ชื่อช่องทางใหม่ เช่น instagram, telegram, tiktok...' : 'Enter new channel e.g. instagram, telegram...'}
              className="select-input"
              style={{ flex: '1 1 240px', padding: '8px 12px', fontSize: '12px' }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddChannel()}
            />
            <button
              type="button"
              onClick={handleAddChannel}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus style={{ width: '14px', height: '14px' }} />
              <span>{lang === 'TH' ? 'เพิ่มช่องทางใหม่' : 'Add Channel'}</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12.5px' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                  <th>{lang === 'TH' ? 'ชื่อช่องทางการตลาด' : 'Channel Name'}</th>
                  <th style={{ width: '145px', textAlign: 'center' }}>{lang === 'TH' ? 'ประเภท' : 'Type'}</th>
                  <th style={{ width: '135px', textAlign: 'center' }}>{lang === 'TH' ? 'ลูกค้าที่สมัคร' : 'Customers'}</th>
                  <th>{lang === 'TH' ? 'สร้างเมื่อ' : 'Created Date'}</th>
                  <th>{lang === 'TH' ? 'สร้างโดย' : 'Created By'}</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {sourceChannels.map((ch, idx) => (
                  <ChannelCard
                    key={ch}
                    channel={ch}
                    index={idx}
                    onDelete={handleDeleteChannel}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Central Database Control Center */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'customers') && (
        <div className="panel">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <h3 className="panel-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Server /> {lang === 'TH' ? 'จัดการฐานข้อมูลลูกค้ารวม (Central Database Control Center)' : 'Central Database Control Center'}
            </h3>
            {isBoFilterActive && (
              <button 
                onClick={handleResetBoFilters}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                <RotateCcw style={{ width: '12px', height: '12px' }} />
                <span>{lang === 'TH' ? 'ล้างตัวกรองทั้งหมด' : 'Reset Filters'}</span>
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            margin: '12px 0 16px 0',
            padding: '12px',
            background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)',
            borderRadius: '10px'
          }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder={lang === 'TH' ? 'ค้นหาชื่อ, ยูส, เบอร์...' : 'Search customer...'}
                value={boSearchQuery}
                onChange={(e) => setBoSearchQuery(e.target.value)}
                className="select-input"
                style={{ width: '100%', paddingLeft: '30px', fontSize: '12px' }}
              />
            </div>

            <select
              value={boAgentFilter}
              onChange={(e) => setBoAgentFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'พนักงานทั้งหมด' : 'All Agents'}</option>
              {agents.map(a => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </select>

            <select
              value={boChannelFilter}
              onChange={(e) => setBoChannelFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'ทุกช่องทาง' : 'All Channels'}</option>
              {sourceChannels.map(ch => (
                <option key={ch} value={ch}>{formatChannelDisplayName(ch, lang)}</option>
              ))}
            </select>

            <select
              value={boDepositFilter}
              onChange={(e) => setBoDepositFilter(e.target.value)}
              className="select-input"
              style={{ fontSize: '12px' }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'ทุกสถานะฝาก' : 'All Deposit Status'}</option>
              <option value="DEPOSITED">{lang === 'TH' ? '🟢 ฝากแล้ว' : 'Deposited'}</option>
              <option value="NOT_DEPOSITED">{lang === 'TH' ? '🔴 ยังไม่ฝาก' : 'Pending Deposit'}</option>
            </select>

            <select
              value={boIncompleteFilter}
              onChange={(e) => setBoIncompleteFilter(e.target.value)}
              className="select-input"
              style={{
                fontSize: '12px',
                borderColor: boIncompleteFilter !== 'ทั้งหมด' ? '#f59e0b' : undefined,
                color: boIncompleteFilter !== 'ทั้งหมด' ? '#d97706' : undefined,
                fontWeight: boIncompleteFilter !== 'ทั้งหมด' ? 700 : 'normal'
              }}
            >
              <option value="ทั้งหมด">{lang === 'TH' ? 'ความสมบูรณ์: ทั้งหมด' : 'Data Integrity: All'}</option>
              <option value="ANY_INCOMPLETE">{lang === 'TH' ? `⚠️ ข้อมูลไม่สมบูรณ์ (${incompleteStats.countAny})` : `⚠️ Incomplete (${incompleteStats.countAny})`}</option>
              <option value="NO_PHONE">{lang === 'TH' ? `📞 ไม่มีเบอร์โทร (${incompleteStats.countPhone})` : `📞 Missing Phone (${incompleteStats.countPhone})`}</option>
              <option value="NO_LINE">{lang === 'TH' ? `💬 ไม่มี LINE OA (${incompleteStats.countLine})` : `💬 Missing LINE (${incompleteStats.countLine})`}</option>
              <option value="NO_USER">{lang === 'TH' ? `👤 ไม่มียูสเซอร์ (${incompleteStats.countUser})` : `👤 Missing Username (${incompleteStats.countUser})`}</option>
              <option value="NO_OWNER">{lang === 'TH' ? `👑 ไม่มีผู้ดูแล (${incompleteStats.countOwner})` : `👑 Missing Owner (${incompleteStats.countOwner})`}</option>
            </select>
          </div>

          {/* Quick Filter Badges for Incomplete Data */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            margin: '0 0 16px 0',
            padding: '8px 12px',
            borderRadius: '10px',
            background: theme === 'light' ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)',
            border: theme === 'light' ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.2)'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span>⚡</span>
              <span>{lang === 'TH' ? 'ตัวกรองด่วนข้อมูล:' : 'Quick Filters:'}</span>
            </span>

            <button
              type="button"
              onClick={() => setBoIncompleteFilter('ทั้งหมด')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: boIncompleteFilter === 'ทั้งหมด' ? 800 : 500,
                border: boIncompleteFilter === 'ทั้งหมด' ? 'none' : (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)'),
                background: boIncompleteFilter === 'ทั้งหมด' ? '#d97706' : (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                color: boIncompleteFilter === 'ทั้งหมด' ? '#ffffff' : 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {lang === 'TH' ? 'ทั้งหมด' : 'All'}
            </button>

            <button
              type="button"
              onClick={() => setBoIncompleteFilter('ANY_INCOMPLETE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: boIncompleteFilter === 'ANY_INCOMPLETE' ? 800 : 500,
                border: boIncompleteFilter === 'ANY_INCOMPLETE' ? 'none' : (theme === 'light' ? '1px solid #fde68a' : '1px solid rgba(245, 158, 11, 0.3)'),
                background: boIncompleteFilter === 'ANY_INCOMPLETE' ? '#f59e0b' : (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                color: boIncompleteFilter === 'ANY_INCOMPLETE' ? '#ffffff' : '#d97706',
                cursor: 'pointer',
                boxShadow: boIncompleteFilter === 'ANY_INCOMPLETE' ? '0 2px 6px rgba(245, 158, 11, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              ⚠️ {lang === 'TH' ? `ข้อมูลไม่สมบูรณ์ (${incompleteStats.countAny})` : `Incomplete (${incompleteStats.countAny})`}
            </button>

            <button
              type="button"
              onClick={() => setBoIncompleteFilter('NO_PHONE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: boIncompleteFilter === 'NO_PHONE' ? 800 : 500,
                border: boIncompleteFilter === 'NO_PHONE' ? 'none' : (theme === 'light' ? '1px solid #fecdd3' : '1px solid rgba(244, 63, 94, 0.3)'),
                background: boIncompleteFilter === 'NO_PHONE' ? '#f43f5e' : (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                color: boIncompleteFilter === 'NO_PHONE' ? '#ffffff' : (theme === 'light' ? '#e11d48' : '#fda4af'),
                cursor: 'pointer',
                boxShadow: boIncompleteFilter === 'NO_PHONE' ? '0 2px 6px rgba(244, 63, 94, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              📞 {lang === 'TH' ? `ไม่มีเบอร์โทร (${incompleteStats.countPhone})` : `No Phone (${incompleteStats.countPhone})`}
            </button>

            <button
              type="button"
              onClick={() => setBoIncompleteFilter('NO_LINE')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: boIncompleteFilter === 'NO_LINE' ? 800 : 500,
                border: boIncompleteFilter === 'NO_LINE' ? 'none' : (theme === 'light' ? '1px solid #a7f3d0' : '1px solid rgba(16, 185, 129, 0.3)'),
                background: boIncompleteFilter === 'NO_LINE' ? '#10b981' : (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                color: boIncompleteFilter === 'NO_LINE' ? '#ffffff' : (theme === 'light' ? '#059669' : '#6ee7b7'),
                cursor: 'pointer',
                boxShadow: boIncompleteFilter === 'NO_LINE' ? '0 2px 6px rgba(16, 185, 129, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              💬 {lang === 'TH' ? `ไม่มี LINE (${incompleteStats.countLine})` : `No LINE (${incompleteStats.countLine})`}
            </button>

            <button
              type="button"
              onClick={() => setBoIncompleteFilter('NO_USER')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: boIncompleteFilter === 'NO_USER' ? 800 : 500,
                border: boIncompleteFilter === 'NO_USER' ? 'none' : (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.12)'),
                background: boIncompleteFilter === 'NO_USER' ? '#64748b' : (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.05)'),
                color: boIncompleteFilter === 'NO_USER' ? '#ffffff' : 'inherit',
                cursor: 'pointer',
                boxShadow: boIncompleteFilter === 'NO_USER' ? '0 2px 6px rgba(100, 116, 139, 0.35)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              👤 {lang === 'TH' ? `ไม่มียูสเซอร์ (${incompleteStats.countUser})` : `No Username (${incompleteStats.countUser})`}
            </button>

            {boIncompleteFilter !== 'ทั้งหมด' && (
              <button
                type="button"
                onClick={() => setBoIncompleteFilter('ทั้งหมด')}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {lang === 'TH' ? 'ล้างตัวกรองด่วน' : 'Clear'}
              </button>
            )}
          </div>

          {/* Table Header Controls & Pagination Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '12px',
            padding: '8px 12px',
            background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
            borderRadius: '10px',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                📊 {lang === 'TH' ? 'ผลลัพธ์ลูกค้า:' : 'Total Results:'}
              </span>
              <span className="badge badge-owner" style={{ fontSize: '11px', padding: '3px 8px' }}>
                {totalBoRecords.toLocaleString()} {lang === 'TH' ? 'คน' : 'leads'}
              </span>
              {totalBoRecords > 0 && (
                <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                  ({lang === 'TH' ? `แสดงลำดับ ${startRecordNum} - ${endRecordNum}` : `Showing ${startRecordNum} - ${endRecordNum}`})
                </span>
              )}
              {boSortField && (
                <span style={{
                  fontSize: '11px',
                  color: '#7c3aed',
                  background: theme === 'light' ? 'rgba(124, 58, 237, 0.08)' : 'rgba(124, 58, 237, 0.2)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{lang === 'TH' ? 'เรียงตาม: ' : 'Sort: '}</span>
                  <strong>
                    {boSortField === 'totalDeposit' ? (lang === 'TH' ? 'ยอดฝากสะสม' : 'Total Deposits') :
                     boSortField === 'fullName' ? (lang === 'TH' ? 'ชื่อลูกค้า' : 'Customer Name') :
                     boSortField === 'sourceChannel' ? (lang === 'TH' ? 'ช่องทาง' : 'Channel') :
                     boSortField === 'createdBy' ? (lang === 'TH' ? 'ผู้ดูแล' : 'Owner') :
                     (lang === 'TH' ? 'วันที่เพิ่ม' : 'Date Added')}
                  </strong>
                  <span>{boSortDirection === 'asc' ? '▲ (น้อยไปมาก/ก-ฮ)' : '▼ (มากไปน้อย/ล่าสุด)'}</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{lang === 'TH' ? 'แสดงหน้าละ:' : 'Per page:'}</span>
                <select
                  value={boPageSize}
                  onChange={(e) => setBoPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="select-input"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11.5px',
                    borderRadius: '6px',
                    height: '28px',
                    minWidth: '100px',
                    cursor: 'pointer'
                  }}
                >
                  <option value={25}>25 {lang === 'TH' ? 'คน' : 'leads'}</option>
                  <option value={50}>50 {lang === 'TH' ? 'คน' : 'leads'}</option>
                  <option value={100}>100 {lang === 'TH' ? 'คน' : 'leads'}</option>
                  <option value="all">{lang === 'TH' ? `ทั้งหมด (${totalBoRecords})` : `All (${totalBoRecords})`}</option>
                </select>
              </label>

              <div style={{ width: '1px', height: '18px', background: theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

              <button
                type="button"
                onClick={() => handleExportFiltered('excel')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 12px',
                  borderRadius: '7px',
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.15s'
                }}
                title={lang === 'TH' ? `ส่งออกข้อมูลลูกค้าตามตัวกรอง (${totalBoRecords} คน) เป็นไฟล์ Excel (.xlsx)` : 'Export filtered customers to Excel'}
              >
                <FileSpreadsheet style={{ width: '13px', height: '13px' }} />
                <span>{lang === 'TH' ? `ส่งออก Excel (${totalBoRecords})` : `Export Excel (${totalBoRecords})`}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportFiltered('csv')}
                className="btn btn-secondary"
                style={{
                  padding: '5px 10px',
                  fontSize: '11.5px',
                  borderRadius: '7px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={lang === 'TH' ? 'ส่งออกเป็นไฟล์ CSV' : 'Export CSV'}
              >
                <Download style={{ width: '13px', height: '13px' }} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Active Selection Banner */}
          {selectedBoCustIds.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: theme === 'light' ? '#f5f3ff' : 'rgba(124, 58, 237, 0.16)',
              border: theme === 'light' ? '1.5px solid #d8b4fe' : '1.5px solid rgba(168, 85, 247, 0.4)',
              marginBottom: '12px',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.12)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>☑️</span>
                <span style={{ fontWeight: 800, fontSize: '13px', color: '#7c3aed' }}>
                  {lang === 'TH' ? `เลือกอยู่ ${selectedBoCustIds.length} คน` : `Selected ${selectedBoCustIds.length} leads`}
                </span>
                <button
                  type="button"
                  onClick={handleToggleSelectAllInPage}
                  className="btn btn-secondary"
                  style={{ padding: '3px 9px', fontSize: '11px', borderRadius: '6px', fontWeight: 600 }}
                >
                  {isAllCurrentPageSelected 
                    ? (lang === 'TH' ? 'ยกเลิกเลือกหน้านี้' : 'Deselect Page') 
                    : (lang === 'TH' ? `เลือกทั้งหมดในหน้านี้ (${paginatedBoCustomers.length})` : `Select Page (${paginatedBoCustomers.length})`)}
                </button>
                {sortedAndFilteredBoCustomers.length > paginatedBoCustomers.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="btn btn-secondary"
                    style={{ padding: '3px 9px', fontSize: '11px', borderRadius: '6px', fontWeight: 600 }}
                  >
                    {lang === 'TH' ? `เลือกทุกคนตามตัวกรอง (${sortedAndFilteredBoCustomers.length})` : `Select All Filtered (${sortedAndFilteredBoCustomers.length})`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  {lang === 'TH' ? 'ล้างที่เลือก' : 'Clear'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleExportFiltered('excel')}
                  style={{
                    padding: '5px 14px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    border: 'none',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <FileSpreadsheet style={{ width: '13px', height: '13px' }} />
                  <span>{lang === 'TH' ? `ส่งออก Excel ที่เลือก (${selectedBoCustIds.length})` : `Export Selected (${selectedBoCustIds.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportFiltered('csv')}
                  className="btn btn-secondary"
                  style={{
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download style={{ width: '13px', height: '13px' }} />
                  <span>CSV</span>
                </button>

                <div style={{ width: '1px', height: '18px', background: theme === 'light' ? '#cbd5e1' : 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

                <button
                  type="button"
                  onClick={() => {
                    setBulkTargetChannel(sourceChannels[0] || 'Facebook');
                    setIsBulkChannelModalOpen(true);
                  }}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1.5px solid rgba(59, 130, 246, 0.45)',
                    color: '#3b82f6',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#3b82f6';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)';
                    e.currentTarget.style.color = '#3b82f6';
                  }}
                  title={lang === 'TH' ? `เปลี่ยนช่องทางการตลาดให้กับลูกค้าที่เลือก ${selectedBoCustIds.length} คน` : 'Change marketing channel for selected leads'}
                >
                  <Tag style={{ width: '13px', height: '13px' }} />
                  <span>{lang === 'TH' ? `เปลี่ยนช่องทาง (${selectedBoCustIds.length})` : `Change Channel (${selectedBoCustIds.length})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDeleteCustomers}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1.5px solid rgba(239, 68, 68, 0.45)',
                    color: '#ef4444',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ef4444';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  title={lang === 'TH' ? `ย้ายลูกค้าที่เลือก ${selectedBoCustIds.length} คน ไปยังถังขยะระบบ (Recycle Bin)` : 'Move selected to Recycle Bin'}
                >
                  <Trash2 style={{ width: '13px', height: '13px' }} />
                  <span>{lang === 'TH' ? `ย้ายลงถังขยะ (${selectedBoCustIds.length})` : `Delete (${selectedBoCustIds.length})`}</span>
                </button>
              </div>
            </div>
          )}

          {/* Customers Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ width: '42px', minWidth: '42px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllCurrentPageSelected}
                      ref={el => { if (el) el.indeterminate = isSomeCurrentPageSelected; }}
                      onChange={handleToggleSelectAllInPage}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                      title={lang === 'TH' ? 'เลือก/ยกเลิกทั้งหมดในหน้านี้' : 'Select/Deselect all on this page'}
                    />
                  </th>
                  <th>{renderSortableHeader('fullName', lang === 'TH' ? 'ชื่อลูกค้า / ยูสเซอร์' : 'Customer / Username')}</th>
                  <th>{lang === 'TH' ? 'ข้อมูลติดต่อ' : 'Contact'}</th>
                  <th>{renderSortableHeader('sourceChannel', lang === 'TH' ? 'ช่องทาง' : 'Channel')}</th>
                  <th>{renderSortableHeader('createdBy', lang === 'TH' ? 'ผู้ดูแล' : 'Owner')}</th>
                  <th style={{ textAlign: 'right' }}>{renderSortableHeader('totalDeposit', lang === 'TH' ? 'เงินสะสม' : 'Total Deposits', 'right')}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'สถานะ' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{renderSortableHeader('createdAt', lang === 'TH' ? 'วันที่เพิ่ม' : 'Date Added', 'center')}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'TH' ? 'การจัดการ' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredBoCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      {lang === 'TH' ? 'ไม่พบข้อมูลลูกค้าตรงตามเงื่อนไข' : 'No customers match criteria'}
                    </td>
                  </tr>
                ) : (
                  paginatedBoCustomers.map(cust => (
                    <tr 
                      key={cust.id}
                      style={{
                        background: selectedBoCustIds.includes(cust.id)
                          ? (theme === 'light' ? '#f5f3ff' : 'rgba(124, 58, 237, 0.12)')
                          : undefined
                      }}
                    >
                      <td style={{ textAlign: 'center', width: '42px' }}>
                        <input
                          type="checkbox"
                          checked={selectedBoCustIds.includes(cust.id)}
                          onChange={() => handleToggleSelectCustomer(cust.id)}
                          style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#7c3aed' }}
                        />
                      </td>
                      <td>
                        <strong>{cust.fullName || '-'}</strong>
                        {isCustMissingUser(cust) ? (
                          <div style={{ fontSize: '10.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                            {lang === 'TH' ? '⚠️ ยังไม่มียูสเซอร์' : '⚠️ No username'}
                          </div>
                        ) : (
                          <div style={{ fontSize: '11px', color: 'var(--primary)' }}>@{cust.username}</div>
                        )}
                      </td>
                      <td>
                        {isCustMissingPhone(cust) ? (
                          <div style={{ fontSize: '11px', color: '#f43f5e', fontWeight: 600 }}>📞 {lang === 'TH' ? 'ไม่มีเบอร์' : 'No phone'}</div>
                        ) : (
                          <div style={{ fontSize: '11px' }}>📞 {cust.phone}</div>
                        )}
                        {isCustMissingLine(cust) ? (
                          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>💬 {lang === 'TH' ? 'ไม่มี LINE OA' : 'No LINE'}</div>
                        ) : (
                          <div style={{ fontSize: '11px', color: '#34d399' }}>💬 {cust.lineOA}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-source">{formatChannelDisplayName(cust.sourceChannel, lang)}</span>
                      </td>
                      <td>
                        {isCustMissingOwner(cust) ? (
                          <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '11px' }}>
                            {lang === 'TH' ? '⚠️ ไม่มีผู้ดูแล' : 'Unassigned'}
                          </span>
                        ) : (
                          <span className="badge badge-owner">{cust.createdBy}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        ฿{(cust.totalDeposit || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {cust.hasDeposited ? (
                          <span className="badge badge-saved">🟢 {lang === 'TH' ? 'ฝากแล้ว' : 'Deposited'}</span>
                        ) : (
                          <span className="badge badge-pending">🔴 {lang === 'TH' ? 'รอฝาก' : 'Pending'}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatCustCreatedDate(cust.createdAt)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '10px', marginRight: '4px' }}
                          onClick={() => setSelectedCustForModal(cust)}
                        >
                          <Edit style={{ width: '11px', height: '11px' }} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '10px', color: '#f43f5e' }}
                          onClick={() => handleDeleteCustomer(cust.id, cust.username)}
                        >
                          <Trash2 style={{ width: '11px', height: '11px' }} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Bar */}
          {totalBoRecords > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '12px',
              padding: '10px 14px',
              background: theme === 'light' ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {/* Left: Summary */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {lang === 'TH' 
                  ? `หน้า ${safeBoCurrentPage} จากทั้งหมด ${totalBoPages} หน้า (${totalBoRecords.toLocaleString()} รายการ)`
                  : `Page ${safeBoCurrentPage} of ${totalBoPages} (${totalBoRecords.toLocaleString()} records)`}
              </div>

              {/* Right: Pagination Buttons */}
              {boPageSize !== 'all' && totalBoPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* First Page */}
                  <button
                    type="button"
                    disabled={safeBoCurrentPage <= 1}
                    onClick={() => setBoCurrentPage(1)}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      opacity: safeBoCurrentPage <= 1 ? 0.4 : 1,
                      cursor: safeBoCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title={lang === 'TH' ? 'หน้าแรก' : 'First Page'}
                  >
                    <ChevronsLeft style={{ width: '13px', height: '13px' }} />
                  </button>

                  {/* Previous Page */}
                  <button
                    type="button"
                    disabled={safeBoCurrentPage <= 1}
                    onClick={() => setBoCurrentPage(prev => Math.max(1, prev - 1))}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      opacity: safeBoCurrentPage <= 1 ? 0.4 : 1,
                      cursor: safeBoCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title={lang === 'TH' ? 'หน้าก่อนหน้า' : 'Previous Page'}
                  >
                    <ChevronLeft style={{ width: '13px', height: '13px' }} />
                    <span>{lang === 'TH' ? 'ก่อนหน้า' : 'Prev'}</span>
                  </button>

                  {/* Page Numbers */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: '0 4px' }}>
                    {getPaginationRange().map((p, idx) => {
                      if (p === '...') {
                        return (
                          <span key={`dots-${idx}`} style={{ padding: '0 4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            ...
                          </span>
                        );
                      }
                      const isActive = p === safeBoCurrentPage;
                      return (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setBoCurrentPage(p)}
                          style={{
                            minWidth: '28px',
                            height: '28px',
                            padding: '0 6px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: isActive ? 800 : 500,
                            border: isActive ? 'none' : (theme === 'light' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)'),
                            background: isActive ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'transparent',
                            color: isActive ? '#ffffff' : 'inherit',
                            cursor: 'pointer',
                            boxShadow: isActive ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none',
                            transition: 'all 0.15s'
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Page */}
                  <button
                    type="button"
                    disabled={safeBoCurrentPage >= totalBoPages}
                    onClick={() => setBoCurrentPage(prev => Math.min(totalBoPages, prev + 1))}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      opacity: safeBoCurrentPage >= totalBoPages ? 0.4 : 1,
                      cursor: safeBoCurrentPage >= totalBoPages ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title={lang === 'TH' ? 'หน้าถัดไป' : 'Next Page'}
                  >
                    <span>{lang === 'TH' ? 'ถัดไป' : 'Next'}</span>
                    <ChevronRight style={{ width: '13px', height: '13px' }} />
                  </button>

                  {/* Last Page */}
                  <button
                    type="button"
                    disabled={safeBoCurrentPage >= totalBoPages}
                    onClick={() => setBoCurrentPage(totalBoPages)}
                    className="btn btn-secondary"
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      opacity: safeBoCurrentPage >= totalBoPages ? 0.4 : 1,
                      cursor: safeBoCurrentPage >= totalBoPages ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                    title={lang === 'TH' ? 'หน้าสุดท้าย' : 'Last Page'}
                  >
                    <ChevronsRight style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 4: Disaster Recovery & Backup/Restore */}
      {(backOfficeSubTab === 'all' || backOfficeSubTab === 'backup') && (
        <div className="panel" style={{
          marginTop: '24px',
          background: theme === 'light' ? '#ffffff' : 'rgba(15, 23, 42, 0.75)',
          border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}>
                <ShieldAlert style={{ width: '22px', height: '22px' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {lang === 'TH' ? 'ระบบสำรองและกู้คืนฐานข้อมูลฉุกเฉิน (Disaster Recovery Control)' : 'Disaster Recovery & Database Backup'}
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                    {lastKeepAliveTime ? `🟢 Keep-Alive: ${lastKeepAliveTime}` : '🟢 Keep-Alive: Active'}
                  </span>
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  {lang === 'TH' 
                    ? 'สำรองข้อมูลทั้งหมดหรือกู้คืนระบบฉุกเฉินด้วยไฟล์ JSON มาตรฐาน' 
                    : 'One-click full JSON backup & disaster restore.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFullSystemBackup}
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <DownloadCloud style={{ width: '16px', height: '16px' }} />
                <span>{lang === 'TH' ? 'ดาวน์โหลดสำรองข้อมูลเต็มระบบ (Full Backup)' : 'Download Full Backup'}</span>
              </button>

              <label
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <UploadCloud style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
                <span>{lang === 'TH' ? 'กู้คืนระบบจากไฟล์ Backup (Restore JSON)' : 'Restore from Backup'}</span>
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      handleFullSystemRestore(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Security & Health Notice */}
          <div style={{
            marginTop: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: theme === 'light' ? '#eff6ff' : 'rgba(59, 130, 246, 0.08)',
              border: theme === 'light' ? '1px solid #bfdbfe' : '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '12px',
              color: theme === 'light' ? '#1e40af' : '#93c5fd'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle style={{ width: '14px', height: '14px' }} />
                <span>{lang === 'TH' ? 'ความปลอดภัยระดับสูง (SHA-256 + Salt)' : 'Hardened Security'}</span>
              </div>
              <span>{lang === 'TH' ? 'รหัสผ่านพนักงานทั้งหมดถูกเข้ารหัส SHA-256 ผสม Salt และมาสก์มิดชิด ป้องกันการดักจับข้อมูล' : 'Agent passcodes are secured with SHA-256.'}</span>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: theme === 'light' ? '#f0fdf4' : 'rgba(16, 185, 129, 0.08)',
              border: theme === 'light' ? '1px solid #bbf7d0' : '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: '12px',
              color: theme === 'light' ? '#166534' : '#6ee7b7'
            }}>
              <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity style={{ width: '14px', height: '14px' }} />
                <span>{lang === 'TH' ? 'ระบบ Keep-Alive คลาวด์อัตโนมัติ' : 'Cloud Keep-Alive Engine'}</span>
              </div>
              <span>{lang === 'TH' ? 'ระบบส่งสัญญาณ Heartbeat ไปยัง Supabase ทุก 4 นาทีโดยอัตโนมัติ เพื่อป้องกันฐานข้อมูลหลับ' : 'Heartbeat pings Supabase every 4 minutes.'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Change Channel Confirmation Modal */}
      {isBulkChannelModalOpen && typeof document !== 'undefined' && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: theme === 'light' ? '#ffffff' : '#0f172a',
            color: theme === 'light' ? '#0f172a' : '#f8fafc',
            borderRadius: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
            width: '100%',
            maxWidth: '460px',
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
              background: theme === 'light' ? '#eff6ff' : '#172554'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🏷️</span>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#2563eb' }}>
                  {lang === 'TH' ? 'เปลี่ยนช่องทางการตลาดแบบกลุ่ม' : 'Bulk Change Marketing Channel'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkChannelModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: theme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.04)',
                border: theme === 'light' ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
                marginBottom: '18px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{lang === 'TH' ? '📊 จำนวนลูกค้าที่เลือก:' : 'Selected Leads:'}</span>
                  <strong style={{ color: '#2563eb', fontSize: '15px' }}>
                    {selectedBoCustIds.length} {lang === 'TH' ? 'คน' : 'leads'}
                  </strong>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', borderTop: theme === 'light' ? '1px dashed #cbd5e1' : '1px dashed rgba(255,255,255,0.1)', paddingTop: '8px', marginTop: '8px', lineHeight: 1.5 }}>
                  ℹ️ {lang === 'TH' 
                    ? 'ระบบจะอัปเดตช่องทางสมัคร (Source Channel) ให้ลูกค้าทุกคนที่เลือก ประวัติการฝากเงิน, วันที่ติ๊กตาม และโน้ตเดิมจะยังคงอยู่ครบ 100%' 
                    : 'Channel will be updated for all selected leads while preserving their deposit and follow-up history.'}
                </div>
              </div>

              {/* Channel Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  {lang === 'TH' ? '🎯 เลือกช่องทางใหม่ที่ต้องการเปลี่ยนเป็น:' : 'Select New Channel:'}
                </label>
                <select
                  value={bulkTargetChannel}
                  onChange={(e) => setBulkTargetChannel(e.target.value)}
                  className="select-input"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1.5px solid #3b82f6'
                  }}
                >
                  {sourceChannels.map(ch => (
                    <option key={ch} value={ch}>
                      {formatChannelDisplayName(ch, lang)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsBulkChannelModalOpen(false)}
                  className="btn btn-secondary"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {lang === 'TH' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulkChangeChannel}
                  disabled={!bulkTargetChannel}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 800,
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <span>💾</span>
                  <span>
                    {lang === 'TH' 
                      ? `ยืนยันเปลี่ยนเป็น "${formatChannelDisplayName(bulkTargetChannel, lang)}"` 
                      : `Confirm Change`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export { BackOfficeView };
