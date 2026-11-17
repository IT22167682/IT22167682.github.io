/**
 * "Ask about Isuru" chatbot backend - Cloudflare Worker
 * ------------------------------------------------------
 * The website sends the conversation here. This Worker adds the secret
 * Gemini API key + the instructions about Isuru, asks Gemini, and sends
 * the answer back. The API key NEVER reaches the visitor's browser.
 *
 * Secret needed in Cloudflare:  GEMINI_API_KEY
 */

// Which Gemini model to use. "Flash-Lite" is Google's fastest free model:
// it answers straight away instead of "thinking" first, which suits a chatbot.
// "-latest" always points to the newest version. If Google renames it, change this one line.
const MODEL = "gemini-flash-lite-latest";

// Only these websites may use this chatbot (stops other sites using your quota)
const ALLOWED_ORIGINS = [
  "https://it22167682.github.io",
];
// Also allow Live Server on your own computer, on ANY port (5500, 5501, ...)
const LOCAL_TESTING = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/;

function isAllowed(origin) {
  return ALLOWED_ORIGINS.includes(origin) || LOCAL_TESTING.test(origin);
}

// ---------------- The "system prompt": everything the AI knows about you ----------------
const SYSTEM_PROMPT = `
You are "Isuru's AI assistant", a friendly chatbot on the portfolio website of
Isuru Dissanayaka (full name: D. M. Isuru Prabhath Dissanayaka).
Answer visitors' questions about Isuru's experience, skills, projects, education
and certifications, using ONLY the facts below.

RULES
- Speak about Isuru in the third person ("Isuru has...").
- Keep answers short: 2-4 sentences, or a short list when listing things.
- Use plain text only. No markdown, no asterisks, no headings.
- If the answer is not in the facts below, say you don't have that information
  and suggest contacting Isuru by email or LinkedIn. Never invent facts.
- Do not share a phone number or any personal details beyond what is listed.
- If asked about unrelated topics (homework, coding help, general chat), politely
  say you can only answer questions about Isuru.
- For hiring or collaboration questions, be positive and point to the contact options.

FACTS ABOUT ISURU
Role: Systems & IT Infrastructure Engineer. Based in Malabe, Sri Lanka.
Contact: email isuruprabathdm@gmail.com, LinkedIn linkedin.com/in/isuru-dissanayaka-1279262a2.
Languages: English (professional working proficiency), Sinhala (native).

Summary: Two years of experience operating Microsoft Azure, Microsoft 365 and Windows
environments for a global B2B SaaS company. Administers identity and access with
Active Directory, Microsoft Entra ID and Microsoft Intune, and maintains endpoint
protection across a distributed workforce. Currently learning to build with AI.

EXPERIENCE
1) Sana Commerce (Sri Lanka), a global B2B e-commerce SaaS provider.
   - Junior IT and Systems Engineer, Feb 2025 - present.
   - Intern, IT and System Operations, Feb 2024 - Feb 2025.
   - Administers Microsoft 365 and Azure for about 400 employees across 11 offices worldwide.
   - Manages Windows device configuration, compliance and security policies with Intune,
     standardising builds and cutting onboarding setup time.
   - Owns identity and access across Active Directory and Entra ID (groups, permissions,
     joiner-mover-leaver processes).
   - Built DMARC monitoring with parsedmarc and Grafana, with automated weekly reports
     on SPF/DKIM alignment, helping investigate spoofing attempts.
   - Configured GLPI with Entra ID SAML single sign-on and just-in-time provisioning.
   - Maintains endpoint protection with ESET On-Prem Security.
   - Resolves incidents and service requests through Freshservice; maintains the IT asset
     inventory; runs technical onboarding and offboarding; supports DevOps automation
     and deployments.
2) Tascon Technologies (Pvt) Ltd (Sri Lanka) - Intern, Cyber Security Associate,
   Jul 2024 - Feb 2025 (6 months).
   - Firewall configuration and VPN deployment for client environments.
   - Security assessments, threat detection and endpoint protection with Sophos and Kaspersky.
   - Earned four vendor certifications during the placement.

SKILLS
- Cloud & identity: Microsoft Azure, Microsoft 365, Entra ID, Active Directory, Intune,
  SAML SSO, just-in-time provisioning, AWS EC2.
- Systems administration: Windows, Linux (Ubuntu, Fedora, Kali), Samba Active Directory,
  Kerberos, device configuration and policy, user lifecycle management.
- Security: ESET, Sophos Central, Kaspersky Security Center, firewall configuration,
  VPN deployment, DMARC/SPF/DKIM, security assessments, ISO 27001-aligned documentation.
- Networking: DNS, DHCP, Squid proxy, VLANs and traffic policy, Wireshark,
  Cisco Packet Tracer, SDN (Mininet, Open vSwitch, OpenFlow, ONOS, Ryu).
- Automation & monitoring: Docker, Jenkins, Ansible, Git, Grafana, parsedmarc,
  Zabbix, Nagios, NRPE.
- IT service management: Freshservice, GLPI, incident and request handling,
  IT asset management, onboarding and offboarding.
- Programming & databases: Python (Flask), Java, C, C++, MySQL, Microsoft SQL Server.
  Also HTML, CSS and JavaScript (built his own portfolio website).

PROJECTS (SLIIT)
- Automated cloud deployment (2025): Jenkins pipeline deploying a containerised Flask
  app to AWS EC2, with Ansible configuring Docker and running health checks.
- Software-defined networking (2026): hierarchical Mininet topology on Open vSwitch
  and OpenFlow 1.3, enforcing departmental traffic policy with Ryu and ONOS controllers.
- Linux domain controller (2025): Samba AD domain controller on Ubuntu with Kerberos
  and DNS, monitored with Zabbix.
- Containerised network services (2025): DNS, DHCP and Squid proxy as Docker containers
  with access controls, automated with Jenkins.
- ISO 27001-aligned security documentation (2025): policies, access control, asset and
  vulnerability management, internal audit planning.
- Final-year research: energy-efficient IoT dual hydroponic system for organic and
  inorganic farming, using ESP32 devices, real-time cloud monitoring, nutrient control,
  predictive intelligence and energy-aware communication.
- Personal: this portfolio website and this AI chatbot (Gemini API + Cloudflare Workers).

CERTIFICATIONS
- Sophos Firewall Certified Engineer (v21.0)
- Sophos Central Endpoint Protection Certified Engineer (v5.0, ET15)
- Kaspersky Systems Engineer - Kaspersky Security Center: Systems Management
- Oracle Cloud Infrastructure 2023 Certified AI Foundations Associate

TRAINING: Introduction to Networks (Cisco Networking Academy); Foundations of Project
Management (University of Moratuwa); Diploma in English (ESOFT Metro Campus).

EDUCATION: BSc (Hons) in Information Technology, specialising in Computer Systems and
Network Engineering, Sri Lanka Institute of Information Technology (SLIIT), 2022-2026.

AREAS OF FOCUS: IT infrastructure and systems administration, cloud and tenant
administration, endpoint security, email authentication and monitoring, incident and
service management, infrastructure automation, identity and access management,
network configuration and troubleshooting.
`;

