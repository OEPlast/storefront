import React from 'react';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import ContactChannels from './ContactChannels';
import type { StoreBranding } from '@/libs/storeBranding';

export interface PolicySection {
  /** Anchor id, so other pages and emails can link to one section (e.g. /pages/returns#refunds). */
  id: string;
  title: string;
  body: React.ReactNode;
}

interface PolicyPageProps {
  heading: string;
  intro?: React.ReactNode;
  /** Shown as "Last updated"; bump it whenever the wording changes. */
  lastUpdated: string;
  sections: PolicySection[];
  branding: StoreBranding;
}

/** Shared layout for the info and policy pages: title, contents list, sections, contact box. */
export default function PolicyPage({ heading, intro, lastUpdated, sections, branding }: PolicyPageProps) {
  return (
    <>
      <Breadcrumb heading={heading} subHeading={heading} />
      <div className="policy-page py-10 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <p className="caption1 text-secondary">Last updated: {lastUpdated}</p>
            {intro && <div className="body1 mt-4 text-secondary">{intro}</div>}

            {sections.length > 2 && (
              <nav aria-label="On this page" className="mt-8 rounded-2xl border border-line p-5">
                <div className="text-button-uppercase">On this page</div>
                <ol className="mt-3 list-decimal space-y-1.5 pl-5">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <Link href={`#${section.id}`} className="caption1 hover:underline">
                        {section.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {sections.map((section) => (
              <section key={section.id} id={section.id} className="mt-10 scroll-mt-28">
                <h2 className="heading5">{section.title}</h2>
                <div className="policy-body body1 mt-3 space-y-3 text-secondary [&_a]:text-black [&_a]:underline [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
                  {section.body}
                </div>
              </section>
            ))}

            <div className="mt-14 rounded-2xl bg-surface p-6">
              <h2 className="heading6">Still need help?</h2>
              <ContactChannels branding={branding} className="mt-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
