// Interactive Guided Tour Steps and Section Metadata

export const TOUR_STEPS = [
    // --- OVERVIEW & HEADER (3 STEPS) ---
    {
        id: 'brand',
        section: 'overview',
        targetId: 'tour-brand',
        requiredView: null,
        badgeTH: '👋 1. ภาพรวมระบบ',
        badgeEN: '👋 1. Overview',
        titleTH: 'ยินดีต้อนรับสู่ MC Daily Follow Up',
        titleEN: 'Welcome to MC Daily Follow Up',
        descTH: 'ระบบติดตามลูกค้าใหม่ที่สมัครสมาชิกแต่ยังไม่ได้ฝากเงิน (ค้างฝาก) ช่วยให้ทีม MC จัดการรายชื่อ ทักแชทติดตาม และเช็กยอดฝากได้อย่างเป็นระบบ พร้อมเชื่อมต่อคลาวด์แบบเรียลไทม์',
        descEN: 'Specialized system for following up newly registered customers who have not yet deposited. Manage chat follow-ups and monitor conversion with real-time cloud sync.',
        tipTH: '💡 จุดสังเกต: จุดเขียว "คลาวด์ซิงค์เรียลไทม์" ยืนยันว่าข้อมูลเชื่อมต่อกับฐานข้อมูล Supabase ตลอดเวลา',
        tipEN: '💡 Pro-tip: Green "Cloud Sync Live" status verifies active connection to Supabase database.',
        position: 'bottom'
    },
    {
        id: 'profile',
        section: 'overview',
        targetId: 'tour-profile',
        requiredView: null,
        badgeTH: '🔐 2. บัญชีผู้ใช้งาน',
        badgeEN: '🔐 2. User Account',
        titleTH: 'การเข้าสู่ระบบและสลับบัญชีผู้ใช้งาน',
        titleEN: 'User Login & Account Switching',
        descTH: 'คลิกที่กล่องนี้เพื่อเข้าสู่ระบบ หรือสลับบัญชีระหว่าง MC Agent (เจ้าหน้าที่ทักแชทติดตาม) และ Supervisor (หัวหน้างานตรวจแดชบอร์ด)',
        descEN: 'Click here to sign in or switch accounts between MC Agent (follow-up chat staff) and Supervisor (management dashboard).',
        tipTH: '💡 ระบบความปลอดภัย: หน้าจอจะล็อกอัตโนมัติ (Auto-Lock) หากไม่มีการใช้งานเกิน 15 นาที เพื่อรักษาความปลอดภัยของข้อมูลลูกค้า',
        tipEN: '💡 Security: Automatic screen lock engages after 15 minutes of inactivity to protect customer data.',
        position: 'bottom'
    },
    {
        id: 'sidebar',
        section: 'overview',
        targetId: 'tour-sidebar',
        requiredView: null,
        badgeTH: '📂 3. เมนูทั้ง 8 หน้า',
        badgeEN: '📂 3. All 8 Menus',
        titleTH: 'แถบเมนูการทำงานหลักครบทั้ง 8 หน้า',
        titleEN: 'Navigation Menu Across All 8 Modules',
        descTH: 'แถบเมนูด้านซ้ายใช้สลับหน้าระหว่าง: 1.แดชบอร์ดสรุป, 2.การติดตามลูกค้า (MC), 3.อัปโหลดธุรกรรม, 4.เพิ่มลูกค้าใหม่, 5.ตรวจสอบงานรายวัน, 6.จัดการหลังบ้าน, 7.ประวัติการแก้ไข และ 8.ถังขยะระบบ',
        descEN: 'Navigate across all 8 modules: Supervisor Dashboard, MC Follow-Up, Upload Deposits, Add Customer, Daily Audit, Back Office, Audit Logs, and Recycle Bin.',
        tipTH: '💡 คุณสามารถกดแถบปุ่มหมวดหมู่ด้านบนของการ์ดใบนี้ เพื่อกระโดดไปดูคู่มือของแต่ละหน้าได้ทันที!',
        tipEN: '💡 Click any module pill at the top of this tour card to jump directly to that page guide!',
        position: 'right'
    },

    // --- PAGE 1: MC AGENT FOLLOW-UP (5 STEPS) ---
    {
        id: 'filter-card',
        section: 'agent',
        targetId: 'tour-filter-card',
        requiredView: 'agent',
        badgeTH: '🔍 หน้าติดตามลูกค้า (1/5)',
        badgeEN: '🔍 MC Agent (1/5)',
        titleTH: 'ตัวกรองรอบเดือน & ทางลัดคัดกรอง "สมัครแต่ไม่ฝาก"',
        titleEN: 'Month Selector & Dynamic Sub-Filters',
        descTH: 'เลือกดูงานตามรอบเดือน และคลิกปุ่มสถานะเพื่อคัดกรองงาน โดยเฉพาะเมื่อกดปุ่ม "🔴 สมัครไม่ฝาก" จะมีชิปตัวกรองย่อยคลี่ออกมาให้เลือกทันที: มีไลน์พร้อมทักทันที, รอแอดไลน์ หรือค้างตาม 3 วัน+',
        descEN: 'Select campaign month and filter leads. Clicking "🔴 Reg (No Deposit)" smoothly reveals dynamic sub-filters: Has LINE (Ready to Chat), Pending LINE, or Overdue 3d+.',
        tipTH: '💡 ทริคใหม่: คลิกปุ่ม "🔴 สมัครไม่ฝาก" แล้วเลือก "💬 มีไลน์ (พร้อมทัก)" เพื่อดึงเคสที่พร้อมทักแชทได้ทันทีในคลิกเดียว!',
        tipEN: '💡 Pro-tip: Click "🔴 Reg (No Deposit)" then pick "💬 Has LINE (Ready)" to isolate immediately actionable leads with 1 click!',
        position: 'bottom'
    },
    {
        id: 'customer-info',
        section: 'agent',
        targetId: 'tour-customer-info',
        fallbackId: 'tour-customer-table',
        requiredView: 'agent',
        badgeTH: '⚡ หน้าติดตามลูกค้า (2/5)',
        badgeEN: '⚡ MC Agent (2/5)',
        titleTH: 'ข้อมูลติดต่อ & ปุ่มเปลี่ยนสถานะ LINE ด่วน (1 คลิก)',
        titleEN: 'Contact Info & 1-Click Quick LINE Status',
        descTH: 'แสดงชื่อ ยูสเซอร์เนม ปุ่ม 📋 คัดลอก LINE ID และใหม่ล่าสุด! ปุ่มกดเปลี่ยนสถานะไลน์ด่วน [🟢 มี] [🟡 รอแอด] [⚪ ไม่มี] บนตาราง กดคลิกเดียวบันทึกทันทีโดยไม่ต้องเปิดหน้าต่างแก้ไข!',
        descEN: 'Shows customer details, 1-click copy buttons, and inline 1-Click LINE Status pills ([🟢 Has] [🟡 Wait] [⚪ None]) that save instantly!',
        tipTH: '💡 การแจ้งเตือน: หากมีป้าย "⚠️ ค้างตาม 3 วัน+" กะพริบอยู่ แสดงว่าลูกค้ารายนี้ยังไม่ได้ทักแชทติดตามเกิน 3 วัน ควรทักด่วนเป็นพิเศษ',
        tipEN: '💡 Alert: Pulsing "⚠️ Overdue 3d+" badge indicates 3+ days without chat follow-up.',
        position: 'bottom'
    },
    {
        id: 'days-grid',
        section: 'agent',
        targetId: 'tour-days-grid',
        fallbackId: 'tour-customer-table',
        requiredView: 'agent',
        badgeTH: '📌 หน้าติดตามลูกค้า (3/5)',
        badgeEN: '📌 MC Agent (3/5)',
        titleTH: '⭐ การติ๊กติดตามงานรายวัน (วันที่ 1 - 31)',
        titleEN: '⭐ Daily Follow-Up Checkmarks (Days 1 - 31)',
        descTH: 'หัวใจสำคัญของ MC: เมื่อทักแชทติดตามลูกค้าในแต่ละวัน ให้คลิกติ๊กที่ช่อง "วันที่ของวันนี้" (ช่องที่มีกรอบเน้นสีม่วง) เพื่อบันทึกว่าได้ติดตามแล้ว ช่องจะเปลี่ยนเป็นสีเขียวทันที',
        descEN: 'Core MC workflow: When you chat with a customer today, click the highlighted box for "Today". It turns bright green to verify your follow-up has been logged.',
        tipTH: '💡 กฎความถูกต้อง: ระบบล็อกให้ติ๊กได้เฉพาะ "วันที่ปัจจุบัน" เพื่อความโปร่งใส โดยข้อมูลจะบันทึกลงคลาวด์ Supabase อัตโนมัติทันที',
        tipEN: '💡 Integrity rule: You can only log follow-ups for the current date. Changes sync instantly to Supabase cloud.',
        position: 'top'
    },
    {
        id: 'deposit-status',
        section: 'agent',
        targetId: 'tour-deposit-status',
        fallbackId: 'tour-customer-table',
        requiredView: 'agent',
        badgeTH: '💰 หน้าติดตามลูกค้า (4/5)',
        badgeEN: '💰 MC Agent (4/5)',
        titleTH: 'ตรวจสอบผลการฝากเงินของลูกค้า (FTD)',
        titleEN: 'Deposit Conversion Status (FTD)',
        descTH: 'ช่องนี้จะแสดงว่าลูกค้า "🟢 ฝากแล้ว" (พร้อมระบุยอดเงินฝากแรก) หรือ "🔴 รอฝากเงิน" เมื่อลูกค้าฝากเงินเข้ามา ระบบจะตรวจจับและอัปเดตให้อัตโนมัติจากไฟล์ธุรกรรมที่อัปโหลด',
        descEN: 'Shows whether the customer is "🟢 Deposited" (with first deposit amount) or "🔴 Pending". Updates automatically when deposit spreadsheets are uploaded.',
        tipTH: '💡 สรุปผลงาน: ยอดเงินฝากของลูกค้าที่ตามสำเร็จ จะถูกนำไปคำนวณในแถบสรุปยอดรวม (FTD) ด้านบนตารางทันที',
        tipEN: '💡 Performance KPI: Successfully converted deposits tally directly into the grand totals bar (FTD) above the table.',
        position: 'bottom'
    },
    {
        id: 'notes-btn',
        section: 'agent',
        targetId: 'tour-notes-btn',
        fallbackId: 'tour-customer-table',
        requiredView: 'agent',
        badgeTH: '📝 หน้าติดตามลูกค้า (5/5)',
        badgeEN: '📝 MC Agent (5/5)',
        titleTH: '⚡ บันทึก Remarks ด่วน & ปุ่มข้อความสำเร็จรูป',
        titleEN: '⚡ Quick Chat Remarks & 1-Click Presets',
        descTH: 'คลิกที่ข้อความโน้ตหรือปุ่ม "⚡ โน้ตด่วน" เพื่อเลือกปุ่มคำสำเร็จรูป (เช่น "💬 ทักแล้ว ยังไม่อ่าน", "⏳ รอเงินเดือนออก", "🌙 นัดฝากช่วงเย็น") กดคลิกเดียวบันทึกทันที หรือพิมพ์แล้วกด Enter ได้เลย!',
        descEN: 'Click the note or "⚡ Quick Note" button to pick 1-click preset chips (e.g., "Unread", "Waiting for payday", "Evening deposit") or type and press Enter to save instantly!',
        tipTH: '💡 หากต้องการแก้ไขชื่อ เบอร์โทร หรือโอนย้ายเคส สามารถกดปุ่มดินสอ ✏️ เพื่อเปิดหน้าต่างแก้ไขแบบเต็มได้เหมือนเดิมครับ',
        tipEN: '💡 To edit full customer details (name, phone, owner), click the ✏️ pencil button.',
        position: 'left'
    },

    // --- PAGE 2: SUPERVISOR DASHBOARD (2 STEPS) ---
    {
        id: 'sup-filter',
        section: 'supervisor',
        targetId: 'tour-sup-filter',
        requiredView: 'supervisor',
        badgeTH: '📊 หน้าแดชบอร์ด (1/2)',
        badgeEN: '📊 Dashboard (1/2)',
        titleTH: 'ตัวกรองรอบเดือน ช่วงวันที่ และปุ่มดาวน์โหลด Excel (.xlsx)',
        titleEN: 'Campaign Period, Date Range & CSV Export',
        descTH: 'ในหน้าแดชบอร์ดสรุป หัวหน้างานสามารถเลือกดูข้อมูลตามรอบเดือน หรือกรองเฉพาะช่วงวันที่คีย์งาน พร้อมกดปุ่ม "ดาวน์โหลด Excel (.xlsx)" เพื่อนำข้อมูลลูกค้าไปสำรองหรือวิเคราะห์ต่อได้ทันที',
        descEN: 'Filter dashboard metrics by campaign month or custom date range, and click "Export Excel (.xlsx)" to download backup reports.',
        tipTH: '💡 กดปุ่ม "✓ วันนี้" เพื่อดูสรุปยอดลูกค้าใหม่ที่เพิ่งคีย์เข้ามาในวันนี้แบบเรียลไทม์',
        tipEN: '💡 Click "✓ Today" to inspect leads added today in real time.',
        position: 'bottom'
    },
    {
        id: 'sup-kpis',
        section: 'supervisor',
        targetId: 'tour-sup-kpis',
        requiredView: 'supervisor',
        badgeTH: '📈 หน้าแดชบอร์ด (2/2)',
        badgeEN: '📈 Dashboard (2/2)',
        titleTH: 'การ์ดสรุป 5 KPI หลัก & ตารางผลงานรายบุคคล',
        titleEN: '5 Executive KPI Cards & Agent Performance',
        descTH: 'แสดงภาพรวม 5 ขั้นตอน: 1.จำนวนทักทั้งหมด ➜ 2.ทักแต่ไม่สมัคร ➜ 3.ทักสมัคร ➜ 4.สมัครและฝาก (สำเร็จ) ➜ 5.สมัครแต่ไม่ฝาก (ค้างตาม) พร้อมตารางจัดอันดับผลงานทีม MC ด้านล่าง',
        descEN: 'Tracks the 5-stage funnel from Total Inquiries to Converted Deposits, followed by agent leaderboards and channel breakdowns below.',
        tipTH: '💡 ดูเปอร์เซ็นต์ Conversion Rate และยอดเงินฝากสะสมรวมของแต่ละช่องทางและพนักงานแต่ละคนได้ในหน้านี้',
        tipEN: '💡 Monitor conversion rates and total deposit revenue by agent and marketing channel.',
        position: 'bottom'
    },

    // --- PAGE 3: UPLOAD DEPOSITS (1 STEP) ---
    {
        id: 'upload-box',
        section: 'upload-deposits',
        targetId: 'tour-upload-box',
        requiredView: 'upload-deposits',
        badgeTH: '☁️ หน้าอัปโหลดยอดฝาก',
        badgeEN: '☁️ Upload Deposits',
        titleTH: 'อัปโหลดไฟล์ธุรกรรมรายวัน & จับคู่ยอดอัตโนมัติ',
        titleEN: 'Daily Deposit Upload & Auto-Matching Engine',
        descTH: 'คลิกเลือกไฟล์หรือลากไฟล์ Excel (.xlsx / .xls) หรือ CSV ยอดฝากรายวันมาวางที่นี่ ระบบจะแสดงตัวอย่างพรีวิว ตรวจสอบยูสเซอร์เนม และผูกยอดฝากแรก (FTD) เข้ากับลูกค้าในพอร์ตให้อัตโนมัติ (รองรับยอดฝากข้ามเดือน)',
        descEN: 'Drag and drop Excel or CSV deposit files here. The system previews records, matches usernames, and automatically updates customer deposit status across months.',
        tipTH: '💡 ด้านล่างของหน้านี้มีตารางแสดงประวัติรายการฝากล่าสุดและช่องค้นหาธุรกรรมย้อนหลัง',
        tipEN: '💡 Below the upload box, you can search and review recent deposit transactions.',
        position: 'bottom'
    },

    // --- PAGE 4: NEW CUSTOMER (1 STEP) ---
    {
        id: 'newcust-panel',
        section: 'new-customer',
        targetId: 'tour-newcust-panel',
        requiredView: 'new-customer',
        badgeTH: '➕ หน้าเพิ่มลูกค้าใหม่',
        badgeEN: '➕ Add Customer',
        titleTH: 'แบบฟอร์มเพิ่มลูกค้าใหม่รายคน & เช็กข้อมูลซ้ำ',
        titleEN: 'Add New Customer & Duplicate Prevention',
        descTH: 'ใช้สำหรับคีย์ข้อมูลลูกค้าใหม่เข้าพอร์ต (วันที่สมัคร, ชื่อ-สกุล, ยูสเซอร์เนม, เบอร์โทร, LINE OA, สถานะไลน์เล็ก, ช่องทางที่ทัก และโน้ตเริ่มต้น) โดยระบบจะตรวจสอบเบอร์โทรและยูสเซอร์ซ้ำให้อัตโนมัติทันทีที่พิมพ์',
        descEN: 'Register new leads into your portfolio. Real-time validation automatically prevents duplicate phone numbers, usernames, or LINE IDs.',
        tipTH: '💡 หากเลือกช่องทาง "เพื่อนแนะนำ" ระบบจะมีช่องให้ระบุยูสเซอร์หรือเบอร์โทรของเพื่อนผู้แนะนำด้วยครับ',
        tipEN: '💡 Selecting "Referral" prompts for the referrer username or phone number.',
        position: 'top'
    },

    // --- PAGE 5: SUPERVISOR AUDIT (1 STEP) ---
    {
        id: 'audit-panel',
        section: 'audit',
        targetId: 'tour-audit-panel',
        requiredView: 'audit',
        badgeTH: '🛡️ หน้าตรวจสอบงาน (Audit)',
        badgeEN: '🛡️ Daily Audit',
        titleTH: 'ตารางตรวจสอบงานรายวันสำหรับหัวหน้า (Supervisor Audit)',
        titleEN: 'Supervisor Daily Follow-Up Audit Table',
        descTH: 'หน้าสำหรับหัวหน้างานใช้ตรวจเช็กความสม่ำเสมอในการทักแชทติดตามลูกค้าของพนักงานแต่ละคน แสดงตาราง Heatmap รายวัน สถานะไลน์ และการฝากเงิน พร้อมปุ่มเปลี่ยนสถานะไลน์ด่วนและปุ่มส่งออก CSV',
        descEN: 'Dedicated supervisor view to audit daily follow-up heatmaps across agents, filter by channel or overdue status, and export audit reports.',
        tipTH: '💡 หัวหน้าสามารถคลิกปุ่ม "แก้ไข / โน้ต" เพื่อโอนย้ายเคสลูกค้าให้พนักงานคนอื่นดูแลต่อได้จากหน้านี้',
        tipEN: '💡 Supervisors can reassign customer cases between agents using the "Edit / Notes" button.',
        position: 'bottom'
    },

    // --- PAGE 6: BACK OFFICE (1 STEP) ---
    {
        id: 'bo-panel',
        section: 'backoffice',
        targetId: 'tour-bo-panel',
        requiredView: 'backoffice',
        badgeTH: '⚙️ หน้าจัดการหลังบ้าน',
        badgeEN: '⚙️ Back Office',
        titleTH: 'จัดการพนักงาน สิทธิ์การเข้าถึง และช่องทางการตลาด',
        titleEN: 'Staff Management, Permissions & Marketing Channels',
        descTH: 'ศูนย์ควบคุมสำหรับผู้ดูแลระบบ แบ่งเป็นแท็บย่อย: 1.จัดการบัญชีพนักงาน (เพิ่มพนักงาน, ตั้งรหัสผ่าน, เปิด/ปิดสิทธิ์แต่ละเมนู, พักงาน) 2.จัดการช่องทางการตลาด (เพิ่ม/ลบช่องทาง) และ 3.คลังข้อมูลลูกค้าทั้งหมด',
        descEN: 'Admin control center with sub-tabs for Staff & Role Permissions, Marketing Source Channels, and Master Customer Database management.',
        tipTH: '💡 การปรับสิทธิ์หรือระงับพนักงานในหน้านี้ จะซิงค์ขึ้น Supabase Realtime และมีผลกับเครื่องของพนักงานทันที',
        tipEN: '💡 Role and permission updates sync in real time via Supabase across all active sessions.',
        position: 'bottom'
    },

    // --- PAGE 7: AUDIT LOGS (1 STEP) ---
    {
        id: 'logs-panel',
        section: 'audit-logs',
        targetId: 'tour-logs-panel',
        requiredView: 'audit-logs',
        badgeTH: '📜 หน้าประวัติการแก้ไข',
        badgeEN: '📜 Audit Logs',
        titleTH: 'ตรวจสอบประวัติการทำงานย้อนหลังทั้งหมด (Audit Trail)',
        titleEN: 'System-Wide Audit Trail & Activity Logs',
        descTH: 'บันทึกทุกการกระทำในระบบแบบละเอียด (ใคร ทำอะไร กับลูกค้าคนไหน เมื่อไหร่) เช่น การเพิ่มลูกค้า, การติ๊กติดตามรายวัน, การเปลี่ยนสถานะไลน์, การแก้ไขเบอร์โทร/โน้ต และการอัปโหลดยอดฝาก',
        descEN: 'Comprehensive activity log recording every creation, follow-up check, quick status change, note edit, and deposit match with timestamps.',
        tipTH: '💡 สามารถกรองดูเฉพาะพนักงาน เลือกหมวดหมู่กิจกรรม หรือกดดาวน์โหลดประวัติทั้งหมดเป็นไฟล์ CSV ได้ครับ',
        tipEN: '💡 Filter logs by staff member or action tag, or export the full log history to CSV.',
        position: 'bottom'
    },

    // --- PAGE 8: RECYCLE BIN (1 STEP) ---
    {
        id: 'recycle-panel',
        section: 'recycle-bin',
        targetId: 'system-recycle-bin-section',
        fallbackId: 'tour-recycle-wrapper',
        requiredView: 'recycle-bin',
        badgeTH: '🗑️ หน้าถังขยะระบบ',
        badgeEN: '🗑️ Recycle Bin',
        titleTH: 'ถังขยะระบบ & การกู้คืนข้อมูลภายใน 30 วัน',
        titleEN: 'System Recycle Bin & 1-Click Data Restore',
        descTH: 'ข้อมูลลูกค้าหรือบัญชีพนักงานที่ถูกลบ จะถูกเก็บรักษาไว้ในถังขยะนาน 30 วัน (Soft Delete) หากเผลอลบผิด สามารถสลับแท็บเลือกดูและกดปุ่ม "กู้คืน (Restore)" เพื่อนำข้อมูลกลับคืนสู่ระบบได้ในคลิกเดียว!',
        descEN: 'Deleted customers and staff accounts are safely retained for 30 days. Switch tabs between Staff and Customers and restore any record with 1 click.',
        tipTH: '🎉 จบครบทั้ง 8 หน้าเมนูของระบบแล้ว! คุณสามารถกดปุ่ม "💡 แนะนำการใช้งาน" ด้านบนเพื่อเปิดดูคู่มือของหน้าใดก็ได้ตลอดเวลาครับ',
        tipEN: '🎉 You have completed the full 8-module system tour! Re-open this guide anytime from the top bar.',
        position: 'bottom'
    }
];

export const TOUR_SECTIONS_MASTER = [
    { key: 'overview', labelTH: '🏠 ภาพรวม', labelEN: '🏠 Overview' },
    { key: 'agent', labelTH: '👥 ติดตามลูกค้า', labelEN: '👥 MC Agent' },
    { key: 'supervisor', labelTH: '📊 แดชบอร์ด', labelEN: '📊 Dashboard' },
    { key: 'upload-deposits', labelTH: '☁️ อัปโหลดยอด', labelEN: '☁️ Upload' },
    { key: 'new-customer', labelTH: '➕ เพิ่มลูกค้า', labelEN: '➕ Add Lead' },
    { key: 'audit', labelTH: '🛡️ ตรวจงาน', labelEN: '🛡️ Audit' },
    { key: 'backoffice', labelTH: '⚙️ หลังบ้าน', labelEN: '⚙️ BackOffice' },
    { key: 'audit-logs', labelTH: '📜 ประวัติ Log', labelEN: '📜 Logs' },
    { key: 'recycle-bin', labelTH: '🗑️ ถังขยะ', labelEN: '🗑️ Trash' }
];
