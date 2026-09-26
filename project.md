# Startup Matchmaker

> Working title — an AI-powered matching and conversation-preparation platform for startup events.

## 1. Product Summary

Startup Matchmaker helps founders find the right people at conferences and turn promising profiles into productive conversations.

The product combines attendee data, professional backgrounds, and a short interview with the user to:

1. understand what the user is building, whom they need, and how their business and personal personality profiles influence the ideal match;
2. rank the most relevant people at the event;
3. explain why each person is a strong match;
4. generate a personalized outreach strategy; and
5. prepare the user through an AI voice conversation or role-play.

The initial focus is the startup ecosystem: co-founders, investors, mentors, experts, and early employees.

## 2. Problem

Startup conferences create many possible connections but little guidance about which conversations are worth pursuing.

Users currently have to:

- search through hundreds of attendee profiles;
- infer which skills and personalities complement their own;
- write generic outreach messages;
- prepare for important meetings without enough context; and
- spend time speaking to many people before finding a useful match.

This is particularly costly for co-founder matching, where a poor fit can create significant personal and business risk.

## 3. Value Proposition

The platform should help users:

- focus on a small, prioritized set of high-potential contacts;
- discover complementary skills and missing capabilities;
- understand what a candidate is likely to care about;
- approach each person with a relevant, personalized message;
- practice the conversation before meeting in person; and
- make better use of limited conference time.

## 4. Target Users

### Primary users

- Founders looking for a co-founder
- Technical founders looking for commercial expertise
- Commercial founders looking for technical expertise
- Startups looking for early employees or specialist talent

### Secondary users

- Founders looking for investors
- Founders looking for mentors or domain experts
- Investors looking for relevant founders
- Conference attendees looking for startup-specific connections

## 5. Core Use Cases

| Use case | Example |
|---|---|
| Co-founder matching | A technical founder needs a commercial co-founder for a B2B SaaS company. |
| Fundraising | A pre-seed founder wants to identify investors with relevant sector experience. |
| Mentorship | A first-time founder wants advice from an experienced operator. |
| Hiring | A startup needs an engineer or another early team member. |
| Expertise | A team needs a person with specific industry, product, or go-to-market knowledge. |
| Meeting preparation | A user wants to understand and rehearse an upcoming conversation. |

## 6. MVP User Flow

1. **Enter the app**
   - The user signs in or starts a temporary event session.

2. **Describe the goal**
   - What are you building?
   - What stage is the startup at?
   - Which industry or vertical matters?
   - Whom are you looking for?
   - Which skills and strengths do you already have?
   - Which capabilities are still missing today?
   - Which additional capabilities will the team need to scale the company in the future?
   - What is your personality and working style from a business perspective?
   - What is your personality and communication style on a personal level?

3. **Complete an AI interview**
   - The assistant asks short follow-up questions.
   - It creates separate business and personal personality profiles based on the user's self-description and answers.
   - The interview can be text-based first and voice-based when Realtime integration is available.
   - The assistant stops when it has enough information to create a useful search profile.

4. **Review recommendations**
   - The dashboard presents a ranked shortlist.
   - Every result includes a match score, evidence, complementary strengths, possible gaps, and potential concerns.
   - The assistant explains why the person is a strong match. For example, a candidate may balance the user's weaknesses, act as a productive counterpart, or contribute a complementary perspective and working style.
   - The explanation must show the conclusions drawn from both profiles instead of presenting an unsupported score.

5. **Open a candidate profile**
   - The user sees the candidate's event profile, professional background, interests, startup context, and the reason for the recommendation.

6. **Prepare the approach**
   - The assistant suggests an opening message, relevant talking points, questions to ask, and topics to avoid.

7. **Practice the conversation**
   - A voice agent simulates the candidate or acts as a coach.
   - The user receives concise feedback and can repeat the exercise.

## 7. MVP Feature Scope

### 7.1 User profile and intent