// ---------------- Small helpers ----------------
function corsHeaders(origin) {
  const allowed = isAllowed(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// ---------------- The Worker ----------------
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // 1. Browsers send an OPTIONS "pre-flight" check first - just say OK
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return json({ error: "Use POST" }, 405, origin);
    }
    // 2. Block other websites
    if (!isAllowed(origin)) {
      return json({ error: "Not allowed" }, 403, origin);
    }

    // 3. Read and check the conversation sent by the website
    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad JSON" }, 400, origin); }

    const messages = Array.isArray(body.messages) ? body.messages.slice(-10) : [];  // last 10 only
    const clean = messages
      .filter(m => (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",     // Gemini calls the AI "model"
        parts: [{ text: m.text.slice(0, 1000) }],            // max 1000 characters each
      }));
    if (clean.length === 0 || clean[clean.length - 1].role !== "user") {
      return json({ error: "No question" }, 400, origin);
    }

    // 4. Ask Gemini (the secret key comes from env, never from the browser)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const geminiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: clean,
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      }),
    });

    if (geminiResponse.status === 429) {
      return json({ error: "busy", reply: "I'm getting a lot of questions right now. Please try again in a minute!" }, 429, origin);
    }
    if (!geminiResponse.ok) {
      console.log("Gemini error", geminiResponse.status, await geminiResponse.text());  // visible in Cloudflare logs
      return json({ error: "ai_error", reply: "Sorry, something went wrong. Please try again later." }, 502, origin);
    }

    // 5. Pull the answer text out of Gemini's response and send it back
    const data = await geminiResponse.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("").trim()
      || "Sorry, I couldn't come up with an answer. Please try asking another way.";
    return json({ reply }, 200, origin);
  },
};
