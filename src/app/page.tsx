import Navbar from "@/components/Navbar";
import Link from "next/link";

const features = [
  {
    title: "Track Everything",
    description:
      "Combine income and expenses in one unified transaction system with custom categories and payment modes.",
  },
  {
    title: "Budget Smarter",
    description:
      "Set spending limits, monitor your budget and know when you're getting close to your expense caps.",
  },
  {
    title: "Save With Goals",
    description:
      "Create savings goals and track your progress toward the things that matter to you.",
  },
  {
    title: "Bills & Subscriptions",
    description:
      "Keep track of recurring payments, subscriptions, EMIs and upcoming dues with reminders.",
  },
  {
    title: "Split Expenses",
    description:
      "Share expenses with specific members of your friend groups and keep track of who owes what.",
  },
  {
    title: "Financial Insights",
    description:
      "Understand your spending patterns with daily, weekly, monthly and yearly financial analysis.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center px-6 py-20 lg:px-8">
        <div className="grid w-full items-center gap-16 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              Your money. One place.
            </div>

            <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Take control of your money.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Track income, expenses, budgets, savings, bills and investments
              from one simple financial workspace.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/register"
                className="rounded-lg bg-slate-900 px-6 py-3 text-center font-semibold text-white transition hover:bg-slate-800"
              >
                Get Started
              </Link>

              <a
                href="#features"
                className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Explore Features
              </a>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Built for students, employees and everyday money management.
            </p>
          </div>

          {/* Financial Preview */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Balance</p>
                  <p className="mt-1 text-3xl font-bold text-slate-950">
                    ₹52,480
                  </p>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
                  +12.5%
                </span>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Income</p>
                  <p className="mt-2 text-xl font-semibold text-emerald-600">
                    ₹80,000
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Expenses</p>
                  <p className="mt-2 text-xl font-semibold text-red-500">
                    ₹27,520
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Monthly budget</span>
                  <span className="font-medium text-slate-700">68%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[68%] rounded-full bg-slate-900" />
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-sm font-medium text-slate-700">
                  Recent activity
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Salary</span>
                    <span className="text-sm font-medium text-emerald-600">
                      +₹50,000
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">Food</span>
                    <span className="text-sm font-medium text-red-500">
                      -₹2,450
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-600">
                      SIP Investment
                    </span>
                    <span className="text-sm font-medium text-red-500">
                      -₹5,000
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-slate-200 bg-white py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Everything in one place
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              More than an expense tracker.
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Finora brings your everyday financial management into one
              organized workspace.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                  $
                </div>

                <h3 className="text-lg font-semibold text-slate-950">
                  {feature.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-slate-200 bg-slate-50 py-24"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              How it works
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
              Your finances, simplified.
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              Finora helps you understand where your money goes and make
              better financial decisions.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="relative rounded-2xl border border-slate-200 bg-white p-8">
              <span className="text-sm font-bold text-slate-400">01</span>

              <h3 className="mt-6 text-xl font-semibold text-slate-950">
                Track
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Add your income and expenses, organize them into categories,
                and record how you paid.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-8">
              <span className="text-sm font-bold text-slate-400">02</span>

              <h3 className="mt-6 text-xl font-semibold text-slate-950">
                Understand
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                See your spending patterns, budgets, savings and financial
                trends through simple analytics.
              </p>
            </div>

            <div className="relative rounded-2xl border border-slate-200 bg-white p-8">
              <span className="text-sm font-bold text-slate-400">03</span>

              <h3 className="mt-6 text-xl font-semibold text-slate-950">
                Improve
              </h3>

              <p className="mt-3 leading-7 text-slate-600">
                Set goals, control spending, stay on top of bills and use
                insights to make smarter financial decisions.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* About */}
      <section
        id="about"
        className="border-t border-slate-200 bg-white py-24"
      >
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            About Finora
          </p>

          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
            More than tracking money.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Finora is designed to bring everyday financial management into one
            place — from tracking income and expenses to managing budgets,
            savings, bills, loans and investments.
          </p>
        </div>
      </section>
      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-slate-900 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Start taking control of your finances.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Track your money, understand your spending and build better financial
            habits with Finora.
          </p>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <p className="text-lg font-bold text-white">Finora</p>
            <p className="mt-1 text-sm text-slate-400">
              Your money. One place.
            </p>
          </div>

          <p className="text-sm text-slate-400">
            © 2026 Finora. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}