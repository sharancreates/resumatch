# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are final-year college students and fresh graduates (0–2 years of experience) in India applying for internships, campus placement drives, and off-campus entry-level technology roles (software engineering, frontend, backend, data analytics, QA). Secondary users are college placement cells and Training & Placement Officers (TPOs) seeking bulk verified licensing for student batches.

## Product Purpose

ResuMatch AI exists to eliminate arbitrary ATS rejections for freshers who lack multi-year corporate track records. By evaluating student resumes against real job requirements with a calibrated dual-engine scorer, detecting campus-specific weaknesses (passive verbs, missing metrics, table traps), and offering grounded bullet rewrites, ResuMatch transforms raw college resumes into placement-ready engineering applications in under two minutes.

## Positioning

The only resume optimization platform calibrated specifically for Indian fresher hiring dynamics:
1. **Dual Hybrid ATS Engine**: Combines 40% exact lexical n-gram matching (`Scikit-Learn` + NLTK stemming) with 60% dense vector semantic similarity (`all-MiniLM-L6-v2` dense embeddings), scoring both exact tech stacks and contextual experience.
2. **4-Pillar Fresher Diagnostics**: Focuses on what students actually have—academic/personal projects, measurable metrics, core CS coursework, and verified links (GitHub/LinkedIn)—instead of demanding corporate work history.
3. **Grounded AI Bullet Rewriter**: Powered by Google Gemini 1.5 Flash with strict anti-hallucination guardrails; rewrites are strictly anchored in candidate-supplied facts and selected keywords without inventing false experience.
4. **Student Micro-Pricing**: Replaces recurring ₹1,500–₹3,000/month US SaaS subscriptions with ₹199 / 14-day Sprint Passes and ₹499 / 90-day Placement Season Passes payable via one-tap Razorpay UPI (GPay, PhonePe, Paytm, QR).

## Operating Context

- **Entry Point**: Instant, friction-free landing page scanner allowing 3 free scans per guest without signup or credit card requirements.
- **Workflow**: Student pastes or drops their resume (PDF/DOCX) alongside target job requirements from campus drive portals, LinkedIn, or Internshala.
- **Diagnostics**: Immediate breakdown of overall match percentage, 4-pillar diagnostics (Project Quality, Action Verbs, Proof Links, 1-Page Layout), and prioritized missing skills.
- **Action**: 1-click bullet point strengthening, 1-click full resume job tailoring, and export into single-page ATS-safe PDF (ReportLab) or editable Word DOCX (`python-docx`).
- **Growth Loop**: Viral peer referral engine ("Invite 3 Friends → Get 7 Days Free") with unique referral links and 1-tap WhatsApp sharing.

## Capabilities and Constraints

- **Supported Upload Formats**: PDF (via PyMuPDF) and Word DOCX (via `python-docx`) with magic byte validation (`%PDF-`, `PK\x03\x04`).
- **Export Capabilities**: 4 single-page ATS templates (Classic Tech, Modern Minimal, Data & Analytics, Campus Placement Standard) in PDF and DOCX.
- **Security & Privacy (DPDP Act 2023)**: Zero training of public AI models on candidate resumes, encrypted storage, and 1-click user data deletion.
- **Rate Limiting & Concurrency**: Distributed `slowapi` rate limiting on guest and authenticated endpoints; asynchronous ML embedding execution offloaded via `run_in_threadpool`.

## Brand Commitments

- **Name**: ResuMatch AI
- **Voice**: A knowledgeable, supportive senior giving honest, practical, and actionable technical feedback. Never speaks in corporate enterprise jargon or vague marketing fluff.
- **Palette**: Obsidian background (`#080B11`), deep slate surfaces (`#0D131F`, `#0E1726`), electric cobalt blue accent (`#2563EB`, `#3B82F6`), tech emerald (`#10B981`), and amber (`#F59E0B`). Zero purple or violet.
- **Typography**: Inter (UI / Display) paired with JetBrains Mono (metrics, code, stack tags).

## Evidence on Hand

- Live, production-grade hybrid matching engine with sub-second vector inference.
- Fully verified 4-pillar fresher diagnostic ruleset tested against real campus resume samples.
- Verified Razorpay UPI integration supporting test and production order validation.
- Automated test coverage across backend (`pytest`) and frontend (`vitest`, `eslint`) integrated with GitHub Actions CI.

## Product Principles

1. **The Hero is the Work**: The product makes its value immediately obvious by offering a live, no-signup scanner on the first screen.
2. **Grounded in Truth**: Never invent metrics, technologies, or achievements the student did not accomplish. Improve phrasing and framing, never fabricate.
3. **Priced for Students**: Respect student financial reality—never trap students in recurring auto-debit subscriptions; provide one-time micro-passes aligned with campus placement cycles.
4. **Placement-Cell Safe**: Always ensure single-page layout compliance and offer editable DOCX files for university portals that reject PDFs.
5. **Zero Data Exploitation**: Treat student resumes as strictly confidential personal data under India's DPDP Act.

## Accessibility & Inclusion

- Responsive layout functional across desktop (1440px), laptop (1024px), tablet (768px), and mobile (390px/320px).
- High-contrast text exceeding WCAG AA standards (4.5:1 ratio for running text, 3:1 for large headers).
- Full keyboard accessibility across modal workflows, drawer states, and tab navigators with visible focus rings.