- Collect the user's startup idea, stage, vertical, goals, strengths, current skill gaps, and capabilities required for future scale.
- Build two distinct, editable profiles: a business personality and working-style profile, and a personal personality and communication-style profile.
- Use the user's event and professional profile as optional context.
- Convert free-form answers into a structured search brief.
- Allow the user to edit the generated brief.

### 7.2 Candidate discovery

- Search and filter conference attendees.
- Support filters such as role, interests, skills, company, industry, and experience.
- Rank candidates against the user's search brief.
- Present a shortlist rather than an unfiltered directory.

### 7.3 Match analysis

Each recommendation should provide:

- overall match score;
- role fit;
- skill complementarity;
- industry and interest overlap;
- relevant experience;
- likely contribution to the startup;
- complementary business and personal traits;
- how the candidate acts as a counterpart or adds a perspective the user currently lacks;
- conversation hooks;
- missing or uncertain information; and
- a plain-language explanation of the ranking.

Scores must be treated as decision support, not as objective personality or business-success predictions.

### 7.4 Team capability map

Show the capabilities already covered by the user or team and highlight gaps.

Suggested dimensions:

| Dimension | What it represents |
|---|---|
| Vision | Strategic direction and ambition |
| Product | User understanding and product judgment |
| Technology | Ability to design and build the product |
| Commercial | Sales, partnerships, and go-to-market |
| Operations | Execution, structure, and delivery |
| Industry | Domain knowledge and relevant network |
| Fundraising | Investor communication and capital access |

The capability map can be displayed as bars or a radar chart, but the underlying evidence should always remain visible.

### 7.5 Personalized outreach

- Generate a short event introduction or connection note.
- Adapt the message to the shared context and intended relationship.
- Explain why the suggested message may resonate.
- Let the user edit and copy the result.

The MVP should not automatically contact people without an explicit user action.

### 7.6 Conversation preparation

- Summarize what the candidate may want to know.
- Suggest an opening, key talking points, and questions.
- Identify likely objections or concerns.
- Provide a short meeting plan.
- Simulate the conversation with an OpenAI Realtime voice agent.
- Give coaching feedback after the simulation.

### 7.7 Dashboard

The web app should contain:

- **Home:** user goal, startup summary, and recommended next action;
- **Matches:** ranked candidate list with filters;
- **Profile detail:** full candidate context and match explanation;
- **Team map:** strengths, gaps, and suggested profile types;
- **Preparation:** outreach draft, meeting plan, and voice simulation; and
- **Guidance:** practical startup tips based on the user's current gaps.

## 8. Matching Approach

### Inputs

- User interview and stated goal
- User profile and professional background
- Candidate event profile
- Candidate professional background
- Interests, roles, experience, startup stage, and availability

### Suggested scoring model

| Factor | Example weight |
|---|---:|
| Required-role fit | 25% |
| Complementary skills | 25% |
| Industry and problem fit | 15% |
| Relevant startup experience | 15% |
| Shared interests and context | 10% |
| Practical compatibility | 10% |

These weights are initial assumptions and should be configurable. The system should return both the score and the evidence used to calculate it.

### AI responsibilities

The AI should:

- structure the user's intent;
- extract comparable facts from profiles;
- explain recommendations;
- generate outreach and preparation material; and
- conduct the coaching conversation.

Deterministic application logic should handle filtering, permissions, data validation, and final score aggregation where possible.

## 9. Available Data and Integrations

### Local data snapshot

The repository contains `exports/all-enriched-profiles.json`, with:

- IdeaLab candidate and profile data;
- roles, interests, bios, companies, universities, and startup information;
- avatar and LinkedIn URLs where available; and
- optional professional-profile enrichment.

This file is sufficient for a local hackathon demo and avoids making live production requests during development.

### IdeaLab API

The documented client API offers relevant endpoints for:

- the current user profile;
- candidate discovery and candidate profiles;
- matching and likes;
- connections;
- meetings; and
- chat.

Live API use must rely on authorized accounts, documented permissions, and the user's own credentials. The MVP should fall back to the local snapshot when live access is unavailable.

