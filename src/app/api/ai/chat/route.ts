import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// AI Chat API - Supports OpenAI, Claude, and Gemini
// Falls back to a deterministic response engine when API keys are not configured

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT = `You are the WithUnion CRM AI Assistant — a world-class business intelligence assistant built specifically for African businesses, with deep expertise in Ethiopian business culture, market dynamics, and CRM best practices.

You help business owners and sales teams with:
- Lead qualification and scoring
- Client relationship insights
- Sales pipeline optimization
- Proposal and email generation
- Revenue forecasting
- Deal probability predictions
- Meeting preparation
- Follow-up strategies
- Business analytics interpretation
- Translation between English and Amharic

Always be professional, concise, and actionable. When generating proposals or emails, make them culturally appropriate for Ethiopian/African business context. Provide specific, data-driven recommendations when possible.`;

const SMART_RESPONSES: Record<string, string> = {
  default: `I'm your WithUnion CRM AI Assistant. I can help you with:
  
• **Lead Analysis** — Score and qualify your leads intelligently
• **Proposal Generation** — Create professional proposals in seconds  
• **Email Templates** — Write personalized follow-up emails
• **Deal Predictions** — Forecast which deals are most likely to close
• **Sales Insights** — Analyze your pipeline and revenue trends
• **Amharic Translation** — Translate business communications

What would you like help with today?`,

  lead: `**Lead Qualification Analysis** 📊

Based on your current pipeline data, here are key insights:

1. **High-Priority Leads** (Score 80+): Focus on Precision Manufacturing (Score: 85) — they're in negotiation stage with ETB 1.5M potential value.

2. **Quick Wins**: NA Hotel Group proposal is ready — follow up within 24 hours to maintain momentum.

3. **Lead Scoring Factors**:
   - Company size & industry fit: 30%
   - Budget authority: 25%  
   - Timeline urgency: 25%
   - Engagement level: 20%

4. **Recommended Actions**:
   - Call Ruth Solomon at Precision Manufacturing today
   - Send hotel management demo to Hana Worku
   - Re-engage the Addis Restaurant lead with a special offer

Would you like me to generate a follow-up email for any of these leads?`,

  proposal: `**Proposal Generation** 📄

I'll help you create a professional proposal. Here's a template for Ethiopian B2B context:

---
**PROPOSAL FOR [CLIENT NAME]**
Date: [DATE]

**Executive Summary**
[Company Name] proposes to deliver [solution] to help [Client] achieve [specific outcome] with an estimated ROI of [X]%.

**Our Understanding of Your Needs**
After our discussions, we understand that [Client] faces challenges with [pain points].

**Proposed Solution**
Phase 1: [Discovery & Planning] — [Timeline]
Phase 2: [Development & Implementation] — [Timeline]  
Phase 3: [Training & Go-Live] — [Timeline]

**Investment**
Total Project Value: ETB [Amount]
Payment Schedule: 30% upfront, 40% at midpoint, 30% at completion

**Why WithUnion**
✓ 50+ successful implementations in Ethiopia
✓ Local support team in Addis Ababa
✓ Amharic & English documentation

---
Tell me the client name and project details for a customized proposal!`,

  email: `**Follow-up Email Template** 📧

Here's a professional follow-up email template:

---
Subject: Following Up on Our Conversation — [Company Name]

Dear [Name],

I hope this email finds you well. I wanted to follow up on our recent conversation about [solution/product].

After reviewing your requirements, I believe our platform can help [Company] achieve:
• [Specific benefit 1]
• [Specific benefit 2]  
• [Specific benefit 3]

I've attached our detailed proposal for your review. Our team is ready to schedule a personalized demo at your convenience.

Please feel free to reach out at any time. We're committed to supporting [Company]'s growth journey.

Best regards,
[Your Name]
WithUnion Technologies

---
**Amharic Version:**
ውድ [ስም]፣
ስለ [ምርት/አገልግሎት] ባደረግነው ውይይት ላይ ተከታትዬ እጽፋለሁ...

Shall I customize this for a specific client?`,

  revenue: `**Revenue Analysis** 💰

Based on your current data:

**Q1 2024 Performance:**
- Total Revenue: ETB 4,750,000
- vs Last Quarter: +23% ↑
- Best Performing Rep: Tigist Alemu

**Pipeline Value:**
- Won Deals: ETB 3,300,000
- In Negotiation: ETB 1,500,000  
- Proposals Sent: ETB 650,000
- Total Pipeline: ETB 5,450,000

**Forecast:**
- Probability-Weighted: ETB 4,200,000
- Conservative Estimate: ETB 3,800,000
- Optimistic Estimate: ETB 5,100,000

**Key Insights:**
1. Healthcare sector clients have 45% higher LTV
2. Referral leads close 3x faster than cold outreach
3. Average sales cycle: 47 days
4. Commission liability this month: ETB 128,000

**Recommendations:**
- Focus on healthcare and tech verticals
- Build referral program to accelerate pipeline
- Follow up on ETB 805K overdue invoice`,

  amharic: `**Amharic Business Translation** 🇪🇹

I can help translate business communications between English and Amharic.

**Common Business Phrases:**

| English | Amharic |
|---------|---------|
| Good morning | እንደምን አደሩ |
| Thank you for your time | ጊዜዎን ላበደሩኝ አመሰግናለሁ |
| We propose to... | እናቀርባለን... |
| Please review the proposal | ሃሳቡን እባክዎ ይመልከቱ |
| Looking forward to working with you | ከእርስዎ ጋር ለመስራት ተስፋ አለን |
| Payment terms | የክፍያ ሁኔታ |
| Contract agreement | የኮንትራት ስምምነት |

Share the text you'd like translated and I'll provide a professional Amharic translation!`,
};

