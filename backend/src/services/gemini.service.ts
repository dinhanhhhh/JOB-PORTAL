import { GoogleGenAI } from "@google/genai";
import { env } from "../utils/env";

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini service is not configured. Set GEMINI_API_KEY to enable AI features.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function generateContent(prompt: string): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  if (!response.text) {
    throw new Error("No response from Gemini API");
  }

  return response.text;
}

/**
 * Generate cover letter using Gemini AI
 * @param jobTitle - Job title
 * @param jobDescription - Job description
 * @param seekerProfile - Seeker's profile info
 */
export async function generateCoverLetter(
  jobTitle: string,
  jobDescription: string,
  seekerProfile: {
    name: string;
    skills: string[];
    experience?: string;
  }
): Promise<string> {
  const prompt = `
Generate a professional cover letter for the following job application:

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Applicant Information:
- Name: ${seekerProfile.name}
- Skills: ${seekerProfile.skills.join(", ")}
${seekerProfile.experience ? `- Experience: ${seekerProfile.experience}` : ""}

Please write a compelling cover letter (max 300 words) that:
1. Shows enthusiasm for the position
2. Highlights relevant skills
3. Explains why the candidate is a good fit
4. Uses a professional tone

Do not include placeholder text like [Your Name] or [Date].
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate cover letter");
  }
}

/**
 * Generate job description using Gemini AI
 * @param jobTitle - Job title
 * @param skills - Required skills
 * @param level - Job level
 */
export async function generateJobDescription(
  jobTitle: string,
  skills: string[],
  level: string
): Promise<string> {
  const prompt = `
Generate a professional job description for:

Position: ${jobTitle}
Required Skills: ${skills.join(", ")}
Level: ${level}

Please create a comprehensive job description (max 400 words) that includes:
1. Role overview
2. Key responsibilities (3-5 bullet points)
3. Required qualifications
4. Nice-to-have skills
5. What makes this position exciting

Use a professional and engaging tone.
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to generate job description");
  }
}

/**
 * Summarize candidate profile using Gemini AI
 * @param resumeText - Text extracted from resume
 * @param jobRequirements - Job requirements
 */
export async function summarizeCandidate(
  resumeText: string,
  jobRequirements: string
): Promise<string> {
  const prompt = `
Analyze this candidate's resume and provide a 3-line summary focusing on their fit for the job:

Resume:
${resumeText.substring(0, 2000)} // Limit to avoid token limits

Job Requirements:
${jobRequirements}

Provide a concise 3-line summary that highlights:
1. Key strengths
2. Relevant experience
3. Overall fit for the position

Keep it objective and professional.
`;

  try {
    return await generateContent(prompt);
  } catch (error) {
    console.error("Gemini API error:", error);
    throw new Error("Failed to summarize candidate");
  }
}
