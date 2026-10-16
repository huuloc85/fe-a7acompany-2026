import { createContext, useContext } from 'react';
import type { OnboardingTaskKey } from '@/services/OnboardingProgressService';

export const OnboardingContext = createContext<{
  open: () => void;
  recordTask: (task: OnboardingTaskKey) => void;
}>({ open: () => {}, recordTask: () => {} });

export const useOnboarding = () => useContext(OnboardingContext);
