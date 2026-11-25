import { matchesKeyword } from "./searchHighlight";

export const POPULAR_SKILLS: readonly string[] = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "HTML/CSS",
  "Tailwind CSS",
  "Node.js",
  "Express",
  "NestJS",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "Go",
  "PHP",
  "Laravel",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST API",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "CI/CD",
  "Git",
  "Linux",
  "React Native",
  "Flutter",
  "Swift",
  "Kotlin",
  "Playwright",
  "Selenium",
  "Jest",
  "Figma",
  "UI/UX",
  "Machine Learning",
  "SQL",
];

export const POPULAR_REQUIREMENTS: Record<"vi" | "en", readonly string[]> = {
  vi: [
    "Có ít nhất 1 năm kinh nghiệm ở vị trí tương đương",
    "Có ít nhất 2 năm kinh nghiệm phát triển ứng dụng web",
    "Có ít nhất 3 năm kinh nghiệm làm việc thực tế",
    "Thành thạo Git và quy trình làm việc nhóm Agile/Scrum",
    "Hiểu biết tốt về RESTful API và thiết kế cơ sở dữ liệu",
    "Có tư duy giải quyết vấn đề và viết code sạch, dễ bảo trì",
    "Kỹ năng giao tiếp và phối hợp nhóm tốt",
    "Có khả năng đọc hiểu tài liệu kỹ thuật bằng tiếng Anh",
    "Ưu tiên có kinh nghiệm với Docker, CI/CD hoặc Cloud (AWS/GCP)",
    "Ưu tiên có kinh nghiệm viết Unit Test / Integration Test",
    "Tốt nghiệp Đại học/Cao đẳng chuyên ngành CNTT hoặc tương đương",
  ],
  en: [
    "1+ years of experience in a similar role",
    "2+ years of hands-on web development experience",
    "3+ years of production software engineering experience",
    "Proficient with Git and Agile/Scrum workflows",
    "Solid understanding of RESTful APIs and database design",
    "Strong problem-solving skills and clean, maintainable code",
    "Good communication and team collaboration skills",
    "Comfortable reading technical documentation in English",
    "Experience with Docker, CI/CD, or Cloud platforms (AWS/GCP) is a plus",
    "Experience writing unit and integration tests",
    "Bachelor's degree in Computer Science or equivalent experience",
  ],
};

/**
 * Filter suggestions by query (case- and diacritic-insensitive) while excluding already selected items.
 */
export function filterSuggestions(
  suggestions: readonly string[],
  query: string,
  selectedItems: readonly string[],
  maxResults = 8
): string[] {
  const selectedLower = new Set(
    selectedItems.map((item) => item.trim().toLowerCase())
  );
  const trimmedQuery = query.trim();

  const result: string[] = [];
  for (const item of suggestions) {
    if (selectedLower.has(item.toLowerCase())) continue;
    if (trimmedQuery && !matchesKeyword(item, trimmedQuery)) continue;
    result.push(item);
    if (result.length >= maxResults) break;
  }

  return result;
}
