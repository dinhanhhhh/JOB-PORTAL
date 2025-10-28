// src/seed.ts
import mongoose from "mongoose";
import { connectDB } from "./config/db";
import User from "./models/User";
import Company from "./models/Company";
import Job from "./models/Job";
import SeekerProfile from "./models/SeekerProfile";
import Application from "./models/Application"; // ✅ THÊM

async function main() {
  await connectDB();

  // 🔄 Xoá dữ liệu cũ
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Job.deleteMany({}),
    SeekerProfile.deleteMany({}),
    Application.deleteMany({}), // ✅ THÊM
  ]);

  // 👤 Seed người dùng
  const admin = await User.create({
    email: "admin@example.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
  });

  const employer = await User.create({
    email: "hr@example.com",
    password: "hr12345",
    name: "HR Manager",
    role: "employer",
  });

  const seeker = await User.create({
    email: "dev@example.com",
    password: "dev12345",
    name: "Dev Seeker",
    role: "seeker",
  });

  // ✅ Tạo profile cho seeker
  const seekerProfile = await SeekerProfile.create({
    user: seeker._id,
    phone: "+84 123 456 789",
    location: "Ho Chi Minh City, Vietnam",
    bio: "Passionate developer with 2 years of experience in MERN stack",
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "MongoDB"],
    experience: "2 years in web development",
    education: "Bachelor of Computer Science",
    github: "https://github.com/devseeker",
    portfolio: "https://devseeker.dev",
    linkedin: "https://linkedin.com/in/devseeker",
    resumeUrl:
      "https://res.cloudinary.com/demo/raw/upload/v1234567890/sample_resume.pdf", // ✅ Giả lập CV có sẵn
  });

  // 🏢 Seed công ty
  const company = await Company.create({
    name: "TechCorp Solutions",
    description: "Leading technology company specializing in web solutions",
    website: "https://techcorp.example.com",
    owner: employer._id,
  });

  // 💼 Seed jobs
  const job1 = await Job.create({
    title: "Senior Full-Stack Developer",
    description:
      "We are looking for an experienced full-stack developer to join our team",
    requirements: [
      "5+ years of experience in web development",
      "Strong problem-solving skills",
      "Excellent communication skills",
    ],
    skills: ["JavaScript", "TypeScript", "React", "Node.js", "MongoDB"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "senior",
    type: "full-time",
    salaryMin: 2000,
    salaryMax: 3500,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job2 = await Job.create({
    title: "Frontend Developer (React)",
    description: "Join our team to build modern user interfaces",
    requirements: ["3+ years React experience", "TypeScript proficiency"],
    skills: ["React", "TypeScript", "CSS", "Tailwind"],
    location: "Remote",
    isRemote: true,
    level: "mid",
    type: "full-time",
    salaryMin: 1500,
    salaryMax: 2500,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  // 📄 Seed 1 application mẫu (seeker apply job1)
  const application = await Application.create({
    job: job1._id,
    seeker: seeker._id,
    resumeUrl: seekerProfile.resumeUrl ?? "",
    coverLetter:
      "Dear HR Manager, I’m excited to apply for the Senior Full-Stack Developer role at TechCorp. My experience with React and Node.js makes me a strong fit for this position.",
    status: "submitted",
  });

  // 🟢 Log kết quả
  console.log("✅ Seed completed successfully!");
  console.table([
    { Role: "Admin", Email: admin.email, Password: "admin123" },
    { Role: "Employer", Email: employer.email, Password: "hr12345" },
    { Role: "Seeker", Email: seeker.email, Password: "dev12345" },
  ]);
  console.log("🏢 Company:", company.name);
  console.log("💼 Jobs:", job1.title, "+", job2.title);
  console.log("👤 Seeker profile:", seekerProfile.skills.join(", "));
  console.log("📄 Application:",(application.coverLetter ?? "").slice(0, 60) + "...");
  console.log("📦 Database:", mongoose.connection.name);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed error:", e);
  process.exit(1);
});
