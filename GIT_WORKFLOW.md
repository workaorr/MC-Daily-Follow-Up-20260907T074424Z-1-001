# มาตรฐานการจัดการ Version Control (GitKraken + GitHub + Vercel)
**โปรเจกต์:** MC Daily Follow Up  
**ผู้ดูแลระบบ:** Aor (`workaorr`)  
**Production URL:** [https://mc-daily-follow-up-20260907t074424z-1-001.vercel.app](https://mc-daily-follow-up-20260907t074424z-1-001.vercel.app)

---

## 1. ภาพรวมการทำงาน (Architecture & Pipeline)

```
[ GitKraken Desktop บนเครื่อง ]
       │
       ├─► ทำงานบน Branch ย่อย (feat/xxx หรือ dev)
       │         │
       │         ▼ (Push)
       │    [ GitHub Repo: workaorr/... ]
       │         │
       │         ├─► Branch dev / feat ──► [ Vercel Preview URL ] (ทดสอบได้ทันที)
       │         │
       ▼ (Merge to master)
    [ Branch: master ] ──────────────────► [ Vercel Production URL ] (เว็บจริงอัปเดต)
```

1. **GitKraken (Local)**: จัดการไฟล์, แยกกิ่ง, ดูประวัติการแก้ไข และ Push โค้ดผ่าน UI สะดวก ไม่ต้องพิมพ์ Command Line
2. **GitHub (`workaorr`)**: ทำหน้าที่เป็น Central Repository เก็บรักษา Source Code และประวัติเวอร์ชันทั้งหมดอย่างปลอดภัย
3. **Vercel (CI/CD & Cloud Hosting)**:
   - **กิ่ง `master`**: เชื่อมต่อเป็น **Production** เมื่อใดที่ Push ขึ้นกิ่งนี้ เว็บไซต์จริงจะอัปเดตอัตโนมัติภายใน ~15-20 วินาที
   - **กิ่งอื่น ๆ (`dev`, `feat/...`)**: Vercel จะสร้าง **Preview Deployment URL** อัตโนมัติ เพื่อให้เปิดดูและตรวจงานก่อนนำขึ้นจริง

---

## 2. โครงสร้างกิ่ง (Branching Strategy)

| ชื่อกิ่ง (Branch) | บทบาทและหน้าที่ | Vercel Deployment Type |
| :--- | :--- | :--- |
| **`master`** | **Production (เว็บจริง):** ห้ามแก้โค้ดเสี่ยง ๆ บนกิ่งนี้โดยตรง โค้ดทุกอย่างต้องพร้อมใช้งาน | **Production Live URL** |
| **`dev`** | **Staging / รวมงาน:** กิ่งสำหรับทดสอบรวมฟีเจอร์ก่อนปล่อยขึ้น Production | **Preview Deployment** |
| **`feat/<ชื่อฟังก์ชัน>`** | **Feature:** แตกกิ่งออกจาก `dev` เมื่อจะทำฟังก์ชันใหม่ เช่น `feat/add-export-csv` | **Dedicated Preview URL** |
| **`fix/<ชื่อปัญหา>`** | **Hotfix / Bugfix:** สำหรับแก้ปัญหาเฉพาะจุด เช่น `fix/registration-popup` | **Dedicated Preview URL** |

---

## 3. มาตรฐานการตั้งชื่อ Commit (Conventional Commits)

ทุกครั้งที่ Commit ให้ขึ้นต้นด้วย Prefix ดังนี้ ตามด้วยเครื่องหมายโคลอน (`: `) และข้อความอธิบาย:

- **`feat:`** (Features) เพิ่มหน้าเว็บใหม่ หรือฟังก์ชันการทำงานใหม่
  - *ตัวอย่าง:* `feat: เพิ่มระบบ export ข้อมูลลูกค้าเป็นไฟล์ excel`
- **`fix:`** (Bug Fixes) แก้ไขข้อผิดพลาดของระบบ
  - *ตัวอย่าง:* `fix: แก้ไขชื่อตัวแปรที่ทำให้ยอดฝากไม่แสดงผล`
- **`style:`** (Styling & Design) ปรับดีไซน์ สี CSS ฟอนต์ หรือ Layout (ไม่มีผลกับ logic)
  - *ตัวอย่าง:* `style: ปรับสีโลโก้และแถบเมนูหลักเป็นโทนเขียวมิ้นต์ออกเหลือง`
- **`refactor:`** (Code Refactoring) ปรับโครงสร้างโค้ดให้อ่านง่ายและทำงานเร็วขึ้น
  - *ตัวอย่าง:* `refactor: แยกฟังก์ชันคำนวณยอดเงินให้อ่านง่ายขึ้น`
- **`docs:`** (Documentation) เขียนหรืออัปเดตเอกสารคู่มือ
  - *ตัวอย่าง:* `docs: เพิ่มคู่มือการใช้งาน GitKraken ประจำวัน`
- **`chore:`** (Maintenance) จัดการไฟล์โครงสร้าง ไฟล์ config หรืออัปเดต `.gitignore`
  - *ตัวอย่าง:* `chore: ปรับปรุง .gitignore และนำไฟล์ขยะออกจากการติดตาม`

---

## 4. ขั้นตอนการทำงานประจำวันบน GitKraken (Daily SOP)

### สเต็ปที่ 1: ดึงโค้ดล่าสุด (Pull)
- ก่อนเริ่มทำงานทุกวัน ให้มองที่แถบเมนูด้านบนของ GitKraken แล้วคลิกปุ่ม **Pull** (ลูกศรชี้ลง ⬇️) เพื่อให้แน่ใจว่าเครื่องของเรามีโค้ดล่าสุดจาก GitHub เสมอ

### สเต็ปที่ 2: เลือกหรือสร้าง Branch สำหรับทำงาน
- **หากทำงานทั่วไป/ทดสอบ:** ดับเบิลคลิกที่กิ่ง `dev`
- **หากทำฟังก์ชันใหม่:**
  1. คลิกขวาที่กิ่ง `dev`
  2. เลือก **Create branch here**
  3. ตั้งชื่อกิ่ง เช่น `feat/new-customer-filter` แล้วกด Enter

### สเต็ปที่ 3: ตรวจสอบและบันทึกการเปลี่ยนแปลง (Stage & Commit)
1. เมื่อแก้ไขโค้ดเสร็จ ในแถบขวามือของ GitKraken จะปรากฏรายชื่อไฟล์ที่แก้ไขในส่วน **Unstaged Files**
2. คลิกปุ่มสีเขียว **"Stage all changes"** (หรือคลิกที่เครื่องหมาย `+` เพื่อเลือกเฉพาะไฟล์ที่ต้องการ)
3. ด้านล่างขวา ในช่อง **Summary (Commit message)** ให้พิมพ์ตามรูปแบบมาตรฐาน เช่น:
   ```
   feat: ปรับปรุงแบบฟอร์มเพิ่มข้อมูลลูกค้าใหม่
   ```
4. คลิกปุ่มสีเขียว **"Commit changes to X files"**

### สเต็ปที่ 4: ส่งโค้ดขึ้นคลาวด์ (Push)
- คลิกปุ่ม **Push** (ลูกศรชี้ขึ้น ⬆️) ด้านบนของ GitKraken
- GitHub จะได้รับโค้ดใหม่ และ Vercel จะเริ่มกระบวนการ Deploy ทันที

### สเต็ปที่ 5: ปล่อยขึ้นเว็บจริง (Merge to Production)
เมื่อทดสอบบน Vercel Preview URL เรียบร้อยแล้ว:
1. ใน GitKraken ดับเบิลคลิกที่กิ่ง `master` เพื่อสลับมากิ่งจริง
2. ลากกิ่ง `dev` (หรือกิ่งฟีเจอร์) มาวางทับกิ่ง `master` แล้วเลือก **Merge dev into master**
3. คลิกปุ่ม **Push** (ลูกศรชี้ขึ้น ⬆️) เพื่อส่งขึ้น Production จริง

---

## 5. กฎความปลอดภัยที่ต้องปฏิบัติตาม (Security Rules)

1. **ห้ามพิมพ์ Token หรือรหัสผ่านลงในโค้ด**:
   - หากจำเป็นต้องใช้ Key ให้เก็บใน `.env` เสมอ
   - ไฟล์ `.env` ถูกตั้งค่าให้อยู่ใน `.gitignore` แล้ว จะไม่ถูกส่งขึ้น GitHub
2. **ห้าม Commit ไฟล์ Binary ขนาดใหญ่**:
   - ไฟล์ `.exe`, `.zip`, หรือโฟลเดอร์สำรองข้อมูล ให้แยกเก็บนอก Repository
3. **รักษาไฟล์ `.gitignore`**:
   - หากพบว่ามีไฟล์ระบบแปลกปลอม เช่น `Thumbs.db` หรือไฟล์ Log ให้เพิ่มลงใน `.gitignore` ทันที
