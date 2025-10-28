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
- 🛡️ **Rate limiting** chống spam
- ✅ **Input validation** với Zod schema
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
GET /api/jobs - Danh sách jobs (public)

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

GET /api/admin/jobs - Quản lý jobs

DELETE /api/admin/jobs/:jobId - Xóa job

GET /api/admin/companies - Quản lý companies

GET /api/admin/applications - Quản lý applications
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