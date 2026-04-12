import StepCard from './StepCard';

const steps = [
  {
    title: 'Create Account',
    desc: 'Sign up as merchant or affiliate in under 2 minutes.',
  },
  {
    title: 'List & Browse',
    desc: 'Merchants list products. Affiliates generate smart links.',
  },
  {
    title: 'Earn & Get Paid',
    desc: 'Track sales in real-time. Receive M-Pesa payouts daily at 6 PM.',
  },
];

export default function StepsGrid() {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-3">
      {steps.map((step, index) => (
        <StepCard key={step.title} index={index + 1} {...step} />
      ))}
    </div>
  );
}
