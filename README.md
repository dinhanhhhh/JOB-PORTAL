# 🚀 JOB PORTAL - Hệ Thống Tìm Việc Làm

> **Full-stack web application** kết nối người tìm việc và nhà tuyển dụng. Xây dựng với **MERN Stack** (MongoDB, Express, React, Node.js) + **Next.js** + **TypeScript**.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.1-lightgrey)](https://expressjs.com/)

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng Chính](#-tính-năng-chính)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Yêu Cầu Hệ Thống](#-yêu-cầu-hệ-thống)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Cấu Hình Environment](#-cấu-hình-environment)
- [Chạy Ứng Dụng](#-chạy-ứng-dụng)
- [Seed Dữ Liệu Mẫu](#-seed-dữ-liệu-mẫu)
- [API Documentation](#-api-documentation)
- [Testing với Postman](#-testing-với-postman)
- [Deployment](#-deployment)
- [Giải Thích Thuật Ngữ](#-giải-thích-thuật-ngữ)
- [Tài Khoản Demo](#-tài-khoản-demo)
- [Troubleshooting](#-troubleshooting)
- [Đóng Góp](#-đóng-góp)
- [Tài Liệu Tham Khảo](#-tài-liệu-tham-khảo)

---

## 🎯 Giới Thiệu

**Job Portal** là nền tảng tuyển dụng trực tuyến toàn diện, giúp kết nối người tìm việc với nhà tuyển dụng một cách hiệu quả và chuyên nghiệp.

### 🎭 3 Vai Trò Trong Hệ Thống

#### 👨‍💼 **Seeker (Người Tìm Việc)**
- ✅ Tạo và quản lý hồ sơ cá nhân (CV, kỹ năng, kinh nghiệm)
- ✅ Tìm kiếm công việc với bộ lọc đa dạng (địa điểm, mức lương, kỹ năng)
- ✅ Ứng tuyển với CV và cover letter
- ✅ Theo dõi trạng thái đơn ứng tuyển
- ✅ Sử dụng AI để tạo cover letter tự động

#### 🏢 **Employer (Nhà Tuyển Dụng)**
- ✅ Tạo và quản lý thông tin công ty
- ✅ Đăng tin tuyển dụng với mô tả chi tiết
- ✅ Xem danh sách ứng viên theo từng vị trí
- ✅ Cập nhật trạng thái đơn ứng tuyển (duyệt/từ chối)
- ✅ Sử dụng AI để tạo job description và tóm tắt ứng viên

#### 👨‍💻 **Admin (Quản Trị Viên)**
- ✅ Quản lý users, jobs, companies, applications
- ✅ Xem dashboard thống kê toàn hệ thống
- ✅ Kiểm duyệt và xóa nội dung vi phạm

### 🌟 Điểm Nổi Bật

- 🔐 **Bảo mật cao** với JWT + HTTP-only cookies
- 🤖 **Tích hợp AI** Google Gemini API
- ☁️ **Cloud storage** với Cloudinary
- 📱 **Responsive design** với TailwindCSS
- 🚀 **RESTful API** chuẩn với TypeScript
- 🛡️ **Rate limiting** chống spam cho cả Auth (login/register) và toàn bộ AI endpoints
- ✅ **Input validation** với Zod schema, kiểm tra ObjectId hợp lệ & regex tìm kiếm tiếng Việt không dấu an toàn

### 🔧 Nâng Cấp Gần Đây (Chu kỳ 1 — Vòng 1 & Vòng 2)
- 🔐 **Bảo mật & Auth:** Loại bỏ fallback JWT secret cứng, chuẩn hóa email lowercase/trim, chặn Google OAuth cho tài khoản bị vô hiệu hóa (`isActive: false`), và áp dụng `authRateLimit` (20 req/15p) cho `/api/auth/login` & `/api/auth/register`.
- 🤖 **Bảo vệ AI đầy đủ:** Áp dụng `aiRateLimit` cho cả `/api/applications/generate-cover-letter` và `/api/applications/:applicationId/summarize`.
- 🔍 **Tìm kiếm & Sắp xếp Jobs:** Sửa word boundary regex hỗ trợ tiếng Việt có dấu, escape ký tự đặc biệt (`C++`, `.NET`), hỗ trợ sắp xếp (`sort`: `newest` | `oldest` | `salary_desc` | `salary_asc`) và lọc theo công ty (`companyId`).
- 📄 **Ứng tuyển & Rút đơn:** Hỗ trợ Seeker rút đơn đang chờ (`DELETE /api/applications/:applicationId`), sửa lỗi N+1 query khi xem ứng viên, dọn file tạm upload và cascade xóa applications khi xóa job.
- 🏢 **Company & Admin:** Bổ sung `location`, `industry`, `size` cho Company; nâng cấp Admin filter tìm kiếm/trạng thái jobs và ứng tuyển theo tên job/seeker.

### 🎨 Nâng Cấp Giao Diện & Trải Nghiệm (Chu kỳ 2 — Vòng 3 & Vòng 4)
- 🔔 **Hệ thống Toast & ConfirmDialog toàn cục:** Tạo `ToastProvider` tự động dọn timer an toàn & kẹp biên viewport, cùng `ConfirmDialog` chuẩn hóa xác nhận thao tác quan trọng.
- 🔐 **Auth UX & Bảo mật Client:** Nâng cấp trang Đăng nhập/Đăng ký với toggle hiện/ẩn mật khẩu, xác nhận mật khẩu, hiển thị lỗi OAuth & lỗi server qua banner + Toast, kiểm tra an toàn `redirect` chống open-redirect, sửa FormData API qua `apiPostForm` hỗ trợ auto-refresh token.
- 📱 **Mobile Navbar & Error Pages:** Thêm menu hamburger responsive cho màn hình hẹp (360px+), sửa lỗi CSS `oklch(var(--...))` bằng `color-mix(in oklch, ...)`, xử lý sạch `react-hooks/set-state-in-effect` ở `AuthProvider`/`CTABanner`, thêm `error.tsx` và nâng cấp `not-found.tsx` song ngữ.

### 🚀 Nâng Cấp Trải Nghiệm Tìm Kiếm & Ứng Tuyển (Chu kỳ 3 — Vòng 5 & Vòng 6)
- 🔍 **Tìm kiếm & Bộ lọc nâng cao:** Sửa lỗi highlight regex `/g` `lastIndex` bỏ sót từ khóa lặp lại, thêm lọc địa điểm (debounce 350ms), sắp xếp (`newest`/`oldest`/`salary_desc`/`salary_asc`), số lượng mỗi trang (6/9/12), và Active Filter Chips dễ gỡ từng bộ lọc.
- 🔖 **Lưu việc làm (Bookmarks):** Tạo `useSavedJobs` (`useSyncExternalStore` + `localStorage`) cho phép lưu/bỏ lưu công việc và chuyển nhanh sang tab **Việc đã lưu** trên trang chủ và trang chi tiết.
- 📄 **Trang chi tiết công việc & AI Cover Letter:** Hiển thị banner khi tin đã đóng, nhận diện tự động đơn đã nộp & CV sẵn có trong hồ sơ, tích hợp nút **Tạo thư giới thiệu bằng AI** (giới hạn an toàn 1000 ký tự), validate tệp PDF/DOC/DOCX <= 5MB, chia sẻ liên kết, và gợi ý **Việc làm cùng cấp bậc**.

### 🏢 Nâng Cấp Hồ Sơ & Bảng Điều Khiển Tuyển Dụng (Chu kỳ 4 — Vòng 7 & Vòng 8)
- 👤 **Hồ sơ ứng viên toàn diện (`/profile`):** Hỗ trợ đầy đủ SĐT, địa điểm, bio (500 ký tự), skill tag chips kèm danh sách gợi ý sổ xuống (`SuggestionTagInput`), kinh nghiệm, học vấn, GitHub/LinkedIn/Portfolio, tải lên Avatar & CV lên Cloudinary, cùng thanh **Độ hoàn thiện hồ sơ**.
- 🏭 **Hồ sơ công ty (`/company`):** Hỗ trợ lĩnh vực, quy mô nhân sự, địa điểm, website, upload logo lên Cloudinary và xem trước thẻ công ty trực tiếp.
- 💼 **Employer Dashboard 3 Tabs (`/dashboard`):** Quản lý danh sách tin đăng (KPI, tìm kiếm/lọc, chỉnh sửa, đóng/mở lại, xóa kèm `ConfirmDialog`), nhập **Kỹ năng** & **Yêu cầu ứng viên** kèm dropdown gợi ý sổ xuống (lọc tiếng Việt không dấu, chọn bằng chuột hoặc phím mũi tên), tạo mô tả công việc bằng AI, và quản lý ứng viên theo từng job với điểm **Phù hợp kỹ năng** và **AI Tóm tắt ứng viên**.

### 🛡️ Nâng Cấp Trung Tâm Ứng Tuyển & Admin Analytics (Chu kỳ 5 — Vòng 9 & Vòng 10)
- 📬 **Trung tâm Đơn ứng tuyển đa vai trò (`/applications`):** Bảo vệ null-safe (`safeGetJobInfo`/`safeGetSeekerInfo`), bộ lọc trạng thái kèm số lượng & tìm kiếm nhanh, timeline 3 bước trực quan, Seeker rút đơn đang chờ (`ConfirmDialog`), Employer/Admin cập nhật trạng thái và tóm tắt ứng viên bằng AI.
- 📊 **Admin Dashboard & Analytics (`/admin`):** RBAC guard ở tầng UI, tab **Tổng quan** kết nối `/api/admin/stats` (KPI cards, biểu đồ phân bố role/status, hoạt động gần đây), cùng 4 tab quản lý (Users, Jobs, Companies, Applications) hỗ trợ tìm kiếm debounce, lọc, phân trang, bảo vệ tự sửa tài khoản và bảng responsive cuộn ngang.
✨ Tính Năng
🔐 Authentication & Authorization
✅ Đăng ký/đăng nhập với email/password

✅ OAuth 2.0 với Google

✅ JWT Authentication với HTTP-only cookies

✅ Auto-refresh token

✅ Role-based Access Control (RBAC): Seeker, Employer, Admin

💼 Quản Lý Công Việc
✅ CRUD operations cho jobs

✅ Tìm kiếm & filter nâng cao: theo tên, kỹ năng, địa điểm, remote, mức lương, level

✅ Pagination và sorting

✅ Toggle trạng thái active/inactive

✅ Tự động tạo job description bằng AI

🏢 Quản Lý Công Ty
✅ Tạo và cập nhật hồ sơ công ty

✅ Upload logo công ty (Cloudinary)

✅ Liên kết công ty với employer

👤 Quản Lý Hồ Sơ Ứng Viên
✅ Hồ sơ chi tiết: skills, experience, education, portfolio

✅ Upload avatar và CV (Cloudinary)

✅ Liên kết GitHub, LinkedIn, Portfolio

📄 Hệ Thống Ứng Tuyển
✅ Ứng tuyển với CV và cover letter

✅ Theo dõi trạng thái: submitted → viewed → accepted/rejected

✅ Employer xem danh sách ứng viên cho từng job

✅ Tự động tạo cover letter bằng AI

🤖 AI Features (Google Gemini)
✅ Tạo cover letter tự động dựa trên job và hồ sơ

✅ Tạo job description tự động

✅ Tóm tắt hồ sơ ứng viên cho employer

✅ Rate limiting để tránh lạm dụng

📊 Admin Dashboard
✅ Thống kê tổng quan: users, jobs, applications

✅ Quản lý users: phân quyền, kích hoạt/vô hiệu hóa

✅ Quản lý jobs và companies

✅ Quản lý applications toàn hệ thống

✅ Recent activities tracking

🎨 Frontend Features
✅ Responsive design với Tailwind CSS

✅ UI components sử dụng shadcn/ui

✅ Client-side routing với Next.js App Router

✅ Form validation với React Hook Form + Zod

✅ Real-time state management với React Context

🛠️ Công Nghệ
Backend
Node.js (v18+) - JavaScript runtime

Express (v5.1) - Web framework

TypeScript (v5.3) - Type safety

MongoDB (v7.0) - Database

Mongoose (v8.19) - ODM

JWT - Authentication

bcryptjs - Password hashing

Cloudinary - File storage

Google Gemini AI - AI capabilities

Multer - File upload handling

Zod - Schema validation

Frontend
Next.js (v14) - React framework

TypeScript (v5) - Type safety

Tailwind CSS (v4) - Styling

shadcn/ui - UI components

React Hook Form - Form management

Axios - HTTP client

React Context - State management

Dev Tools
ts-node-dev - Development server với hot reload

ESLint - Code linting

Postman - API testing

📦 Cài Đặt
Yêu Cầu Hệ Thống
Node.js >= 18.0.0

npm >= 9.0.0

MongoDB (local hoặc Atlas)

Tài khoản Cloudinary

Google Gemini API key

Google OAuth credentials
🔗 API Endpoints
🔐 Authentication
POST /api/auth/register - Đăng ký tài khoản

POST /api/auth/login - Đăng nhập

GET /api/auth/me - Lấy thông tin user hiện tại

POST /api/auth/refresh - Refresh token

POST /api/auth/logout - Đăng xuất

GET /api/auth/google - Google OAuth

GET /api/auth/google/callback - Google OAuth callback

💼 Jobs
GET /api/jobs - Danh sách jobs (public, hỗ trợ `q`, `location`, `isRemote`, `level`, `type`, `skills`, `salaryMin`, `companyId`, `sort`: `newest`/`oldest`/`salary_desc`/`salary_asc`)

GET /api/jobs/:id - Chi tiết job

POST /api/jobs - Tạo job (employer/admin)

PUT /api/jobs/:id - Cập nhật job

DELETE /api/jobs/:id - Xóa job

PATCH /api/jobs/:id/toggle-status - Toggle status

GET /api/jobs/employer/my-jobs - Jobs của employer

🏢 Company
GET /api/company/me - Thông tin công ty

PUT /api/company/me - Tạo/cập nhật công ty

POST /api/company/logo - Upload logo

👤 Profile
GET /api/profile/seeker - Hồ sơ seeker

PUT /api/profile/seeker - Cập nhật hồ sơ

POST /api/profile/seeker/avatar - Upload avatar

POST /api/profile/seeker/resume - Upload CV

📄 Applications
POST /api/applications/jobs/:jobId/apply - Ứng tuyển

GET /api/applications/my-applications - Đơn ứng tuyển của tôi

GET /api/applications/jobs/:jobId/applications - Ứng viên cho job

PATCH /api/applications/:applicationId/status - Cập nhật trạng thái

DELETE /api/applications/:applicationId - Rút đơn ứng tuyển (seeker, chỉ áp dụng khi trạng thái `submitted` hoặc `viewed`)

POST /api/applications/generate-cover-letter - Tạo cover letter AI

POST /api/applications/:applicationId/summarize - Tóm tắt ứng viên AI

🤖 AI Features
POST /api/ai/generate-cover-letter - Tạo cover letter

POST /api/ai/generate-job-description - Tạo job description

POST /api/ai/summarize-candidate/:applicationId - Tóm tắt ứng viên

⚙️ Admin
GET /api/admin/stats - Thống kê hệ thống

GET /api/admin/users - Quản lý users

PATCH /api/admin/users/:userId - Cập nhật user

GET /api/admin/jobs - Quản lý jobs (hỗ trợ `search`, `status`: `active` | `inactive`)

DELETE /api/admin/jobs/:jobId - Xóa job

GET /api/admin/companies - Quản lý companies

GET /api/admin/applications - Quản lý applications (hỗ trợ `status`, `search` theo coverLetter/tên job/tên & email ứng viên)
📄 License
MIT License - xem file LICENSE để biết thêm chi tiết.

🤝 Đóng Góp
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the project

Create your feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

📞 Hỗ Trợ
Nếu bạn gặp vấn đề hoặc có câu hỏi:

Kiểm tra documentation trước

Tạo issue trên repository

Liên hệ qua email hoặc discussion forum