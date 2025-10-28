# 🚀 Job Portal Backend API

> Backend API cho ứng dụng tìm việc làm với Node.js + Express + MongoDB + TypeScript

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen)](https://www.mongodb.com/)

---

## 📋 Mục Lục

- [Tính năng](#-tính-năng)
- [Công nghệ](#-công-nghệ)
- [Cài đặt](#-cài-đặt)
- [Cấu hình](#-cấu-hình)
- [Chạy ứng dụng](#-chạy-ứng-dụng)
- [Seed dữ liệu](#-seed-dữ-liệu)
- [API Endpoints](#-api-endpoints)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Tài khoản demo](#-tài-khoản-demo)

---

## ✨ Tính Năng

### **🔐 Authentication & Authorization**
- ✅ JWT Authentication với HTTP-only cookies
- ✅ Access Token (15 phút) + Refresh Token (7 ngày)
- ✅ Auto-refresh token trong middleware
- ✅ RBAC với 3 roles: **Seeker**, **Employer**, **Admin**

### **💼 Quản Lý Công Việc**
- ✅ CRUD operations cho jobs
- ✅ Filter & search: tên, địa điểm, remote, skills, level, mức lương
- ✅ Pagination
- ✅ Toggle trạng thái active/inactive

### **📄 Quản Lý Hồ Sơ**
- ✅ Hồ sơ Seeker (skills, experience, education, portfolio)
- ✅ Upload avatar và CV (Cloudinary)
- ✅ Hồ sơ công ty (Employer)
- ✅ Upload logo công ty

### **📨 Ứng Tuyển**
- ✅ Seeker apply job với CV
- ✅ Employer xem danh sách ứng viên
- ✅ Cập nhật trạng thái: submitted → viewed → accepted/rejected
- ✅ Theo dõi thời gian xem và phản hồi

### **🤖 AI Features (Google Gemini)**
- ✅ Tạo cover letter tự động
- ✅ Tạo job description tự động
- ✅ Tóm tắt hồ sơ ứng viên

### **📊 Admin Dashboard**
- ✅ Thống kê users, jobs, applications
- ✅ Thống kê theo role và status
- ✅ Recent activities

---

## 🛠️ Công Nghệ

### **Core**
- **Node.js** (v18+) - JavaScript runtime
- **Express** (v4.18) - Web framework
- **TypeScript** (v5.3) - Type safety
- **MongoDB** (v7.0) - Database
- **Mongoose** (v8.0) - ODM

### **Security & Auth**
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **cookie-parser** - Cookie handling
- **cors** - Cross-Origin Resource Sharing

### **Validation & Upload**
- **zod** - Schema validation
- **multer** - File upload middleware
- **cloudinary** - Cloud storage

### **AI**
- **@google/generative-ai** - Google Gemini API

### **Dev Tools**
- **ts-node-dev** - Development with hot reload
- **dotenv** - Environment variables

---

## 📦 Cài Đặt

### **Yêu cầu**
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local hoặc Atlas)
- Cloudinary account
- Google Gemini API key

### **Clone & Install**

