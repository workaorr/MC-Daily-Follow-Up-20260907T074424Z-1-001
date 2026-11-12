/**
 * Structured Quick User Manual & SOP Guides mapped directly to Left Sidebar menus.
 * Used by QuickManualModal with dynamic role/permission filtering and TH/EN support.
 */

export const QUICK_MANUAL_CATEGORIES = [
    {
        id: 'supervisor',
        viewMode: 'supervisor',
        permissionKey: 'canDashboard',
        accent: '#6366f1',
        badge: '1',
        title: {
            TH: 'แดชบอร์ดสรุป (Supervisor)',
            EN: 'Supervisor Dashboard'
        },
        subtitle: {
            TH: 'ภาพรวมผลงานทีม กราฟแนวโน้มรายวัน และเป้าหมายรายบุคคล',
            EN: 'Team overview, daily performance trends, and individual targets'
        },
        purpose: {
            TH: 'ใช้ติดตามยอดฝากรวมของทีมแบบเรียลไทม์ วิเคราะห์แนวโน้มการทัก-สมัคร-ฝากรายวัน และเช็กความคืบหน้าเทียบเป้าหมายรายบุคคล',
            EN: 'Monitor overall team deposits in real time, analyze daily chat-register-deposit trends, and track progress against monthly targets.'
        },
        steps: {
            TH: [
                'ดูกราฟแนวโน้มผลงานรายวัน (สลับมุมมองได้ 3 แบบ: ทัก/สมัคร/ฝาก, ยอดฝากรายวัน, ติ๊กติดตามรายวัน) แล้วเอาเมาส์ชี้แท่งกราฟเพื่อดูสรุปรายวันแบบครบถ้วน',
                'เช็กกราฟเปรียบเทียบยอดฝากจริง vs เป้าหมายรายบุคคล เพื่อดู % ความสำเร็จของพนักงานแต่ละคน พร้อมอันดับ Top 3 (Top Closers)',
                'ตรวจ 5-Stage Conversion Funnel และอันดับช่องทางสมัคร เพื่อหาจุดที่ลูกค้าหลุดมากที่สุดและช่องทางที่ปิดยอดได้ดีที่สุด'
            ],
            EN: [
                'Use the Daily Trend Chart (switch tabs: Chat/Register/Deposit, Daily Deposit, Follow-up Ticks) and hover bars to inspect full daily breakdowns.',
                'Check the Actual Deposit vs Individual Target chart to review each agent progress percentage and Top 3 Closers.',
                'Review the 5-Stage Conversion Funnel and Top Registration Channels to identify drop-off points and top-performing sources.'
            ]
        },
        tip: {
            TH: 'เลือกเดือนที่มุมขวาบนเพื่อย้อนดูสถิติของเดือนก่อนหน้าเปรียบเทียบกับเดือนปัจจุบันได้ทันที',
            EN: 'Use the month selector at the top right to compare historical performance against the current month.'
        },
        supervisorNote: {
            TH: 'สิทธิ์หัวหน้างาน: กดปุ่ม "ตั้งเป้ารายคน" บนการ์ดเปรียบเทียบเป้าหมายเพื่อกำหนดหรือปรับเป้ายอดฝากประจำเดือนของพนักงานทุกคนได้ทันที',
            EN: 'Supervisor only: Click "Set Targets" on the comparison card to configure or adjust monthly deposit targets for each agent.'
        }
    },
    {
        id: 'agent',
        viewMode: 'agent',
        permissionKey: 'canFollowUp',
        accent: '#0ea5e9',
        badge: '2',
        title: {
            TH: 'การติดตามลูกค้า (MC Agent)',
            EN: 'Customer Follow-Up (MC Agent)'
        },
        subtitle: {
            TH: 'คิวงานตามลูกค้าประจำวัน ติ๊กติดตาม 10 วัน และอัปเดตสถานะ',
            EN: 'Daily customer follow-up table, 10-day tracking, and status updates'
        },
        purpose: {
            TH: 'หน้าทำงานหลักสำหรับพนักงาน MC ใช้จัดการรายชื่อลูกค้าที่รับผิดชอบ ติ๊กประวัติการติดตาม และบันทึกผลการคุยแต่ละวัน',
            EN: 'Primary daily workspace for MC agents to manage assigned customers, mark follow-up days, and log conversation notes.'
        },
        steps: {
            TH: [
                'ใช้ช่องค้นหาหรือตัวกรอง (เช่น ยังไม่ฝาก / สมัครแล้ว / ค้นหาจากชื่อหรือยูสเซอร์) เพื่อเรียงลำดับคิวที่ต้องทักตามในวันนั้น',
                'กดติ๊กช่องติดตามรายวัน (Day 1 - Day 10) หลังทักตามลูกค้าเสร็จ พร้อมบันทึกหมายเหตุสำคัญเพื่อให้จำบริบทได้เวลาตามต่อ',
                'อัปเดตสถานะลูกค้าเป็น "สมัครแล้ว" หรือ "ฝากแล้ว" และกดแก้ไขข้อมูลได้ทันทีเมื่อลูกค้าแจ้งข้อมูลเพิ่มเติม'
            ],
            EN: [
                'Use search and status filters (e.g., Not Deposited, Registered, name/username lookup) to prioritize your daily follow-up queue.',
                'Check off the daily follow-up box (Day 1 - Day 10) after contacting the customer and record clear notes for the next touchpoint.',
                'Update customer status to Registered or Deposited, or edit profile details whenever new information arrives.'
            ]
        },
        tip: {
            TH: 'เน้นตามกลุ่มที่ "สมัครแล้วแต่ยังไม่ฝาก" ก่อนทุกเช้า เพราะเป็นกลุ่มที่มีโอกาสปิดยอดฝากได้เร็วที่สุด',
            EN: 'Prioritize "Registered but Not Yet Deposited" leads each morning for the fastest conversion wins.'
        }
    },
    {
        id: 'upload-deposits',
        viewMode: 'upload-deposits',
        permissionKey: 'always',
        accent: '#10b981',
        badge: '3',
        title: {
            TH: 'อัปโหลดธุรกรรมรายวัน',
            EN: 'Upload Daily Deposits'
        },
        subtitle: {
            TH: 'นำเข้ายอดฝากเข้าระบบ จับคู่ยูสเซอร์และพนักงานอัตโนมัติ',
            EN: 'Import daily deposit records and auto-match users with agents'
        },
        purpose: {
            TH: 'นำเข้าข้อมูลรายการฝากเงินประจำวันเพื่อให้ระบบจับคู่ยอดฝากเข้ากับลูกค้าและคำนวณผลงานพนักงานแบบแม่นยำ',
            EN: 'Import daily deposit transactions so the system automatically matches amounts to customers and credits the responsible agent.'
        },
        steps: {
            TH: [
                'อัปโหลดไฟล์ธุรกรรม (.xlsx / .csv) หรือวางข้อมูลรายการฝากประจำวันตามคอลัมน์ที่กำหนด',
                'ตรวจหน้าพรีวิวเพื่อเช็กการจับคู่ชื่อยูสเซอร์ วันที่ฝาก จำนวนเงิน และพนักงาน MC ผู้รับผิดชอบ',
                'กดยืนยันนำเข้า ระบบจะปรับสถานะลูกค้าเป็น "ฝากแล้ว" และอัปเดตตัวเลขบน Dashboard ทันที'
            ],
            EN: [
                'Upload your transaction file (.xlsx / .csv) or paste daily deposit rows matching the required format.',
                'Inspect the validation preview to verify username matching, deposit date, amount, and assigned MC agent.',
                'Confirm import to automatically mark matched customers as Deposited and refresh Dashboard metrics.'
            ]
        },
        tip: {
            TH: 'ควรตรวจสอบแถวที่ขึ้นเตือน (Unmatched / ซ้ำ) ในพรีวิวก่อนกดยืนยันทุกครั้ง เพื่อไม่ให้ยอดฝากตกหล่นหรือซ้ำซ้อน',
            EN: 'Always review unmatched or duplicate warnings in the preview table before confirming the import.'
        }
    },
    {
        id: 'new-customer',
        viewMode: 'new-customer',
        permissionKey: 'canNewCustomer',
        accent: '#8b5cf6',
        badge: '4',
        title: {
            TH: 'เพิ่มลูกค้าใหม่',
            EN: 'Add New Customer'
        },
        subtitle: {
            TH: 'บันทึกลูกค้าใหม่ที่ทักเข้ามา ระบุช่องทาง และตรวจข้อมูลซ้ำ',
            EN: 'Register incoming leads, set source channels, and prevent duplicates'
        },
        purpose: {
            TH: 'ใช้บันทึกข้อมูลลูกค้าใหม่ที่ทักเข้ามาในแต่ละวัน เพื่อนำไปนับสถิติทักรายวันและส่งเข้าตารางติดตามของพนักงาน',
            EN: 'Record new incoming customer inquiries so they count toward daily chat stats and enter the follow-up workflow.'
        },
        steps: {
            TH: [
                'กรอกข้อมูลลูกค้าใหม่ เช่น ชื่อลูกค้า/ชื่อไลน์ ยูสเซอร์ (ถ้าสมัครแล้ว) เบอร์ติดต่อ และช่องทางที่ลูกค้าทักเข้ามา',
                'เลือกสถานะเริ่มต้นของลูกค้า (เช่น ทักแล้ว / สมัครแล้ว) และวันที่ทักเข้ามาให้ตรงตามจริง',
                'เช็กการแจ้งเตือนกรณีระบบพบข้อมูลซ้ำกับที่มีอยู่แล้ว จากนั้นกดบันทึกเพื่อเพิ่มเข้าคิวติดตาม'
            ],
            EN: [
                'Fill in customer details including name/Line ID, username (if registered), phone number, and acquisition channel.',
                'Select the accurate initial status (e.g., Chatted or Registered) and inquiry date.',
                'Check any duplicate-detection alerts before saving the customer into the active follow-up list.'
            ]
        },
        tip: {
            TH: 'การเลือก "ช่องทาง" ให้ตรงจริงตั้งแต่ตอนเพิ่มลูกค้า จะช่วยให้รายงานอันดับช่องทางใน Dashboard แม่นยำมากยิ่งขึ้น',
            EN: 'Selecting the exact acquisition channel during creation keeps the Dashboard channel ranking report accurate.'
        },
        supervisorNote: {
            TH: 'สิทธิ์หัวหน้างาน: สามารถใช้โหมด "นำเข้าจำนวนมาก (Bulk Import)" ในหน้านี้เพื่อนำเข้าไฟล์รายชื่อลูกค้าและกระจายให้พนักงานหลายคนพร้อมกันได้',
            EN: 'Supervisor only: You can use Bulk Import in this view to upload customer spreadsheets and assign them across multiple agents.'
        }
    },
    {
        id: 'audit',
        viewMode: 'audit',
        permissionKey: 'canAudit',
        accent: '#f59e0b',
        badge: '5',
        title: {
            TH: 'ตรวจสอบงานรายวัน (Supervisor Audit)',
            EN: 'Daily Audit (Supervisor Audit)'
        },
        subtitle: {
            TH: 'เช็กวินัยการติดตามลูกค้า ตรวจงานตกหล่น และคุณภาพทีม',
            EN: 'Review daily follow-up consistency, missed leads, and team QA'
        },
        purpose: {
            TH: 'ใช้ตรวจเช็กย้อนหลังว่าพนักงานแต่ละคนติดตามลูกค้าครบตามรอบหรือไม่ และมีลูกค้ารายใดค้างการติดต่อเกินกำหนด',
            EN: 'Audit whether agents are following up consistently on schedule and spot customers who are overdue for contact.'
        },
        steps: {
            TH: [
                'เลือกพนักงานและช่วงวันที่ต้องการตรวจสอบ เพื่อดูจำนวนลูกค้าที่ถูกทักตามจริงในแต่ละวัน',
                'ตรวจหาเคสที่ค้างติดตามนานหรือยังไม่มีบันทึกความคืบหน้า เพื่อแจ้งเตือนหรือช่วยโค้ชชิ่งพนักงาน',
                'ใช้สรุปผลหน้า Audit ร่วมกับอัตราสำเร็จ (MC%) เพื่อประเมินคุณภาพการดูแลลูกค้าของทีม'
            ],
            EN: [
                'Filter by agent and date range to see how many follow-ups were completed each day.',
                'Spot stalled leads or missing notes early so you can coach agents or reassign workload.',
                'Combine audit metrics with MC conversion rates to evaluate overall follow-up quality.'
            ]
        },
        tip: {
            TH: 'ตรวจหน้า Audit สั้นๆ ช่วงบ่ายของทุกวัน ช่วยกระตุ้นให้ทีมไม่ลืมติ๊กติดตามก่อนเลิกงาน',
            EN: 'A quick afternoon audit check helps remind the team to complete all follow-up logs before shift end.'
        }
    },
    {
        id: 'backoffice',
        viewMode: 'backoffice',
        permissionKey: 'canBackOffice',
        accent: '#ec4899',
        badge: '6',
        title: {
            TH: 'จัดการหลังบ้าน (Back Office)',
            EN: 'Back Office Admin'
        },
        subtitle: {
            TH: 'จัดการบัญชีพนักงาน สิทธิ์รายเมนู และตั้งค่าหลักของระบบ',
            EN: 'Manage staff accounts, menu permissions, and core system settings'
        },
        purpose: {
            TH: 'ศูนย์ควบคุมหลักสำหรับผู้ดูแลระบบ ใช้สร้างบัญชีพนักงาน กำหนดรหัสผ่าน ตั้งสิทธิ์เข้าถึงแต่ละเมนู และจัดการตัวเลือกช่องทาง',
            EN: 'Admin control center for creating staff accounts, resetting passcodes, configuring per-menu permissions, and managing channels.'
        },
        steps: {
            TH: [
                'เพิ่มพนักงานใหม่หรือแก้ไขข้อมูลพนักงาน พร้อมกำหนดรหัส PIN/Passcode และบทบาท (Agent / Supervisor)',
                'เปิด-ปิดสิทธิ์รายเมนูของพนักงานแต่ละคน (เช่น Dashboard, ติดตามลูกค้า, เพิ่มลูกค้า, Audit, Back Office)',
                'จัดการรายชื่อช่องทางสมัคร (Sources) หรือพักบัญชีพนักงาน (Archive) เมื่อพนักงานไม่ได้ใช้งานแล้ว'
            ],
            EN: [
                'Add or edit staff profiles, set login passcodes, and assign roles (Agent / Supervisor).',
                'Toggle granular per-menu permissions for each user (Dashboard, Follow-Up, New Customer, Audit, Back Office).',
                'Maintain acquisition channel lists or archive inactive staff accounts safely without breaking history.'
            ]
        },
        tip: {
            TH: 'หากมีพนักงานลาออก แนะนำให้ใช้การ Archive แทนการลบถาวร เพื่อให้ยอดฝากและประวัติลูกค้าเดิมยังคงแสดงในรายงานได้ครบ',
            EN: 'Archive departing staff rather than hard-deleting them so historical deposits and KPI stats remain intact.'
        }
    },
    {
        id: 'audit-logs',
        viewMode: 'audit-logs',
        permissionKey: 'canBackOffice',
        accent: '#06b6d4',
        badge: '7',
        title: {
            TH: 'ประวัติการแก้ไข (Audit Logs)',
            EN: 'Audit Logs & History'
        },
        subtitle: {
            TH: 'ตรวจสอบไทม์ไลน์ย้อนหลังทุกการเพิ่ม แก้ไข ย้าย และลบข้อมูล',
            EN: 'Full activity timeline of creations, edits, reassignments, and deletions'
        },
        purpose: {
            TH: 'บันทึกความเคลื่อนไหวทุกอย่างในระบบแบบเรียงตามเวลา เพื่อความโปร่งใสและใช้ตรวจสอบย้อนหลังเมื่อพบข้อมูลผิดปกติ',
            EN: 'Immutable chronological log of system changes for accountability and troubleshooting data discrepancies.'
        },
        steps: {
            TH: [
                'ค้นหาประวัติจากชื่อผู้ทำรายการ ประเภทเหตุการณ์ หรือคำค้นหาที่เกี่ยวข้องกับลูกค้า/พนักงาน',
                'ตรวจรายละเอียดค่าเดิมเทียบค่าใหม่ (Before / After) รวมถึงวันเวลาที่มีการเปลี่ยนแปลง',
                'ใช้ยืนยันความถูกต้องกรณีมีการเปลี่ยนผู้ดูแลลูกค้า แก้ไขยอดฝาก หรือลบรายการออกจากหน้าหลัก'
            ],
            EN: [
                'Filter logs by actor name, action type, or keyword related to a customer or staff member.',
                'Inspect exact timestamps and change details to verify what was modified and by whom.',
                'Use logs to resolve ownership disputes, deposit adjustments, or accidental edits.'
            ]
        },
        tip: {
            TH: 'หากสงสัยว่ายอดฝากหรือรายชื่อลูกค้าเปลี่ยนไปจากเมื่อวาน ให้เริ่มค้นหาชื่อยูสเซอร์ในหน้า Audit Logs เป็นอันดับแรก',
            EN: 'Whenever a customer record or deposit value looks unexpected, search the username in Audit Logs first.'
        }
    },
    {
        id: 'recycle-bin',
        viewMode: 'recycle-bin',
        permissionKey: 'canBackOffice',
        accent: '#ef4444',
        badge: '8',
        title: {
            TH: 'ถังขยะระบบ (Recycle Bin)',
            EN: 'System Recycle Bin'
        },
        subtitle: {
            TH: 'พักข้อมูลที่ถูกลบหรือ Archive ชั่วคราว กู้คืนได้ก่อนลบถาวร',
            EN: 'Temporary holding area for deleted records with safe restore support'
        },
        purpose: {
            TH: 'ป้องกันการเผลอลบข้อมูลสำคัญ โดยเก็บลูกค้าที่ถูกลบและพนักงานที่ถูก Archive ไว้ให้ตรวจสอบหรือกู้คืนได้',
            EN: 'Safeguard against accidental deletion by retaining soft-deleted customers and archived staff for review or recovery.'
        },
        steps: {
            TH: [
                'สลับดูระหว่างแท็บ "ลูกค้าที่ถูกลบ" และ "พนักงานที่ถูกพักบัญชี (Archived)" ตามประเภทข้อมูลที่ต้องการ',
                'กดปุ่ม "กู้คืน (Restore)" เพื่อนำข้อมูลกลับเข้าสู่ระบบงานปกติทันทีโดยประวัติเดิมยังอยู่ครบ',
                'กด "ลบถาวร" เฉพาะข้อมูลซ้ำหรือข้อมูลทดสอบที่มั่นใจว่าไม่ต้องการเก็บสถิติย้อนหลังแล้ว'
            ],
            EN: [
                'Switch between Deleted Customers and Archived Staff tabs depending on what you want to review.',
                'Click Restore to bring any record back into active circulation with all history preserved.',
                'Only use Permanent Delete for duplicate or test data you are certain you no longer need.'
            ]
        },
        tip: {
            TH: 'ตัวเลขสีแดงข้างเมนูถังขยะแสดงจำนวนรายการทั้งหมดที่รอตรวจสอบหรือกู้คืนอยู่ในขณะนี้',
            EN: 'The red badge on the Recycle Bin menu shows the current total count of archived and deleted items.'
        }
    },
    {
        id: 'daily-checklist',
        viewMode: null,
        permissionKey: 'always',
        accent: '#14b8a6',
        badge: '✓',
        isChecklist: true,
        title: {
            TH: 'เช็กลิสต์งานประจำวัน (Routine)',
            EN: 'Daily Workflow Checklist'
        },
        subtitle: {
            TH: 'ลำดับการทำงานแนะนำในแต่ละวันเพื่อให้ไม่พลาดทั้งยอดฝากและการติดตาม',
            EN: 'Recommended daily routine so no deposit or follow-up slips through'
        },
        purpose: {
            TH: 'สรุปขั้นตอนปฏิบัติงานตามช่วงเวลา เช้า-ระหว่างวัน-ก่อนเลิกงาน แยกตามบทบาทเพื่อให้ทุกคนทำงานไปในทิศทางเดียวกัน',
            EN: 'Chronological daily checklist (Morning, Midday, End-of-Shift) tailored to keep daily operations consistent.'
        },
        steps: {
            TH: [
                '🌅 ช่วงเช้า: เปิดหน้า "การติดตามลูกค้า" เช็กกลุ่มสมัครแล้วแต่ยังไม่ฝากเป็นอันดับแรก และเปิด "เพิ่มลูกค้าใหม่" เมื่อมีทักเข้ามา',
                '☀️ ระหว่างวัน: อัปเดตบันทึกการคุย + ติ๊กติดตาม Day 1-10 ทันทีหลังจบเคส และอัปโหลดรายการฝากเมื่อได้รับยอด',
                '🌆 ก่อนเลิกงาน: ตรวจทานว่ามีลูกค้าทักใหม่หรือยอดฝากที่ยังไม่ได้บันทึกตกค้างหรือไม่ เพื่อปิดยอดประจำวันให้ครบ'
            ],
            EN: [
                '🌅 Morning: Open Customer Follow-Up to contact Registered-but-Not-Deposited leads first, and log new chats in Add New Customer.',
                '☀️ Midday: Log conversation notes and Day 1-10 follow-up ticks right after each touchpoint, and upload confirmed deposits.',
                '🌆 End of Shift: Double-check that all daily chats, ticks, and deposit records are updated before wrapping up.'
            ]
        },
        tip: {
            TH: 'การทำงานตามลำดับนี้ทุกวันจะช่วยให้กราฟแนวโน้มรายวันใน Dashboard สะท้อนผลงานจริงของทีมได้แม่นยำ 100%',
            EN: 'Following this routine keeps the Dashboard daily trend charts 100% aligned with actual team performance.'
        },
        supervisorNote: {
            TH: 'เช็กลิสต์หัวหน้างาน: เช้าดู Dashboard เทียบเป้าหมายทีม → บ่ายเช็กหน้า Supervisor Audit หาเคสตกหล่น → เย็นตรวจความเรียบร้อยยอดอัปโหลดและเป้าหมายรายบุคคล',
            EN: 'Supervisor Routine: Morning Dashboard target pacing check → Afternoon Audit review for stalled leads → Evening deposit sync & KPI wrap-up.'
        }
    }
];
