import Image from "next/image";

const OFFICE_MAPS_URL = "https://maps.app.goo.gl/4KT7zM59mG1nJJYq9";
const OFFICE_EMBED_SRC =
  "https://maps.google.com/maps?q=Block%2018%20Lot%209%20Springwoods%20Tulay%20Minglanilla%20Cebu&z=16&output=embed";

function IconPin({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5 5l1.5-2 4 1.5v3A2 2 0 0 1 18.5 18 14.5 14.5 0 0 1 4 3.5a2 2 0 0 1 3.5 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13v-1.5c0-.3.2-.5.5-.5Z" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconMessenger({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C7 3 3.5 6.7 3.5 11.2c0 2.6 1.3 4.9 3.3 6.4V21l3-1.6c.7.2 1.5.3 2.2.3 5 0 8.5-3.7 8.5-8.5S17 3 12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.5 13.5 2.7-2.9 2.3 1.8 2.5-2.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19.5 12.2A7.5 7.5 0 0 1 7.4 17.9L5 19l1.2-2.3A7.5 7.5 0 1 1 19.5 12.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9.2 9.4c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.1-.1.3 0 .4.5.8 1.3 1.5 2.2 2 .2.1.3.1.5 0l.6-.4c.2-.1.4-.1.5 0l1.6.9c.2.1.3.3.3.5v.5c0 .3 0 .5-.4.7-.3.1-.8.3-1.4.2A6 6 0 0 1 9 10.4c0-.5.1-1 .2-1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const contactLinks = [
  {
    label: "Messenger",
    Icon: IconMessenger,
    links: [
      {
        href: "https://m.me/snizzztravelandtours",
        value: "m.me/snizzztravelandtours",
      },
    ],
  },
  {
    label: "Facebook",
    Icon: IconFacebook,
    links: [
      {
        href: "https://www.facebook.com/snizzztravelandtours/",
        value: "facebook.com/snizzztravelandtours",
      },
      {
        href: "https://www.facebook.com/snizzzzzzz",
        value: "facebook.com/snizzzzzzz",
      },
    ],
  },
  {
    label: "Instagram",
    Icon: IconInstagram,
    links: [
      {
        href: "https://instagram.com/snizzzcebutravelandtours",
        value: "@snizzzcebutravelandtours",
      },
    ],
  },
  {
    label: "Email",
    Icon: IconMail,
    links: [
      {
        href: "mailto:snizzzztravelandtours@gmail.com",
        value: "snizzzztravelandtours@gmail.com",
      },
    ],
  },
];

const phoneLinks = [
  {
    label: "Globe",
    href: "tel:+639568853596",
    value: "0956 885 3596",
    Icon: IconPhone,
  },
  {
    label: "Globe Alt",
    href: "tel:+639173201157",
    value: "0917 320 1157",
    Icon: IconPhone,
  },
  {
    label: "Viber",
    href: "viber://chat?number=%2B639568853596",
    value: "+63 956 885 3596",
    Icon: IconChat,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/639173201157",
    value: "+63 917 320 1157",
    Icon: IconWhatsApp,
  },
];

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="relative z-10 scroll-mt-24 border-t border-white/10 bg-[#081416] text-foam"
    >
      <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.35fr)] xl:gap-10">
          <div>
            <Image
              src="/brand/snizzz-logo-clear.png"
              alt="Snizzz Cebu Travel & Tours"
              width={220}
              height={146}
              unoptimized
              className="h-auto w-[min(100%,10rem)]"
            />
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">
              Travel in style across Cebu and Bohol — with convenience at its
              finest. Absolutely no hidden charges.
            </p>
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-[0.16em] text-sun uppercase">
              Contact
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {contactLinks.map(({ label, links, Icon }) => (
                <li key={label} className="flex items-start gap-3 px-1 py-1.5">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sun/15 text-sun">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.62rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
                      {label}
                    </span>
                    <span className="mt-0.5 flex flex-col gap-0.5">
                      {links.map(({ href, value }) => (
                        <a
                          key={href}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm text-white/85 transition hover:text-sun"
                        >
                          {value}
                        </a>
                      ))}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <h3 className="mt-5 font-[family-name:var(--font-syne)] text-sm font-bold tracking-[0.16em] text-sun uppercase">
              Call / chat
            </h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {phoneLinks.map(({ label, href, value, Icon }) => (
                <li key={`${label}-${value}`}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg px-1 py-1.5 transition hover:text-sun"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sun/15 text-sun">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[0.62rem] font-semibold tracking-[0.12em] text-white/40 uppercase">
                        {label}
                      </span>
                      <span className="block text-sm text-white/85 group-hover:text-sun">
                        {value}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-[family-name:var(--font-syne)] text-sm font-bold tracking-[0.16em] text-sun uppercase">
                Office location
              </h2>
              <a
                href={OFFICE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 transition hover:text-sun"
              >
                <IconPin className="h-3.5 w-3.5 text-sun" />
                Open in Maps
              </a>
            </div>
            <p className="mb-3 text-sm text-white/55">
              Block 18 Lot 9, Springwoods, Tulay, Minglanilla, Cebu
            </p>
            <div className="overflow-hidden rounded-xl border border-white/12 bg-white/5">
              <iframe
                title="Snizzz Cebu office location map"
                src={OFFICE_EMBED_SRC}
                className="h-56 w-full border-0 sm:h-64 xl:h-[17.5rem]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-3.5 text-xs text-white/40 sm:px-8 lg:px-10 lg:text-left">
        © {new Date().getFullYear()} Snizzz Cebu Travel & Tours. All rights
        reserved.
      </div>
    </footer>
  );
}
