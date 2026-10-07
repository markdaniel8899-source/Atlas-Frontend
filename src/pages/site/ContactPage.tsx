import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import {
  SecondaryPage,
  PAGE_BUTTON,
} from "../../components/site/SecondaryPage";
import { Reveal } from "../../components/site/Reveal";

const EMAIL = "hmzain2k5@gmail.com";
const PHONE_DISPLAY = "+92 300 0000000";
const PHONE_HREF = "tel:+923000000000";
const MAPS_HREF =
  "https://www.google.com/maps/search/?api=1&query=Lahore%2C+Pakistan";

const DETAILS = [
  {
    title: "Email us",
    value: EMAIL,
    Icon: Mail,
    href: `mailto:${EMAIL}`,
  },
  {
    title: "Call us",
    value: PHONE_DISPLAY,
    Icon: Phone,
    href: PHONE_HREF,
  },
  {
    title: "Our location",
    value: "Lahore, Pakistan",
    Icon: MapPin,
    href: MAPS_HREF,
  },
];

const FIELD =
  "w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-base text-white outline-none transition-[border-color,background-color] placeholder:text-white/35 focus:border-[#cf9eff]/60 focus:bg-white/[0.07]";

const CARD_GLOW =
  "shadow-[0_0_50px_-18px_rgba(207,158,255,0.45)] transition-[border-color,box-shadow] duration-500 hover:border-white/20 hover:shadow-[0_0_60px_-14px_rgba(207,158,255,0.65)]";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const subject = `ATLAS: message from ${name.trim()}`;
    const body = `${message.trim()}\n\n${name.trim()} (${email.trim()})`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <SecondaryPage wide glow="contact">
      <div className="relative pt-14">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
          <div className="font-outfit">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/75 backdrop-blur-xl">
                <span className="grid size-5 place-items-center rounded-full border border-white/15 bg-white/[0.06]">
                  <Mail className="size-3 text-[#cf9eff]" />
                </span>
                Contact
              </span>

              <h1 className="mt-6 text-3xl tracking-[-0.02em] text-white sm:text-4xl">
                <span className="font-light text-white/85">Get in </span>
                <span className="font-extrabold">touch</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/60">
                Have a question about ATLAS, found a bug or want to share
                feedback? Send a message and we will reply to your inbox.
              </p>
            </Reveal>

            <ul className="mt-8 space-y-3">
              {DETAILS.map(({ title, value, Icon, href }, index) => (
                <li key={title}>
                  <Reveal delay={index * 0.09}>
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        href.startsWith("http")
                          ? "noreferrer noopener"
                          : undefined
                      }
                      className={`group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl ${CARD_GLOW}`}
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-[#cf9eff]">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold text-white">
                          {title}
                        </h2>
                        <p className="mt-1 truncate text-sm text-white/55">
                          {value}
                        </p>
                      </div>
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-white/50 transition-all group-hover:border-[#cf9eff]/40 group-hover:text-white">
                        <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </a>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>

          <div className="font-outfit">
            <Reveal delay={0.12}>
              <form
                onSubmit={handleSubmit}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_70px_-25px_rgba(207,158,255,0.5)] backdrop-blur-2xl sm:p-6"
              >
                <h2 className="sr-only">Send us a message</h2>
                <div className="space-y-3">
                  <label className="sr-only" htmlFor="contact-name">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className={FIELD}
                  />

                  <label className="sr-only" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    maxLength={120}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={FIELD}
                  />

                  <label className="sr-only" htmlFor="contact-message">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    maxLength={4000}
                    rows={9}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message"
                    className={`${FIELD} min-h-56 resize-y`}
                  />
                </div>

                <button
                  type="submit"
                  className={`${PAGE_BUTTON} mt-5 w-full px-6 py-4 text-sm font-bold tracking-[0.18em]`}
                >
                  Submit
                </button>
                <p className="mt-3 text-center text-sm text-white/45">
                  Opens your email app with the message ready to send.
                </p>
              </form>
            </Reveal>
          </div>
        </div>
      </div>
    </SecondaryPage>
  );
}
