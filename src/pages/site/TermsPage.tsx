import {
  SecondaryPage,
  PAGE_H1,
  PAGE_H2,
  PAGE_DATE,
  PAGE_LEAD,
  PAGE_P,
} from "../../components/site/SecondaryPage";
import { Reveal } from "../../components/site/Reveal";

export default function TermsPage() {
  return (
    <SecondaryPage>
      <Reveal>
        <h1 className={PAGE_H1}>Terms &amp; Conditions</h1>
        <p className={PAGE_DATE}>Last updated: October 2026</p>
        <p className={PAGE_LEAD}>
          These terms control your use of ATLAS. By creating an account or
          using the service you accept them. Questions can be sent to
          hmzain2k5@gmail.com.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Acceptance of Terms</h2>
        <p className={PAGE_P}>
          By accessing or using ATLAS, you agree to these terms and to our
          Privacy Policy. If you do not agree, do not use the service. You
          must be old enough to enter a binding agreement in your country to
          use ATLAS.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Use of Service</h2>
        <p className={PAGE_P}>
          ATLAS is provided for personal learning use. You agree to use it
          lawfully, keep your login credentials secure, and take
          responsibility for the content you store in it.
        </p>
        <p className={PAGE_P}>
          Accounts that abuse the service, such as spam, scraping or
          automated misuse of the AI features, may be suspended.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Intellectual Property</h2>
        <p className={PAGE_P}>
          The ATLAS software, design, name and branding belong to us and are
          licensed to you for personal, non-commercial use. You may not
          resell, redistribute or reverse-engineer the service except where
          the law expressly permits it.
        </p>
        <p className={PAGE_P}>
          Your content stays yours. Your notes and learning data remain yours
          at all times.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Limitation of Liability</h2>
        <p className={PAGE_P}>
          ATLAS is provided "as is" without warranties of any kind. To the
          maximum extent permitted by law, we are not liable for indirect,
          incidental or consequential damages, or for loss arising from your
          use of the service or your inability to use it.
        </p>
        <p className={PAGE_P}>
          ATLAS does not guarantee any learning, exam or career outcome. Your
          sole remedy is to stop using the service.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Changes to Terms</h2>
        <p className={PAGE_P}>
          We may update these terms as the service evolves. The "last
          updated" date at the top reflects the current version, and
          continued use of ATLAS after a change means you accept the updated
          terms. If you do not agree with a change, stop using the service
          and close your account.
        </p>
      </Reveal>

      <Reveal>
        <h2 className={PAGE_H2}>Contact</h2>
        <p className={PAGE_P}>
          Questions about these terms can be sent to hmzain2k5@gmail.com.
        </p>
      </Reveal>
    </SecondaryPage>
  );
}
