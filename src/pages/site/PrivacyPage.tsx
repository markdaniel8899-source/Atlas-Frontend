import {
  SecondaryPage,
  PAGE_H1,
  PAGE_H2,
  PAGE_H3,
  PAGE_DATE,
  PAGE_LEAD,
  PAGE_LIST,
  PAGE_P,
} from "../../components/site/SecondaryPage";
import { Reveal } from "../../components/site/Reveal";

export default function PrivacyPage() {
  return (
    <SecondaryPage>
      <Reveal>
        <h1 className={PAGE_H1}>Privacy Policy</h1>
        <p className={PAGE_DATE}>Last updated: October 2026</p>
        <p className={PAGE_LEAD}>
          This policy explains what ATLAS collects, how it is used and the
          choices you have. ATLAS is operated by HM. Zain ("we"). Questions
          about your data can be sent to hafizmzain786@gmail.com.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Information we collect</h2>
        <h3 className={PAGE_H3}>Account details</h3>
        <p className={PAGE_P}>
          Your email address, display name, username and an optional profile
          photo.
        </p>
        <h3 className={PAGE_H3}>Learning content</h3>
        <p className={PAGE_P}>
          The courses, roadmaps, notes, quiz results, timer sessions and XP you
          create while using ATLAS.
        </p>
        <h3 className={PAGE_H3}>Uploaded files</h3>
        <p className={PAGE_P}>
          PDFs you upload to generate a quiz are read only for that request.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>How we use your information</h2>
        <ul className={PAGE_LIST}>
          <li>
            To run the service: show your roadmap, store your notes, score
            your quizzes and measure your progress.
          </li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To respond to messages you send us.</li>
          <li>
            We do not sell your data, and we do not use your learning content
            for advertising.
          </li>
        </ul>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Data deletion</h2>
        <ul className={PAGE_LIST}>
          <li>
            PDFs you upload are deleted immediately after the quiz is
            generated. They are never stored.
          </li>
          <li>Deleting a course also removes its roadmap, topics and notes.</li>
          <li>
            You can request full deletion of your account and everything tied
            to it by emailing hafizmzain786@gmail.com. We remove your data after
            we confirm the request comes from the account owner.
          </li>
        </ul>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Cookies</h2>
        <p className={PAGE_P}>
          ATLAS uses only essential storage: cookies and local storage to keep
          you signed in and remember your session. There are no advertising
          cookies and no third-party tracking on the site.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Your rights</h2>
        <ul className={PAGE_LIST}>
          <li>Request a copy of the data we hold about you.</li>
          <li>Correct data that is inaccurate or out of date.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>
            Where applicable data-protection law grants you further rights, you
            can exercise them through the same address:
            hafizmzain786@gmail.com.
          </li>
        </ul>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Questions</h2>
        <p className={PAGE_P}>
          For anything about this policy or your data, email
          hafizmzain786@gmail.com and we will reply.
        </p>
      </Reveal>
    </SecondaryPage>
  );
}