### OpenAI

- A text model for interview synthesis, match explanations, outreach, and preparation
- Realtime API for low-latency voice conversations
- A strong system prompt that keeps the agent focused on startup matching and coaching
- Structured outputs for search briefs and match analyses

## 10. Proposed Technical Architecture

```text
Conference/API data ─┐
                     ├─> Normalized profile store ─> Matching service ─> Web dashboard
Enriched profiles ───┘              ▲                       │                 │
                                    │                       ▼                 ▼
User interview ─> Structured search brief          OpenAI analysis     Realtime voice coach
```

### Frontend

- Responsive web dashboard
- Candidate search and result cards
- Candidate detail view
- Capability visualization
- Text assistant and voice controls

### Backend

- Profile ingestion and normalization
- Search and filtering
- Match scoring and ranking
- OpenAI orchestration
- Session and user-state management
- API layer for the frontend

### Core entities

| Entity | Purpose |
|---|---|
| `UserProfile` | Background, strengths, preferences, and startup context |
| `SearchBrief` | Structured representation of whom the user needs |
| `CandidateProfile` | Normalized event and professional data |
| `MatchResult` | Score, evidence, risks, and explanation |
| `OutreachDraft` | Personalized introduction or connection note |
| `PreparationPlan` | Talking points, questions, objections, and goals |
| `PracticeSession` | Voice transcript, feedback, and improvement points |

## 11. Non-Functional Requirements

- **Explainability:** Every recommendation must state why it was made.
- **Privacy:** Use only data the product is authorized to process and display.
- **User control:** Never send messages or connection requests without confirmation.
- **Data minimization:** Avoid storing transcripts or personal data unless required.
- **Resilience:** The demo must work from the local data snapshot without live services other than OpenAI.
- **Performance:** Candidate search and initial ranking should feel immediate.
- **Accessibility:** Core functionality must work with keyboard navigation and without voice input.

## 12. Out of Scope for the First MVP

- Predicting whether a startup will succeed
- Claiming definitive personality classifications
- Fully automated outreach campaigns
- Automatic email harvesting
- Replacing legal, investment, or hiring due diligence
- General-purpose social networking outside the startup context
- A complete CRM or applicant-tracking system

## 13. MVP Acceptance Criteria

The MVP is complete when a user can:

- describe a startup and the person they need;
- receive a structured summary of that need;
- view a ranked list of real or demo event profiles;
- understand the evidence behind each recommendation;
- open a complete candidate detail view;
- generate and edit a personalized outreach draft;
- see team strengths and capability gaps; and
- run at least one AI-guided conversation-preparation flow.

## 14. Success Metrics

### Product metrics

- Time from onboarding to first useful recommendation
- Percentage of users who open a recommended profile
- Percentage of recommendations saved or contacted
- Number of preparation sessions completed
- User-rated relevance of the top three matches

### Hackathon demo metrics

- Complete end-to-end flow in under three minutes
- At least three clearly differentiated recommendations
- Match explanations grounded in visible source data
- Working voice or text-based preparation experience
- No dependency on unauthorized production data access

## 15. Recommended Build Order

1. Load and normalize the existing profile JSON.
2. Build the rough dashboard and candidate detail views.
3. Add the user-intent interview and structured search brief.
4. Implement transparent candidate filtering and ranking.
5. Add AI match explanations and outreach drafts.
6. Add the capability map and gap analysis.
7. Integrate the Realtime voice preparation flow.
8. Refine visual design and demo content.

## 16. Open Product Decisions

- Should the first demo focus exclusively on co-founder matching or show multiple relationship types?
- Which matching dimensions should be user-adjustable?
- Should voice simulation imitate a candidate or remain a neutral coaching assistant?
- Which profile fields are safe and appropriate to expose in the dashboard?
- How should users report inaccurate profile data or recommendations?
- What should happen after a successful preparation session: copy a message, request a connection, or schedule a meeting?
