// src/seed.ts
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Company from "./models/Company.js";
import Job from "./models/Job.js";
import SeekerProfile from "./models/SeekerProfile.js";
import Application from "./models/Application.js"; // ✅ THÊM

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

  const job3 = await Job.create({
    title: "Node.js Backend Engineer",
    description: "We are seeking a Backend Engineer skilled in Node.js, Express, and microservices architecture.",
    requirements: [
      "3+ years experience with Node.js and Express",
      "Experience with SQL and NoSQL databases",
      "Understanding of RESTful APIs and microservices"
    ],
    skills: ["Node.js", "Express", "MongoDB", "PostgreSQL", "Redis"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "mid",
    type: "full-time",
    salaryMin: 1800,
    salaryMax: 2800,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job4 = await Job.create({
    title: "Mobile App Developer (React Native)",
    description: "Build high-performance native app experiences for iOS and Android platforms.",
    requirements: [
      "Strong React Native foundations",
      "Ability to integrate native modules",
      "Familiarity with App Store & Google Play publishing"
    ],
    skills: ["React Native", "JavaScript", "TypeScript", "Redux", "iOS", "Android"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "entry",
    type: "internship",
    salaryMin: 500,
    salaryMax: 1000,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job5 = await Job.create({
    title: "DevOps Engineer",
    description: "Automate, deploy, and scale our cloud infrastructure on AWS.",
    requirements: [
      "3+ years managing AWS infrastructure",
      "Proficient in Docker and Kubernetes",
      "Strong scripting skills (Bash, Python)"
    ],
    skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform", "Linux"],
    location: "Remote",
    isRemote: true,
    level: "senior",
    type: "contract",
    salaryMin: 3000,
    salaryMax: 5000,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job6 = await Job.create({
    title: "AI / Machine Learning Engineer",
    description: "Integrate Large Language Models and develop predictive algorithms for job matching.",
    requirements: [
      "Experience with OpenAI API, Gemini API, or LangChain",
      "Strong Python background",
      "Understanding of vector databases"
    ],
    skills: ["Python", "TensorFlow", "PyTorch", "OpenAI", "Gemini", "LangChain"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "lead",
    type: "full-time",
    salaryMin: 3500,
    salaryMax: 6000,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job7 = await Job.create({
    title: "UI / UX Designer",
    description: "Create user-centric designs, wireframes, and prototypes for web and mobile platforms.",
    requirements: [
      "3+ years UI/UX design experience",
      "Proficient in Figma, Adobe XD, or Sketch",
      "Strong portfolio demonstrating web and mobile design solutions"
    ],
    skills: ["Figma", "UI Design", "UX Research", "Wireframing", "Prototyping"],
    location: "Remote",
    isRemote: true,
    level: "mid",
    type: "full-time",
    salaryMin: 1200,
    salaryMax: 2200,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job8 = await Job.create({
    title: "Data Analyst",
    description: "Interpret data, analyze results using statistical techniques, and provide ongoing reports.",
    requirements: [
      "Strong knowledge of SQL and Excel",
      "Experience with data visualization tools (Tableau, PowerBI)",
      "Analytical mindset and attention to detail"
    ],
    skills: ["SQL", "Excel", "Tableau", "PowerBI", "Python", "Statistics"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "entry",
    type: "part-time",
    salaryMin: 600,
    salaryMax: 1200,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job9 = await Job.create({
    title: "Cybersecurity Engineer",
    description: "Protect our system infrastructure, networks, and data from security breaches and threats.",
    requirements: [
      "5+ years in information security or cybersecurity engineering",
      "Understanding of firewalls, proxies, SIEM, and antivirus detection systems",
      "Relevant certification (e.g., CISSP, CEH) is a plus"
    ],
    skills: ["Network Security", "Penetration Testing", "Cryptography", "Linux", "SIEM"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "senior",
    type: "full-time",
    salaryMin: 2800,
    salaryMax: 4500,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job10 = await Job.create({
    title: "Cloud Solutions Architect",
    description: "Design cloud computing strategies, cloud adoption plans, and application design.",
    requirements: [
      "Deep understanding of cloud computing technologies and workloads (AWS/GCP/Azure)",
      "Experience in database migration and cloud infrastructure architecture",
      "Strong background in enterprise software design and patterns"
    ],
    skills: ["AWS", "GCP", "Cloud Architecture", "System Design", "Enterprise Patterns"],
    location: "Remote",
    isRemote: true,
    level: "lead",
    type: "contract",
    salaryMin: 4000,
    salaryMax: 7000,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job11 = await Job.create({
    title: "Golang Backend Developer",
    description: "Build robust, high-performance concurrency-heavy microservices in Go.",
    requirements: [
      "2+ years writing production Golang code",
      "Deep understanding of Go routines and concurrency patterns",
      "Experience building high-throughput microservices"
    ],
    skills: ["Golang", "Docker", "gRPC", "MongoDB", "PostgreSQL", "Kafka"],
    location: "Ho Chi Minh City",
    isRemote: false,
    level: "mid",
    type: "full-time",
    salaryMin: 2000,
    salaryMax: 3200,
    employer: employer._id,
    company: company._id,
    isActive: true,
  });

  const job12 = await Job.create({
    title: "Quality Assurance (QA) Engineer",
    description: "Test Web/Mobile applications manually and write test scripts for automated testing.",
    requirements: [
      "Familiarity with manual testing processes and bug tracking tools (Jira)",
      "Basic programming skills in JavaScript/Python to write automation scripts",
      "Eager to learn automated testing frameworks (Playwright, Selenium)"
    ],
    skills: ["Manual Testing", "Jira", "Selenium", "Playwright", "Test Automation"],
    location: "Remote",
    isRemote: true,
    level: "entry",
    type: "internship",
    salaryMin: 400,
    salaryMax: 800,
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
  console.log(
    "💼 Jobs seeded count:",
    [job1, job2, job3, job4, job5, job6, job7, job8, job9, job10, job11, job12].length
  );
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
