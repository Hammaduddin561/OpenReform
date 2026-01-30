"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/Header";

const steps = [
  {
    title: "Create Petition",
    description: "Publish your petition to IPFS and create an on-chain record.",
    action: "/create",
  },
  {
    title: "Support & Fund",
    description: "Support the petition and deposit ETH into escrow.",
    action: "/",
  },
  {
    title: "Accept as Implementer",
    description: "Set your implementer profile and accept the petition.",
    action: "/implementer",
  },
  {
    title: "Submit Milestone",
    description: "Upload proof to IPFS and submit the milestone.",
    action: "/petitions/1",
  },
  {
    title: "Approve (Vote)",
    description: "Funders vote to approve milestone delivery.",
    action: "/petitions/1",
  },
  {
    title: "View Timeline",
    description: "Timeline updates as events are indexed on-chain.",
    action: "/petitions/1",
  },
];

export default function DemoPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#0b0f1a]">
      <Header />
      <main className="container-page pt-32 pb-16">
        <header>
          <h1 className="section-title">Demo Path</h1>
          <p className="subtle mt-2 max-w-2xl">
            Follow each guided step to show the full petition-to-action flow.
          </p>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {steps.map((step, index) => (
              <button
                key={step.title}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`card w-full p-5 text-left ${
                  index === activeStep ? "border-[#2563EB]" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="badge">Step {index + 1}</span>
                  <span className="text-xs text-[#6B7280]">{step.title}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="subtle mt-2 text-sm">{step.description}</p>
              </button>
            ))}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold">Current step</h3>
            <p className="subtle mt-2 text-sm">{steps[activeStep].description}</p>
            <Link href={steps[activeStep].action} className="btn-primary mt-6 inline-flex">
              Go to step
            </Link>
            <div className="mt-6 text-xs text-[#6B7280]">
              Tip: Update the petition id in the URL after creating your petition.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
