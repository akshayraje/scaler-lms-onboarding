import { CertificateValidityNote, EstimatedTime } from "@/components/course/context";
import { InfoTile, PlainList, ScenarioBox, TileGrid } from "@/components/course/kit";
import { PolicyLink, ReportingContacts } from "@/components/course/org-blocks";
import type { CourseDefinition } from "@/lib/course-types";

// Respect at Work — POSH & POCSO awareness.
// Company-specific details (IC members, helpline, policy link) come from content/org.ts.
// The final assessment's answer key is in ./exam.server.ts (server-only); keep the
// two in sync when editing questions, and vary which option position is correct.

export const poshPocso: CourseDefinition = {
  slug: "posh-pocso",
  version: 1,
  title: "Respect at Work",
  certificateTitle: "Respect at Work — POSH Act, 2013 & POCSO Act, 2012 Awareness Training",
  summary: "POSH & POCSO awareness",
  passThreshold: 0.8,
  // Seeded into Admin → Courses on first registration (the values in use before per-course settings).
  defaults: {
    coverage: { enabled: true, rules: [{ id: "new-joiners", type: "joined_within", days: 30 }], dueInDays: 14 },
    certificate: { validityMonths: 12 }, // annual refresher
    nudges: {
      assignment: [
        { day: 0, ccManager: false },
        { day: 4, ccManager: false },
        { day: 9, ccManager: false },
        { day: 14, ccManager: true },
        { day: 21, ccManager: true },
      ],
      renewal: [
        { day: -7, ccManager: false },
        { day: 0, ccManager: false },
        { day: 7, ccManager: false },
        { day: 14, ccManager: true },
        { day: 21, ccManager: true },
      ],
    },
  },
  modules: [
    {
      id: "welcome",
      title: "Welcome",
      est: 2,
      type: "welcome",
      eyebrow: "Orientation",
      heading: "Welcome to Respect at Work",
      nextLabel: "Begin the course",
      body: (
        <>
          <p>
            This course walks through the <strong>POSH Act, 2013</strong> (Sexual Harassment of Women at Workplace)
            and, where relevant to your role, the <strong>POCSO Act, 2012</strong> (Protection of Children from Sexual
            Offences). It&apos;s built around real workplace scenarios, not legal text.
          </p>
          <TileGrid className="mt-6">
            <InfoTile
              title={
                <>
                  ⏱ <EstimatedTime />
                </>
              }
            >
              Self-paced — pause and resume anytime. You can revisit any module before the final assessment.
            </InfoTile>
            <InfoTile title="🔒 Your privacy">
              Your individual answers aren&apos;t shared with your manager. HR sees completion status and scores to keep
              compliance records.
            </InfoTile>
          </TileGrid>
          <p>
            By the end, you&apos;ll be able to recognise unwelcome conduct, know exactly where to turn if it happens,
            and understand your own responsibility as a colleague, bystander, or manager. <CertificateValidityNote />
          </p>
        </>
      ),
    },
    {
      id: "why-posh-matters",
      title: "Why POSH Matters",
      est: 4,
      type: "info-reveal",
      intro: (
        <p>
          The Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013 exists so that
          every workplace is one people can show up to without fear. Tap each card below.
        </p>
      ),
      reveals: [
        {
          q: "Who does the POSH Act protect?",
          a: (
            <>
              Every woman at the workplace — permanent, contract, temporary or intern staff, daily-wage workers, and
              even clients or visitors on the premises, regardless of age or role.
            </>
          ),
        },
        { q: "Where does it apply?", a: "Anywhere work happens: the office, client sites, work travel, offsites and official events, employer-provided transport — and when you work from home, on calls and in work chats. If it's connected to work, it's covered." },
        { q: "What must every employer do?", a: "Set up an Internal Committee (IC) if the organisation has 10 or more employees, display the policy and the IC's details visibly, run regular awareness sessions, and act on every complaint within fixed timelines." },
        { q: "Why should this matter to you personally?", a: "A workplace free of harassment isn't just a legal box to tick — it's what lets every colleague do their best work without fear or discomfort." },
      ],
      checks: [
        { q: "True or false: POSH only applies inside the office building.", options: ["True", "False"], correct: 1, explain: "False. It also covers client sites, work travel, offsites and events, employer-provided transport — and work calls and chats when you work from home." },
        { q: "True or false: only permanent employees are protected under POSH.", options: ["True", "False"], correct: 1, explain: "False. Interns, contract and temporary staff, daily-wage workers — even visitors — are protected. Employment type doesn't matter." },
      ],
    },
    {
      id: "what-counts",
      title: "What Counts as Harassment",
      est: 4,
      type: "content",
      eyebrow: "What Counts as Harassment",
      heading: "What Counts as Harassment",
      body: (
        <>
          <p>
            The POSH Act defines sexual harassment as any <strong>unwelcome</strong> act of a sexual nature — direct
            or implied. That includes:
          </p>
          <PlainList
            className="my-4"
            items={[
              "Physical contact or advances",
              "A demand or request for sexual favours",
              "Sexually coloured remarks",
              "Showing pornography",
              "Any other unwelcome physical, verbal, or non-verbal conduct of a sexual nature",
            ]}
          />
          <p>The Act also calls out two patterns that are especially common at work:</p>
          <TileGrid>
            <InfoTile title="“This for that” (quid pro quo)">
              A benefit or a threat tied to a sexual demand — an implied promise of a promotion or better treatment, or
              a threat to someone&apos;s job, appraisal or working conditions.
            </InfoTile>
            <InfoTile title="Hostile work environment">
              Unwelcome conduct that makes work intimidating, offensive or humiliating — even with no explicit demand.
              Repeated &quot;jokes&quot;, comments or stares can create it.
            </InfoTile>
          </TileGrid>
          <ScenarioBox>
            <strong>The key word is &quot;unwelcome.&quot;</strong> It&apos;s defined by how the recipient experiences
            it — not by whether the other person intended harm. Something that feels harmless to one person can still
            be harassment if it&apos;s unwanted by the other.
          </ScenarioBox>
        </>
      ),
      checks: [
        { q: "Can intent be used as a defence — i.e., \"I didn't mean it that way\"?", options: ["Yes, if the person genuinely didn't mean harm", "No — the impact on the recipient is what matters"], correct: 1, explain: "The law looks at the impact on the recipient, not the intent behind it — \"I didn't mean it like that\" doesn't undo unwelcome conduct." },
        { q: "A senior hints that a good appraisal depends on going out with them. Which pattern is this?", options: ["A hostile work environment", "\"This for that\" (quid pro quo)", "Not harassment, since nothing was demanded outright"], correct: 1, explain: "A benefit (a good appraisal) tied to a sexual demand is quid pro quo — even when it's only hinted at." },
      ],
    },
    {
      id: "types-of-harassment",
      title: "Types of Harassment",
      est: 4,
      type: "info-reveal",
      heading: "Types of Harassment",
      intro: <p>Harassment doesn&apos;t only look like physical contact. Tap each category to see real examples.</p>,
      reveals: [
        { q: "Verbal", a: "Sexually coloured remarks, persistent comments on someone's appearance or body, jokes of a sexual nature, unwelcome romantic pursuit after being declined." },
        { q: "Non-verbal", a: "Staring, sexually suggestive gestures, displaying pornographic or sexual material, following someone or loitering near them without reason." },
        { q: "Physical", a: "Unwelcome touching, brushing against someone, blocking someone's path, any unwanted physical contact or advance." },
        { q: "Digital", a: "Unwanted sexual messages, images or memes; persistent late-night texts; sexual comments in work chats or on video calls; non-consensual sharing of someone's photos." },
      ],
      checks: [
        { q: "Which of these can be a form of sexual harassment?", options: ["A sexually coloured joke in a team chat", "Repeatedly commenting on a colleague's appearance after being asked to stop", "Staring or following someone without reason", "All of the above"], correct: 3, explain: "Verbal, non-verbal and digital conduct can all qualify — not just physical acts." },
        { q: "True or false: POSH only covers physical contact.", options: ["True", "False"], correct: 1, explain: "False. Verbal, non-verbal and digital conduct are all covered." },
      ],
    },
    {
      id: "whos-responsible",
      title: "Who's Responsible",
      est: 3,
      type: "info-reveal",
      heading: "Who's Responsible",
      intro: <p>Preventing and addressing harassment is everyone&apos;s job — but each role carries a distinct duty.</p>,
      reveals: [
        { q: "Every employee", a: "Understand what unwelcome conduct looks like, speak up or report genuinely, never file a knowingly false complaint, support colleagues who come forward — and keep anything you learn about a complaint confidential." },
        { q: "Managers", a: "Model respectful behaviour, take any report seriously and act promptly, never dismiss or minimise a concern, and protect the reporting employee from any retaliation." },
        { q: "The Internal Committee (IC)", a: "Conduct a fair, confidential inquiry within fixed timelines, hear both sides, recommend action, and shield the complainant and witnesses from victimisation." },
      ],
      checks: [
        { q: "Which complaint can lead to action against the person who filed it?", options: ["One that couldn't be proven", "One that was knowingly false and malicious", "Any complaint that is later withdrawn"], correct: 1, explain: "Only malicious, knowingly false complaints are penalised. A genuine complaint that simply couldn't be proven is protected." },
        { q: "A manager hears about a possible harassment issue informally, with no written complaint. What's expected?", options: ["Wait until a formal complaint is filed", "Take it seriously and act promptly, protecting the person from retaliation", "Mention it at the next team meeting"], correct: 1, explain: "Managers must take every report seriously and act promptly — informal reports included — while protecting the person who raised it." },
      ],
    },
    {
      id: "complaint-process",
      title: "Complaint & Inquiry Process",
      est: 5,
      type: "timeline",
      heading: "How a Complaint Moves Through the IC",
      steps: [
        { title: "1. Written complaint", body: "Filed with the Internal Committee within 3 months of the incident (or the last incident in a series), extendable by another 3 months for valid reasons. The IC must help if you need support putting it in writing." },
        { title: "2. Optional conciliation", body: "Only if the complainant requests it, before the inquiry begins — and never involving any monetary settlement." },
        { title: "3. Inquiry", body: "The respondent receives a copy of the complaint and a chance to reply. The IC hears both sides and any witnesses fairly, completing the inquiry within 90 days." },
        { title: "4. Interim relief", body: "During the inquiry, the complainant can request in writing measures such as a transfer (hers or the respondent's), up to 3 months' leave in addition to regular leave, or stopping the respondent from assessing her work." },
        { title: "5. Report & action", body: "The IC sends its findings to the employer within 10 days of completing the inquiry; the employer must act on them within 60 days." },
        { title: "6. Appeal", body: "Either party can appeal the recommendations within 90 days." },
      ],
      callout: (
        <>
          <strong>Quick check:</strong> Who should an incident actually be reported to? The Internal Committee or your
          organisation&apos;s designated POSH contact (details in the next module) — not general workplace gossip or
          social media, which don&apos;t trigger any formal protection.
        </>
      ),
      extra: (
        <TileGrid>
          <InfoTile title="🤐 Confidentiality is the law">
            The Act forbids making the complaint, the identities involved, the inquiry or its outcome public, and
            penalises those handling the case who breach this. Sharing case details with anyone not involved is
            treated as misconduct.
          </InfoTile>
          <InfoTile title="⚖️ You can also go to the police">
            The IC process doesn&apos;t replace criminal law. Sexual harassment, stalking and voyeurism are offences
            under the Bharatiya Nyaya Sanhita, 2023 — and the employer must help if you choose to file a police
            complaint.
          </InfoTile>
        </TileGrid>
      ),
      checks: [
        { q: "How long do you have to file a written complaint with the IC?", options: ["1 month", "3 months from the incident, extendable by another 3 for valid reasons", "1 year", "There's no time limit"], correct: 1, explain: "3 months from the incident (or the last in a series), and the IC can extend it by another 3 months if the delay was justified." },
        { q: "True or false: discussing an ongoing POSH inquiry with teammates is fine, as long as what you say is true.", options: ["True", "False"], correct: 1, explain: "False. Complaint details are confidential. Sharing them with people who aren't involved can lead to disciplinary action, whether or not it's accurate." },
        { q: "Does filing a complaint with the IC stop you from also going to the police?", options: ["Yes — you must choose one", "No — criminal law applies alongside, and the employer must help if you choose to file"], correct: 1, explain: "The IC process doesn't replace criminal law. You can do both, and the employer must assist with a police complaint if you want to file one." },
      ],
    },
    {
      id: "reporting-here",
      title: "Reporting at Our Company",
      est: 3,
      type: "content",
      eyebrow: "Where to turn",
      heading: "Reporting at Our Company",
      body: (
        <>
          <p>
            If you experience or witness sexual harassment, these are the people and channels to use. Reports are
            handled confidentially, and retaliating against anyone who reports — or helps an inquiry — is not
            tolerated.
          </p>
          <ReportingContacts />
          <p className="text-sm text-muted-foreground">
            Not sure whether something &quot;counts&quot;? You can still reach out to an IC member informally for
            guidance before deciding whether to file a complaint.
          </p>
        </>
      ),
      checks: [
        { q: "If a complaint is against the employer itself, where does it go?", options: ["The Internal Committee", "The district Local Committee", "The employee's manager"], correct: 1, explain: "Complaints against the employer go to the Local Committee set up by the District Officer, not the employer's own IC." },
        { q: "True or false: you can talk to an IC member informally before deciding whether to file a complaint.", options: ["True", "False"], correct: 0, explain: "True. You can reach out for guidance first — a conversation doesn't commit you to filing." },
      ],
    },
    {
      id: "case-uninvited-attention",
      title: "The Uninvited Attention",
      est: 4,
      type: "case",
      caseStudy: {
        tag: "Case Study 1",
        title: "The Uninvited Attention",
        scenario: [
          "An employee repeatedly receives personal messages and dinner invitations from a colleague, despite declining several times.",
          "The colleague has started commenting on the employee's appearance during team meetings, and has waited outside the office for them after work hours.",
        ],
        decisions: [
          { q: "Is this an example of sexual harassment under the POSH Act?", options: ["No — nothing physical happened", "Yes — unwelcome, persistent attention and comments after being declined qualify", "Only if it happens again a third time"], correct: 1, explain: "Repeated unwelcome invitations, appearance-based comments, and waiting outside after work form a pattern of unwelcome conduct — that's enough to qualify, with no physical contact required." },
          { q: "What is the most appropriate first step for the employee?", options: ["Post about it on social media", "Confront the colleague alone, in private, after hours", "Document each incident (dates, messages, witnesses) and report it through the IC or designated channel", "Ignore it and hope it stops"], correct: 2, explain: "Documentation protects the employee and gives the IC clear evidence to act on. Reporting — not silence or public confrontation — starts the formal, confidential process." },
          { q: "A colleague overhears about this and isn't directly involved. What should they do?", options: ["Stay out of it entirely — it's not their business", "Encourage the employee to report, and offer to be a witness if asked", "Tell the employee to 'let it go' to keep the peace"], correct: 1, explain: "Bystanders can support without taking over — encouraging reporting and offering to corroborate, if the employee wants that, helps rather than pressures." },
        ],
        wrapup: "Once a complaint like this reaches the Internal Committee, it triggers a confidential inquiry: the colleague receives a copy of the complaint and a chance to respond, interim measures (like a seating or reporting-line change) may be put in place, the inquiry is completed within 90 days with a report to the employer within 10 days after that — and the complainant is protected from retaliation throughout.",
      },
    },
    {
      id: "digital-conduct",
      title: "Digital Workplace Conduct",
      est: 4,
      type: "info-reveal",
      heading: "Digital Workplace Conduct",
      intro: <p>Group chats, emails, and calls are workplaces too. Tap each card to see how the law treats them.</p>,
      reveals: [
        { q: "Does POSH cover WhatsApp and email?", a: "Yes — if the communication has a work connection (a work group, official email, a colleague's number shared for work), it falls within scope even outside office hours." },
        { q: "What if it happens on a personal phone?", a: "The device doesn't decide coverage — the relationship and context do. Harassment by a colleague, even on a personal number, can still be a workplace matter." },
        { q: "What should you never do in a work chat?", a: "Forward sexual jokes or memes, comment on someone's appearance, send repeated personal messages after being declined, or screenshot and circulate someone's private photos." },
        { q: "What should a bystander in the group do?", a: "Not laugh along or stay silent — flag it to the sender directly if comfortable, or report it. Silence can be read as tacit approval." },
      ],
      checks: [
        { q: "True or false: harassment on a work video call from home isn't covered, since it's not at the office.", options: ["True", "False"], correct: 1, explain: "False. Work calls, chats and work-from-home settings are part of the workplace when they're connected to work." },
        { q: "A colleague sends you unwanted sexual messages on your personal phone number. This:", options: ["Isn't a workplace matter, since it's your personal phone", "Can still be a workplace matter — the relationship and context decide, not the device"], correct: 1, explain: "The device doesn't decide coverage. Harassment by a colleague can be a workplace matter even on a personal number." },
      ],
    },
    {
      id: "active-bystander",
      title: "Being an Active Bystander",
      est: 4,
      type: "info-reveal",
      heading: "Being an Active Bystander",
      intro: (
        <p>
          You don&apos;t have to confront anyone to help. Pick whichever of the <strong>5 Ds</strong> feels safe in the
          moment. Tap each card.
        </p>
      ),
      reveals: [
        { q: "Direct", a: "Calmly name it or ask the person to stop — \"That's not okay.\" Only if it's safe, and keep it brief." },
        { q: "Distract", a: "Interrupt without confronting: change the subject, ask the targeted person for help with something, or give them a reason to step away." },
        { q: "Delegate", a: "Bring in someone better placed to act — a manager, HR or an IC member." },
        { q: "Delay", a: "Check in afterwards: \"I saw that — are you okay? Would you like support?\" It's never too late to show you noticed." },
        { q: "Document", a: "Note what happened, when, and who was there, or keep screenshots — and give them to the person affected, so they decide how to use them." },
      ],
      checks: [
        { q: "True or false: only the person targeted can raise a concern about harassment.", options: ["True", "False"], correct: 1, explain: "False. Anyone who witnesses harassment can raise it with the IC or HR. The formal complaint is filed by the person affected — or on their behalf where the Rules allow — and witnesses can support it." },
        { q: "At a team dinner, a senior keeps making a colleague uncomfortable and you don't feel safe confronting them. Which of these is a good option?", options: ["Laugh along so things don't get awkward", "Distract — ask your colleague to help you with something and step away together", "Post about it on social media later"], correct: 1, explain: "Distracting is a safe way to interrupt without confrontation. You can also Delay — check in with them afterwards — or Delegate to HR or the IC." },
      ],
    },
    {
      id: "case-group-chat",
      title: "The Group Chat",
      est: 4,
      type: "case",
      caseStudy: {
        tag: "Case Study 2",
        title: "The Group Chat",
        scenario: [
          "An employee receives inappropriate memes, comments, and repeated late-night messages in a work WhatsApp group from another employee.",
          "Several colleagues see the messages as they come in, but no one says anything.",
        ],
        decisions: [
          { q: "Does this fall under workplace sexual harassment, even though it happened online?", options: ["No — it's a personal chat app, not the office", "Yes — a work group has a clear work-related nexus, so it's covered", "Only if it happens during office hours"], correct: 1, explain: "The group exists for work, so conduct inside it is treated as workplace conduct — regardless of the hour it was sent." },
          { q: "What should the employee receiving these messages do?", options: ["Delete the messages to avoid awkwardness", "Save screenshots as evidence and report to the IC", "Reply with a joke to defuse it"], correct: 1, explain: "Screenshots preserve evidence of timestamps and content, which strengthens a report and helps the IC investigate fairly." },
          { q: "What's the best response for a colleague who silently witnessed the messages?", options: ["Nothing — they weren't the target", "Report what they saw to the IC or HR, support the person targeted, and stop engaging with those messages", "Forward the memes elsewhere since 'everyone already saw them'"], correct: 1, explain: "Witnesses can raise what they saw with the IC or HR and offer to back up the person targeted. Staying silent — or worse, forwarding the content further — allows the harm to continue." },
          { q: "What responsibility does the organisation carry here?", options: ["None, since it happened outside the office network", "Set clear expectations for conduct in official channels, and act on credible concerns — including ones raised by witnesses", "Only act if HR happens to be added to the group"], correct: 1, explain: "Employers are expected to set clear digital-conduct expectations and look into credible concerns whoever raises them. The formal complaint itself is filed by the person affected — or on their behalf where the Rules allow." },
        ],
        wrapup: "An investigation here would likely review the chat history, interview the parties and any named witnesses, and could lead to outcomes ranging from a warning to termination, depending on severity and pattern — decided by the IC, not by the group itself.",
      },
    },
    {
      id: "when-someone-confides",
      title: "When Someone Confides in You",
      est: 4,
      type: "info-reveal",
      heading: "When Someone Confides in You",
      intro: (
        <p>
          Especially important for managers and team leads — but the same steps apply to anyone a colleague turns to.
          Tap each card.
        </p>
      ),
      reveals: [
        { q: "Listen and believe", a: "Give them time and privacy. Thank them for telling you, and don't question whether it 'really' happened or what they did to cause it." },
        { q: "Don't investigate it yourself", a: "Don't confront the other person or gather statements. Fact-finding belongs to the IC, which is set up to do it fairly for both sides." },
        { q: "Point them to the IC — promptly", a: "Explain how to reach the IC (see 'Reporting at Our Company') and offer to help. Managers should also inform HR or the IC as company policy requires — sitting on a report isn't an option." },
        { q: "Keep it confidential", a: "Share it only with the people who need to act on it. Don't discuss it with the team, even to 'clear the air'." },
        { q: "Protect them from retaliation", a: "Watch for changes in how the person is treated — exclusion, worse assignments, unfair reviews — and act on them. Victimising someone for reporting is itself misconduct." },
        { q: "If a child is involved", a: "This is different: anyone who knows of sexual abuse of a child must report it to the police. People in charge of an organisation face stricter penalties if they fail to report an offence by someone under their control." },
      ],
      checks: [
        { q: "A teammate confides that they're being harassed. Which of these should you NOT do?", options: ["Listen without judgement", "Question the colleague involved to find out what happened", "Explain how to reach the IC and offer support"], correct: 1, explain: "Don't investigate yourself — fact-finding belongs to the IC, which is set up to be fair to both sides." },
        { q: "Who should you share what they told you with?", options: ["Only the people who need to act on it, such as HR or the IC", "The rest of the team, to clear the air", "No one at all, even if they want help reporting it"], correct: 0, explain: "Share only with those who need to act on it. Keeping it confidential protects the person — but don't let that stop you from helping them report." },
      ],
    },
    {
      id: "pocso",
      title: "POCSO: What Employees Should Know",
      est: 5,
      type: "info-reveal",
      heading: "POCSO: What Employees Should Know",
      intro: (
        <p>
          If your work brings you near children — including learners or candidates under 18 — this section matters.
          Tap each card.
        </p>
      ),
      reveals: [
        { q: "What is POCSO?", a: "The Protection of Children from Sexual Offences Act, 2012 protects anyone under 18 from sexual abuse and exploitation, and lays out child-friendly reporting and trial procedures." },
        { q: "When does this apply to your work?", a: "If your role brings you near minors — learners, candidates or event participants under 18, client premises with families, CSR or field visits, school-adjacent work, photography involving children — awareness of POCSO is part of your responsibility." },
        { q: "What is 'mandatory reporting'?", a: "Under Section 19, anyone who knows — or apprehends — that a child has been or may be sexually abused must report it to the local police or the Special Juvenile Police Unit. Not reporting is itself an offence, with stricter penalties for people in charge of an organisation. Childline (1098) can also support the child and help you reach the right authority." },
        { q: "Working with learners under 18", a: "Use only official platforms and channels, avoid private one-to-one chats on personal apps, never ask for personal photos or contact details, and follow company guidelines on recorded sessions." },
        { q: "Sexual content involving a minor", a: "If you come across sexual images or videos involving anyone under 18 — in a chat, email or online — don't forward, download or screenshot it, even 'as evidence'. Storing or sharing it is itself an offence. Report it to the police or at cybercrime.gov.in, and inform HR." },
        { q: "What should you avoid doing?", a: "Don't question or interrogate the child yourself, don't take photos 'as evidence', don't discuss the child's identity with others, and don't delay — report promptly to the police and to your HR team." },
      ],
      checks: [
        { q: "A 16-year-old learner messages you on your personal WhatsApp asking for help with an assignment. What's the best response?", options: ["Help them on WhatsApp — it's quicker", "Move the conversation to official channels and keep it professional", "Ignore the message entirely"], correct: 1, explain: "Keep interactions with learners under 18 on official platforms and channels, and avoid private one-to-one chats on personal apps." },
        { q: "You suspect a child is being sexually abused but you aren't certain. What should you do?", options: ["Wait until you're sure", "Question the child to confirm", "Report it to the police — reasonable suspicion is enough"], correct: 2, explain: "POCSO requires reporting when you know or apprehend abuse. You don't need proof, and you shouldn't question the child yourself." },
      ],
    },
    {
      id: "case-late-night-messages",
      title: "The Late-Night Messages",
      est: 4,
      type: "case",
      caseStudy: {
        tag: "Case Study 3",
        title: "The Late-Night Messages",
        scenario: [
          "Meera, a teaching assistant, tells her team lead Arjun that another TA, Rohan, has been messaging a 16-year-old learner on his personal WhatsApp late at night — complimenting their looks and asking them to keep the chats 'between us'.",
          "Meera has screenshots the learner shared with her. Arjun manages both TAs and is unsure whether this is 'serious enough' to escalate.",
        ],
        decisions: [
          { q: "What should Arjun do first?", options: ["Speak to Rohan privately and ask for an explanation", "Report it to the police and inform HR promptly — a child may be at risk", "Wait a few days to gather more evidence"], correct: 1, explain: "Knowing of — or reasonably suspecting — sexual abuse of a child triggers the duty to report to the police under POCSO. Arjun shouldn't investigate or confront Rohan himself, and as someone in charge of the team, failing to report carries stricter penalties." },
          { q: "Meera's screenshots include an explicit image Rohan sent the learner. What should happen to it?", options: ["Forward it to HR so they have the evidence", "Save a copy on the work laptop in case it disappears", "Don't forward or copy it — tell the police it exists so they can collect it properly"], correct: 2, explain: "Storing or sharing sexual material involving a minor is itself an offence, even 'as evidence'. Leave it where it is and let the police collect it." },
          { q: "Should Arjun contact the learner to hear their side?", options: ["Yes — call them to confirm what happened", "No — don't question the child; that's for the police and child-welfare professionals", "Ask Rohan to apologise to the learner directly"], correct: 1, explain: "Questioning the child yourself can cause distress and harm the case. Contact with the learner and their family should go through the authorities and the company's official channels." },
          { q: "How should Arjun treat Meera, who raised the concern?", options: ["Tell the team who reported it, so everyone understands what happened", "Keep her identity confidential and watch for any retaliation against her", "Move her off the batch to avoid tension"], correct: 1, explain: "A manager's duty includes protecting the person who reported. Sharing her identity or moving her off the work — even with good intentions — can look like, and feel like, retaliation." },
        ],
        wrapup: "With a police report made, the police or Special Juvenile Police Unit take over the investigation, and child-welfare professionals support the learner. Meanwhile, HR can move Rohan off learner-facing work pending the outcome, under company policy. Arjun keeps the details confidential, notes down when he learned what and what he did, and checks in on Meera. Reporting promptly — without investigating himself — is exactly what his role requires.",
      },
    },
    {
      id: "dos-and-donts",
      title: "Do's and Don'ts",
      est: 2,
      type: "checklist",
      heading: "Do's and Don'ts",
      dos: [
        "Ask before commenting on someone's appearance, and stop the moment it's unwelcome",
        "Document incidents — dates, messages, witnesses",
        "Report promptly to the IC or your designated contact",
        "Support a colleague who confides in you, and keep it confidential",
        "Report a genuine child-safety concern to the police right away",
      ],
      donts: [
        "Dismiss a complaint because \"it was just a joke\"",
        "Forward sexual jokes, memes, or images in work chats",
        "Confront the other person alone instead of reporting",
        "Discuss a complaint's details with uninvolved colleagues",
        "Interrogate a child yourself or delay reporting a suspected case under POCSO",
      ],
    },
    {
      id: "final-assessment",
      title: "Final Assessment",
      est: 10,
      type: "exam",
      questions: [
        { q: "Under the POSH Act, who can be an 'aggrieved woman'?", options: ["Only full-time permanent staff", "Only senior employees", "Only Indian citizens", "Any woman at the workplace, regardless of employment type or age"] },
        { q: "An Internal Committee (IC) is mandatory for workplaces with:", options: ["10 or more employees", "Any number of employees", "50 or more employees", "Only IT companies"] },
        { q: "What is the key test for whether conduct is harassment?", options: ["Whether the person meant harm", "Whether it happened in front of witnesses", "Whether it was unwelcome to the recipient", "Whether it was repeated at least 3 times"] },
        { q: "A colleague keeps commenting on someone's clothes after being asked to stop. This is:", options: ["Not harassment since it's 'just a comment'", "A form of verbal harassment", "Only harassment if physical contact follows", "A management issue, not a POSH issue"] },
        { q: "Which of these is NOT typically covered by POSH?", options: ["A stranger's remark on the street, unrelated to work", "A client's remark to an employee during a business meeting", "A colleague's comment during work travel", "Comments in an official work WhatsApp group"] },
        { q: "Within how many days must the IC generally complete its inquiry?", options: ["7 days", "30 days", "1 year", "90 days"] },
        { q: "What can the IC NOT do during conciliation?", options: ["Suggest interim relief", "Record statements", "Arrange a monetary settlement between parties", "Recommend action after inquiry"] },
        { q: "If you witness harassment but aren't the person targeted, you can:", options: ["Do nothing — only the target can raise it", "Report what you saw to the IC or HR, and support the person in deciding whether to file a complaint", "File a formal POSH complaint in your own name without involving the person", "Discuss it with other colleagues to decide together"] },
        { q: "Repeated late-night messages of a sexual nature in a work chat group are:", options: ["Not covered since it's outside office hours", "Only an HR issue if a manager is in the group", "Acceptable if the sender apologises later", "Potentially harassment, since the group has a clear work connection"] },
        { q: "What protection does a complainant have during the inquiry?", options: ["Protection from retaliation, and possible interim relief", "None until the case is decided", "They must continue working directly with the accused", "They must resign temporarily"] },
        { q: "Under POCSO, who is a 'child'?", options: ["Anyone under 21", "Anyone under 16", "Anyone under 18", "Only school-going children"] },
        { q: "Under Section 19 of POCSO, an employee who suspects a child is being sexually abused must:", options: ["Investigate it personally first", "Wait for the child to confirm it directly", "Discuss it widely with colleagues to decide together", "Report it to the police or the Special Juvenile Police Unit"] },
        { q: "Failing to report a suspected case of child sexual abuse under POCSO is:", options: ["A minor lapse with no consequence", "Itself an offence under the law", "Only an issue if it's proven in court first", "Acceptable if you're unsure"] },
        { q: "A knowingly false complaint under POSH:", options: ["Can attract action, since malicious intent is penalised", "Is treated exactly the same as a genuine but unproven one", "Is impossible to identify", "Automatically ends the accused employee's job"] },
        { q: "What is the best first step if you're being harassed at work?", options: ["Handle it entirely on your own, quietly", "Post about it publicly to warn others", "Document what happened and report it through the IC or designated channel", "Ignore it, since reporting takes too long"] },
        { q: "A team lead hints that a colleague's promotion depends on agreeing to a date. This is:", options: ["Office politics, not harassment", "Quid pro quo sexual harassment — a benefit tied to a sexual demand", "Only harassment if the promotion is actually denied", "A private matter between two adults"] },
        { q: "Which of these can count as the 'workplace' under POSH?", options: ["Only the office building", "Only places where your manager is present", "An employer-provided cab, a client site, or a work video call from home", "Only official working hours at the office"] },
        { q: "Sharing details of an ongoing POSH inquiry with colleagues who aren't involved:", options: ["Breaches confidentiality and can lead to disciplinary action", "Is fine if the facts are accurate", "Is encouraged so the team stays informed", "Is only a problem if it's posted on social media"] },
        { q: "A team member tells their manager they are being harassed by a colleague. The manager should:", options: ["Investigate it personally before involving anyone", "Tell them to sort it out directly with the colleague", "Wait to see if it happens again", "Listen, keep it confidential, and help them take it to the IC promptly"] },
        { q: "Someone shares sexual content involving a minor in a group chat you're part of. You should:", options: ["Forward it to HR as evidence", "Save a copy in case it's needed later", "Not forward or save it, and report it to the police or cybercrime.gov.in", "Delete it and say nothing"] },
      ],
    },
    {
      id: "acknowledgement",
      title: "Policy Acknowledgement",
      est: 1,
      type: "acknowledgement",
      heading: "Policy Acknowledgement",
      intro: (
        <p>
          Before your certificate is issued, please confirm the following. Your acknowledgement is recorded with the
          date and time. <PolicyLink />
        </p>
      ),
      statements: [
        "I have read and understood the company's Prevention of Sexual Harassment (POSH) policy.",
        "I know how to report sexual harassment, and I understand that retaliation against anyone who reports is not tolerated.",
        "I understand my duty under the POCSO Act to report any knowledge or suspicion of sexual abuse of a child to the police.",
        "I will keep information about any complaint or inquiry confidential.",
      ],
      confirmLabel: "I acknowledge",
    },
    { id: "certificate", title: "Your Certificate", est: 1, type: "certificate" },
  ],
};
