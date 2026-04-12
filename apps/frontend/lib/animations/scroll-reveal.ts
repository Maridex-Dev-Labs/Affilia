import { useInView } from 'framer-motion';

export function useScrollReveal(ref: any) {
  return useInView(ref, { amount: 0.2, once: true });
}