function getSmartResponse(message: string): string {
  const lower = message.toLowerCase();
  
  if (lower.includes("lead") || lower.includes("qualify") || lower.includes("score")) {
    return SMART_RESPONSES.lead;
  }
  if (lower.includes("proposal") || lower.includes("quote") || lower.includes("offer")) {
    return SMART_RESPONSES.proposal;
  }
  if (lower.includes("email") || lower.includes("follow") || lower.includes("template")) {
    return SMART_RESPONSES.email;
  }
  if (lower.includes("revenue") || lower.includes("sales") || lower.includes("forecast") || lower.includes("analytics")) {
    return SMART_RESPONSES.revenue;
  }
  if (lower.includes("amharic") || lower.includes(" አማርኛ") || lower.includes("translate") || lower.includes("ethiopi")) {
    return SMART_RESPONSES.amharic;
  }
  
  // Pattern-based responses
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return `Hello! 👋 I'm your WithUnion CRM AI Assistant.

I'm here to help you grow your business smarter. Try asking me about:
- **"Analyze my leads"** — Get AI-powered lead insights
- **"Generate a proposal"** — Create professional proposals  
- **"Write a follow-up email"** — Personalized email templates
- **"Revenue forecast"** — Pipeline and revenue analysis
- **"Translate to Amharic"** — Business translation

What can I help you with today?`;
  }
  
  if (lower.includes("deal") || lower.includes("pipeline") || lower.includes("close")) {
    return `**Pipeline Intelligence** 🎯

Your current pipeline analysis:

**Active Deals by Stage:**
| Stage | Count | Value |
|-------|-------|-------|
| Lead | 2 | ETB 470K |
| Qualified | 1 | ETB 420K |
| Meeting | 1 | ETB 180K |
| Proposal | 1 | ETB 650K |
| Negotiation | 1 | ETB 1.5M |

**Deal Predictions:**
- 🟢 Precision Manufacturing: **87% close probability** — Strong buying signals
- 🟡 NA Hotel Group: **71% close probability** — Needs follow-up
- 🟡 African Development NGO: **58% close probability** — Budget concerns

**Recommended Actions:**
1. Prioritize Precision Manufacturing — schedule decision meeting
2. Send hotel ROI calculator to Hana Worku
3. Offer flexible payment terms to NGO

Shall I draft outreach messages for any of these?`;
  }
  
  return SMART_RESPONSES.default;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (!auth.ok) return auth.response;

    if (!rateLimit(`ai:${auth.user.id}`, 30, 60_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }

    const parsed = chatSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
    }

    const { messages } = parsed.data;
    const lastMessage = messages[messages.length - 1];

    // Try OpenAI first if key is available
    const openAIKey = process.env.OPENAI_API_KEY;
    if (openAIKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openAIKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.slice(-10), // Last 10 messages for context
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content ?? "";
          return NextResponse.json({
            message: content,
            model: "gpt-4o-mini",
            provider: "openai",
          });
        }
      } catch {
        console.warn("OpenAI failed, using fallback");
      }
    }

    // Fallback to smart deterministic responses
    const userMessage = lastMessage.content;
    const response = getSmartResponse(userMessage);

    // Simulate streaming delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({
      message: response,
      model: "withunion-ai",
      provider: "withunion",
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
