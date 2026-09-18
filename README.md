# MC Daily Follow Up System 🎧

ระบบบริหารจัดการและติดตามสถานะงานประจำวันสำหรับทีม MC (MC Daily Follow Up)

- **Production URL:** [https://mc-daily-follow-up-20260907t074424z-1-001-aorr.vercel.app](https://mc-daily-follow-up-20260907t074424z-1-001-aorr.vercel.app)
- **GitHub Repository:** [workaorr/MC-Daily-Follow-Up-20260907T074424Z-1-001](https://github.com/workaorr/MC-Daily-Follow-Up-20260907T074424Z-1-001)
- **Deployment Platform:** Vercel (Production branch: `master`)

---

## 🧭 โครงสร้างของโปรเจกต์ (System Routes)

| เส้นทาง (Route) | ฟังก์ชันงาน | คำอธิบาย |
| :--- | :--- | :--- |
| `/` หรือ `index.html` | เมนูหลักและภาพรวม | หน้าหลักของระบบ พร้อมระบบนำทางแบบ SPA |
| `/new-customer` | บันทึกข้อมูลลูกค้าใหม่ | ฟอร์มบันทึกข้อมูลลูกค้าใหม่ พร้อม Popup ยืนยัน |
| `/agent` | พื้นที่ทำงานของ Agent | จัดการงานและคิวติดตามผลรายวัน |
| `/supervisor` | หน้างานหัวหน้างาน | ตรวจสอบและอนุมัติรายการงาน |
| `/reports` | รายงานและสถิติ | สรุปข้อมูลตัวเลขและกราฟสถิติประจำวัน |
| `/audit` / `/audit-logs` | บันทึกการตรวจสอบ | ประวัติการแก้ไขและการตรวจสอบสิทธิ์ |
| `/backoffice` | ระบบหลังบ้าน | การตั้งค่าระบบและการจัดการผู้ใช้ |
| `/upload-deposits` | อัปโหลดรายการเงินฝาก | นำเข้าและกระทบยอดรายการเงินฝาก |

---

## 🛠️ คู่มือการจัดการ Version Control

โปรเจกต์นี้ใช้มาตรฐานการทำงานร่วมกันระหว่าง **GitKraken + GitHub + Vercel**  
อ่านคู่มือมาตรฐานการทำงานฉบับเต็มได้ที่ 📄 [GIT_WORKFLOW.md](./GIT_WORKFLOW.md)

### สรุปกิ่งหลัก (Branches)
- `master`: Production Live เว็บจริง (Protected)
- `dev`: Staging / Preview สำหรับทดสอบก่อนขึ้นจริง
- `feat/*`: กิ่งฟีเจอร์สำหรับพัฒนาฟังก์ชันใหม่แยกอิสระ

### สรุป Commit Convention
- `feat:` เพิ่มหน้าหรือฟังก์ชันใหม่
- `fix:` แก้ไขข้อผิดพลาดหรือบั๊ก
- `style:` ปรับแต่ง UI, สี, ฟอนต์ หรือเลย์เอาต์
- `refactor:` จัดโครงสร้างโค้ดใหม่
- `docs:` อัปเดตเอกสารคู่มือ
- `chore:` จัดการไฟล์ระบบและ config
