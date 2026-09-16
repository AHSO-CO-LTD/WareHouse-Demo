export type OnboardingState = {
  message: string | null;
  fieldErrors: {
    displayName?: string[];
  };
};

export const initialOnboardingState: OnboardingState = {
  message: null,
  fieldErrors: {},
};
